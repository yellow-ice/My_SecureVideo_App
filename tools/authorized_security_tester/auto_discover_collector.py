#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse

import requests


SEED_PATHS = [
    "/",
    "/robots.txt",
    "/sitemap.xml",
    "/openapi.json",
    "/swagger.json",
    "/api",
    "/api/",
    "/api/docs",
    "/swagger",
]

COMMON_API_WORDS = [
    "users",
    "user",
    "crawler-info",
    "crawler",
    "chat-plaintext",
    "chat",
    "messages",
    "leak",
    "content",
    "articles",
    "images",
    "videos",
    "security",
    "settings",
    "switches",
    "crack",
    "auth",
    "login",
]


@dataclass
class Config:
    base_origin: str
    asset_origin: str
    output_dir: Path
    timeout: int
    delay_ms: int
    download_policy: str


class AutoDiscoverCollector:
    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "authorized-auto-discover/1.0",
                "Accept": "*/*",
            }
        )
        self.logs: List[Dict[str, Any]] = []
        self.step = 0
        self.discovered: Dict[str, str] = {}
        self.assets: Dict[str, List[Dict[str, Any]]] = {"video": [], "image": [], "article": []}

    def run(self) -> Dict[str, Any]:
        self._prepare_dirs()
        self._log(
            "info",
            "开始自动接口发现（无预置接口）",
            {
                "base_origin": self.cfg.base_origin,
                "asset_origin_effective": self._asset_origin(),
                "note": "5173通常是前端端口，3000通常是后端API端口；可用 --asset-origin 覆盖资源下载出口",
            },
        )

        endpoint_scan = self.discover_endpoints()
        capability = self.resolve_capabilities(endpoint_scan["alive_candidates"])
        self.discovered = capability
        self._write_json(self.cfg.output_dir / "reports" / "auto_discovered_capabilities.json", capability)

        collected = self.collect_data()
        download = self.download_assets_and_chat()

        summary = {
            "endpoint_scan": endpoint_scan,
            "capability": capability,
            "collected": collected,
            "download": download,
        }
        self._write_json(self.cfg.output_dir / "reports" / "auto_discover_summary.json", summary)
        self._write_jsonl(self.cfg.output_dir / "reports" / "logs" / "auto_steps.jsonl", self.logs)
        return summary

    def _prepare_dirs(self) -> None:
        for p in [
            self.cfg.output_dir / "reports" / "logs",
            self.cfg.output_dir / "reports",
            self.cfg.output_dir / "collected" / "chat",
            self.cfg.output_dir / "downloads" / "video",
            self.cfg.output_dir / "downloads" / "image",
            self.cfg.output_dir / "downloads" / "article",
            self.cfg.output_dir / "downloads" / "chat",
        ]:
            p.mkdir(parents=True, exist_ok=True)

    def _log(self, level: str, message: str, detail: Optional[Dict[str, Any]] = None) -> None:
        self.step += 1
        row = {"step": self.step, "ts": int(time.time()), "level": level, "message": message, "detail": detail or {}}
        self.logs.append(row)
        detail_txt = ""
        if row["detail"]:
            try:
                detail_txt = " | " + json.dumps(row["detail"], ensure_ascii=False)
            except Exception:
                detail_txt = f" | {row['detail']}"
        print(f"[{level.upper()}] {message}{detail_txt}")

    @staticmethod
    def _write_json(path: Path, data: Any) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    @staticmethod
    def _write_jsonl(path: Path, rows: List[Dict[str, Any]]) -> None:
        with path.open("w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

    def _req(self, method: str, path_or_url: str, json_body: Optional[Dict[str, Any]] = None) -> Tuple[int, str, Dict[str, str]]:
        url = path_or_url if path_or_url.startswith("http") else urljoin(self.cfg.base_origin.rstrip("/") + "/", path_or_url.lstrip("/"))
        resp = self.session.request(method, url, timeout=self.cfg.timeout, json=json_body)
        return resp.status_code, resp.text, dict(resp.headers)

    @staticmethod
    def _short_text(text: str) -> str:
        return (text or "")[:180]

    def discover_endpoints(self) -> Dict[str, Any]:
        raw_texts: List[str] = []
        candidates: Set[str] = set()
        checked: List[Dict[str, Any]] = []

        for p in SEED_PATHS:
            try:
                status, text, headers = self._req("GET", p)
                checked.append({"method": "GET", "path": p, "status": status})
                if status < 500:
                    raw_texts.append(text[:300000])
                ctype = headers.get("Content-Type", "")
                if "javascript" in ctype or p.endswith(".js"):
                    raw_texts.append(text[:300000])
                self._log(
                    "info",
                    f"探测种子 {p} -> HTTP {status}",
                    {
                        "method": "GET",
                        "path": p,
                        "request_url": urljoin(self.cfg.base_origin.rstrip("/") + "/", p.lstrip("/")),
                        "request_body": "(none)",
                        "status": status,
                        "response_excerpt": self._short_text(text),
                    },
                )
            except Exception as exc:
                checked.append({"method": "GET", "path": p, "status": 0, "error": str(exc)})
                self._log("warn", f"探测失败 {p}", {"error": str(exc)})

        # 从文本中提取 URL/路径
        path_pattern = re.compile(r"(?:(?:https?:)?//[^\s\"'<>]+|/[a-zA-Z0-9_\-./]+)")
        for blob in raw_texts:
            for m in path_pattern.findall(blob):
                if "/api/" in m or m.startswith("/api"):
                    if m.startswith("http"):
                        parsed = urlparse(m)
                        if parsed.netloc == urlparse(self.cfg.base_origin).netloc:
                            candidates.add(parsed.path)
                    else:
                        candidates.add(m)

        # 字典组合（自动发现，不依赖提前给接口）
        for w in COMMON_API_WORDS:
            candidates.add(f"/api/{w}")
            candidates.add(f"/api/leak/{w}")
            candidates.add(f"/api/admin/{w}")
            candidates.add(f"/api/admin/security/{w}")

        # 清洗
        cleaned = sorted({self._clean_path(x) for x in candidates if self._clean_path(x).startswith("/api")})
        alive: List[Dict[str, Any]] = []
        for p in cleaned:
            for m in ("GET", "POST"):
                try:
                    status, text, _ = self._req(m, p, {} if m == "POST" else None)
                    if status != 404:
                        alive.append({"method": m, "path": p, "status": status, "sample": text[:120]})
                        self._log(
                            "info" if status < 400 else "warn",
                            f"候选探测 {m} {p} -> HTTP {status}",
                            {
                                "method": m,
                                "path": p,
                                "request_url": urljoin(self.cfg.base_origin.rstrip("/") + "/", p.lstrip("/")),
                                "request_body": {} if m == "POST" else "(none)",
                                "status": status,
                                "response_excerpt": self._short_text(text),
                            },
                        )
                except Exception:
                    pass
            if self.cfg.delay_ms:
                time.sleep(self.cfg.delay_ms / 1000.0)

        self._write_json(self.cfg.output_dir / "reports" / "endpoint_candidates_alive.json", alive)
        self._log("info", f"自动发现候选接口 {len(cleaned)} 个，可达候选 {len(alive)} 条")
        return {"checked_seeds": checked, "candidates": cleaned, "alive_candidates": alive}

    @staticmethod
    def _clean_path(x: str) -> str:
        s = x.strip()
        if not s:
            return ""
        s = s.split("?")[0].split("#")[0]
        if not s.startswith("/"):
            s = "/" + s
        return re.sub(r"/{2,}", "/", s)

    def resolve_capabilities(self, alive: List[Dict[str, Any]]) -> Dict[str, str]:
        by_path = {(x["method"], x["path"]): x for x in alive}
        paths = {x["path"] for x in alive}

        def pick(keyword: str, method: str = "GET") -> str:
            for p in sorted(paths):
                if keyword in p and (method, p) in by_path:
                    return p
            return ""

        caps = {
            "users_get": pick("users", "GET"),
            "crawler_get": pick("crawler", "GET"),
            "chat_get": pick("chat", "GET"),
            "crack_post": pick("crack", "POST"),
            "security_settings_get": pick("settings", "GET"),
            "security_switches_post": pick("switches", "POST"),
        }
        self._log("info", "能力接口识别完成", caps)
        return caps

    def collect_data(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {}

        users_api = self.discovered.get("users_get")
        if users_api:
            st, text, _ = self._req("GET", users_api)
            out["users"] = {"status": st, "api": users_api}
            self._log(
                "info" if st < 400 else "warn",
                "请求结果 users_get",
                {
                    "method": "GET",
                    "path": users_api,
                    "request_url": urljoin(self.cfg.base_origin.rstrip("/") + "/", users_api.lstrip("/")),
                    "request_body": "(none)",
                    "status": st,
                    "response_excerpt": self._short_text(text),
                },
            )
            if st < 400:
                data = self._to_json(text)
                self._write_json(self.cfg.output_dir / "collected" / "users.json", data)
                self._log("info", f"用户接口成功 {users_api} HTTP {st}")
            else:
                self._log("warn", f"用户接口被拒绝 {users_api} HTTP {st}", {"reason": text[:120]})

        crawler_api = self.discovered.get("crawler_get")
        if crawler_api:
            st, text, _ = self._req("GET", crawler_api)
            out["crawler"] = {"status": st, "api": crawler_api}
            self._log(
                "info" if st < 400 else "warn",
                "请求结果 crawler_get",
                {
                    "method": "GET",
                    "path": crawler_api,
                    "request_url": urljoin(self.cfg.base_origin.rstrip("/") + "/", crawler_api.lstrip("/")),
                    "request_body": "(none)",
                    "status": st,
                    "response_excerpt": self._short_text(text),
                },
            )
            if st < 400:
                data = self._to_json(text)
                groups = data.get("groups", {}) if isinstance(data, dict) else {}
                self.assets["video"] = self._norm_video(groups.get("video", []))
                self.assets["image"] = self._norm_image(groups.get("image", []))
                self.assets["article"] = self._norm_article(groups.get("article", []))
                self._write_json(self.cfg.output_dir / "reports" / "asset_inventory_auto.json", self.assets)
                self._print_assets()
                self._log("info", f"资源接口成功 {crawler_api} HTTP {st}")
            else:
                self._log("warn", f"资源接口被拒绝 {crawler_api} HTTP {st}", {"reason": text[:120]})

        chat_api = self.discovered.get("chat_get")
        if chat_api:
            st, text, _ = self._req("GET", chat_api)
            out["chat"] = {"status": st, "api": chat_api}
            self._log(
                "info" if st < 400 else "warn",
                "请求结果 chat_get",
                {
                    "method": "GET",
                    "path": chat_api,
                    "request_url": urljoin(self.cfg.base_origin.rstrip("/") + "/", chat_api.lstrip("/")),
                    "request_body": "(none)",
                    "status": st,
                    "response_excerpt": self._short_text(text),
                },
            )
            if st < 400:
                data = self._to_json(text)
                self._write_json(self.cfg.output_dir / "collected" / "chat" / "chat_items.json", data)
                self._log("info", f"对话接口成功 {chat_api} HTTP {st}")
            else:
                self._log("warn", f"对话接口被拒绝 {chat_api} HTTP {st}", {"reason": text[:120]})
                (self.cfg.output_dir / "downloads" / "chat" / "chat_blocked.txt").write_text(
                    f"chat api blocked: {chat_api}, status={st}, response={text[:300]}\n", encoding="utf-8"
                )

        return out

    def _to_json(self, text: str) -> Any:
        try:
            return json.loads(text)
        except Exception:
            return {"raw": text[:10000]}

    def _origin(self) -> str:
        parsed = urlparse(self.cfg.base_origin)
        return f"{parsed.scheme}://{parsed.netloc}"

    def _asset_origin(self) -> str:
        raw = str(self.cfg.asset_origin or "").strip()
        if raw:
            p = urlparse(raw)
            if p.scheme and p.netloc:
                return f"{p.scheme}://{p.netloc}"
        return self._origin()

    def _abs(self, url_or_path: str) -> str:
        s = str(url_or_path or "").strip()
        if not s:
            return ""
        if s.startswith("http://") or s.startswith("https://"):
            p = urlparse(s)
            target_origin = self._asset_origin()
            if target_origin and f"{p.scheme}://{p.netloc}" != target_origin:
                return urljoin(target_origin.rstrip("/") + "/", p.path.lstrip("/"))
            return s
        return urljoin(self._asset_origin().rstrip("/") + "/", s.lstrip("/"))

    def _norm_video(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        out = []
        for x in rows:
            out.append(
                {
                    "id": x.get("id"),
                    "title": x.get("title", ""),
                    "url": self._abs(str(x.get("downloadUrl") or x.get("media_url") or x.get("cover_url") or "")),
                }
            )
        return out

    def _norm_image(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        out = []
        for x in rows:
            urls = x.get("imageUrls") if isinstance(x.get("imageUrls"), list) else []
            if not urls:
                one = str(x.get("downloadUrl") or x.get("media_url") or x.get("cover_url") or "")
                urls = [one] if one else []
            out.append({"id": x.get("id"), "title": x.get("title", ""), "urls": [self._abs(str(u)) for u in urls if str(u).strip()]})
        return out

    def _norm_article(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [{"id": x.get("id"), "title": x.get("title", ""), "summary": x.get("summary", ""), "body": x.get("body", "")} for x in rows]

    def _print_assets(self) -> None:
        for kind in ("video", "image", "article"):
            rows = self.assets[kind]
            print(f"\n[{kind}] {len(rows)} 条")
            for i, x in enumerate(rows, start=1):
                if kind == "video":
                    print(f"  {i}. {x.get('title')} ({x.get('url')})")
                elif kind == "image":
                    print(f"  {i}. {x.get('title')} (images={len(x.get('urls', []))})")
                else:
                    print(f"  {i}. {x.get('title')} (chars={len(str(x.get('body') or ''))})")

    def _ext(self, ctype: str, url: str, kind: str) -> str:
        t = ctype.split(";")[0].strip().lower()
        if t in {"video/mp4", "application/mp4"}:
            return ".mp4"
        if t in {"video/webm"}:
            return ".webm"
        if t in {"image/jpeg", "image/jpg"}:
            return ".jpg"
        if t in {"image/png"}:
            return ".png"
        p = urlparse(url).path.lower()
        for e in [".mp4", ".webm", ".mov", ".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            if p.endswith(e):
                return ".jpg" if e == ".jpeg" else e
        return ".mp4" if kind == "video" else ".jpg"

    def _download(self, url: str, target_base: Path, kind: str) -> Tuple[bool, str]:
        if not url:
            return False, "empty_url"
        try:
            r = self.session.get(url, timeout=self.cfg.timeout, stream=True)
            if r.status_code >= 400:
                return False, f"http_{r.status_code}"
            ext = self._ext(r.headers.get("Content-Type", ""), url, kind)
            target = target_base.with_suffix(ext)
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("wb") as f:
                for c in r.iter_content(8192):
                    if c:
                        f.write(c)
            return True, str(target)
        except Exception as exc:
            return False, str(exc)

    def _pick_policy(self) -> str:
        if self.cfg.download_policy != "prompt":
            return self.cfg.download_policy
        v = input("下载策略 [all/type/item/none]> ").strip().lower()
        return v if v in {"all", "type", "item", "none"} else "none"

    def download_assets_and_chat(self) -> Dict[str, Any]:
        policy = self._pick_policy()
        ret = {"policy": policy, "ok": 0, "rejected": 0, "details": []}
        if policy == "none":
            self._log("info", "下载策略=none，跳过")
            return ret

        selections: Dict[str, List[int]] = {}
        if policy == "item":
            for k in ("video", "image", "article"):
                raw = input(f"{k} 序号(如1,3；空跳过)> ").strip()
                selections[k] = [int(x) for x in raw.split(",") if x.strip().isdigit()]
        elif policy == "type":
            raw = input("类型(逗号分隔：video,image,article)> ").strip()
            types = {x.strip() for x in raw.split(",") if x.strip() in {"video", "image", "article"}}
            for k in ("video", "image", "article"):
                selections[k] = list(range(1, len(self.assets[k]) + 1)) if k in types else []
        else:
            for k in ("video", "image", "article"):
                selections[k] = list(range(1, len(self.assets[k]) + 1))

        for i, row in enumerate(self.assets["video"], start=1):
            if i not in selections["video"]:
                continue
            ok, msg = self._download(str(row.get("url") or ""), self.cfg.output_dir / "downloads" / "video" / f"video_{i:03d}", "video")
            d = {"kind": "video", "index": i, "title": row.get("title"), "url": row.get("url"), "result": msg}
            ret["details"].append(d)
            if ok:
                ret["ok"] += 1
                self._log("info", f"[成功] 视频 {i} 下载完成", d)
            else:
                ret["rejected"] += 1
                self._log("warn", f"[拒绝] 视频 {i} 下载失败", d)

        for i, row in enumerate(self.assets["image"], start=1):
            if i not in selections["image"]:
                continue
            urls = row.get("urls", [])
            if not urls:
                ret["rejected"] += 1
                self._log("warn", f"[拒绝] 插画 {i} 无可下载URL", {"title": row.get("title")})
                continue
            one_fail = False
            for j, u in enumerate(urls, start=1):
                ok, msg = self._download(str(u), self.cfg.output_dir / "downloads" / "image" / f"image_{i:03d}" / f"{j:03d}", "image")
                d = {"kind": "image", "index": i, "image_no": j, "title": row.get("title"), "url": u, "result": msg}
                ret["details"].append(d)
                if ok:
                    self._log("info", f"[成功] 插画 {i} 第{j}张下载完成", d)
                else:
                    one_fail = True
                    self._log("warn", f"[拒绝] 插画 {i} 第{j}张下载失败", d)
            if one_fail:
                ret["rejected"] += 1
            else:
                ret["ok"] += 1

        for i, row in enumerate(self.assets["article"], start=1):
            if i not in selections["article"]:
                continue
            try:
                p = self.cfg.output_dir / "downloads" / "article" / f"article_{i:03d}.doc"
                content = f"{row.get('title', '')}\n\n{row.get('summary', '')}\n\n{row.get('body', '')}\n"
                p.write_text(content, encoding="utf-8")
                ret["ok"] += 1
                d = {"kind": "article", "index": i, "title": row.get("title"), "result": str(p)}
                ret["details"].append(d)
                self._log("info", f"[成功] 文章 {i} 导出Word完成", d)
            except Exception as exc:
                ret["rejected"] += 1
                d = {"kind": "article", "index": i, "title": row.get("title"), "result": str(exc)}
                ret["details"].append(d)
                self._log("warn", f"[拒绝] 文章 {i} 导出Word失败", d)

        chat_file = self.cfg.output_dir / "collected" / "chat" / "chat_items.json"
        chat_result: Dict[str, Any] = {"status": "skipped"}
        if chat_file.exists():
            data = json.loads(chat_file.read_text(encoding="utf-8"))
            items = data.get("items", []) if isinstance(data, dict) else []
            plain, cipher, mixed = [], [], []
            for x in items:
                who = (x.get("sender") or {}).get("username", "unknown")
                ts = x.get("created_at", "")
                ptxt = str(x.get("plaintext") or "")
                ctxt = str(x.get("storedContent") or "")
                if ptxt:
                    plain.append(f"[{ts}] {who}: {ptxt}")
                if ctxt:
                    cipher.append(f"[{ts}] {who}: {ctxt}")
                mixed.append(f"[{ts}] {who}: {ptxt if ptxt else '【密文】' + ctxt}")
            plain_p = self.cfg.output_dir / "downloads" / "chat" / "chat_plaintext.txt"
            cipher_p = self.cfg.output_dir / "downloads" / "chat" / "chat_ciphertext.txt"
            mixed_p = self.cfg.output_dir / "downloads" / "chat" / "chat_mixed.txt"
            plain_p.write_text("\n".join(plain), encoding="utf-8")
            cipher_p.write_text("\n".join(cipher), encoding="utf-8")
            mixed_p.write_text("\n".join(mixed), encoding="utf-8")
            chat_result = {
                "status": "ok",
                "plain_count": len(plain),
                "cipher_count": len(cipher),
                "plain_path": str(plain_p),
                "cipher_path": str(cipher_p),
                "mixed_path": str(mixed_p),
            }
            if len(plain) == 0 and len(cipher) > 0:
                self._log("warn", "对话外带仅得到密文，明文泄露已被加密策略抑制")
            else:
                self._log("info", "对话TXT导出完成", chat_result)
        else:
            p = self.cfg.output_dir / "downloads" / "chat" / "chat_blocked.txt"
            p.write_text("chat blocked or missing, no chat_items.json\n", encoding="utf-8")
            chat_result = {"status": "blocked", "path": str(p)}
            self._log("warn", "对话下载被拒绝或无数据，已生成blocked说明", chat_result)

        ret["chat_export"] = chat_result
        self._write_json(self.cfg.output_dir / "reports" / "download_results_auto.json", ret)
        self._log("info", f"下载结束：成功 {ret['ok']}，拒绝 {ret['rejected']}")
        return ret


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="自动发现接口版采集器（无需预先提供接口）")
    p.add_argument("--base-origin", default="http://localhost:3000", help="目标站点 Origin，例如 http://localhost:3000")
    p.add_argument("--asset-origin", default="", help="资源下载域名/端口覆盖（例如 http://localhost:5173）")
    p.add_argument("--output-dir", default="tools/authorized_security_tester/output_auto", help="输出目录")
    p.add_argument("--timeout", type=int, default=15, help="请求超时（秒）")
    p.add_argument("--delay-ms", type=int, default=120, help="探测间隔（毫秒）")
    p.add_argument("--download-policy", choices=["prompt", "all", "type", "item", "none"], default="prompt", help="下载策略")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    cfg = Config(
        base_origin=args.base_origin,
        asset_origin=args.asset_origin.strip(),
        output_dir=Path(args.output_dir),
        timeout=args.timeout,
        delay_ms=args.delay_ms,
        download_policy=args.download_policy,
    )
    cli = AutoDiscoverCollector(cfg)
    try:
        summary = cli.run()
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except KeyboardInterrupt:
        print("任务中断")
        return 130
    except Exception as exc:
        print(f"执行失败: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

