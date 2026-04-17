# 授权安全资源探测器（Python）

该工具面向**授权安全演练**与**数据合规审计**，用于对目标站点进行接口探测、渐进式采集、分类归档与完整性校验。

## 功能映射

- 智能接口探测：探测 `AttackLab.vue` 使用的核心接口（`/admin/security/*`、`/leak/*`）。
- 渐进式采集策略：按 `Step#1 -> Step#2 -> Step#3` 执行用户、内容、对话采集。
- 数据分类管理：自动写入 `users/media/text/chat` 子目录。
- 去重与完整性：按主键去重并生成 `sha256` 校验清单。
- 交互模式：
  - `manual`：仅探测接口。
  - `auto`：自动探测 + 自动采集（默认）。
  - `hybrid`：预留与人工联动，当前行为同 `auto`。

## 安装

在仓库根目录执行：

```bash
pip install -r tools/authorized_security_tester/requirements.txt
```

## 运行示例

### 1) 自动模式（推荐）

```bash
python tools/authorized_security_tester/main.py --mode auto --base-url http://localhost:3000/api
```

默认会在扫描后进入下载策略选择（`prompt`），你可以选择：
- `all`：全部下载
- `type`：按类型下载，并可设置每类下载数量
- `item`：按清单序号下载指定条目
- `none`：只扫描不下载

### 2) 仅探测接口

```bash
python tools/authorized_security_tester/main.py --mode manual --base-url http://localhost:3000/api
```

### 3) 启用破解演示与 WebSocket 端口探测

```bash
python tools/authorized_security_tester/main.py \
  --mode auto \
  --base-url http://localhost:3000/api \
  --include-crack-demo \
  --probe-ws-url ws://localhost:3000/ws
```

### 4) 非交互下载（脚本化运行）

- 全部下载：
```bash
python tools/authorized_security_tester/main.py --mode auto --download-policy all
```

- 按类型下载（每类限量）：
```bash
python tools/authorized_security_tester/main.py \
  --mode auto \
  --download-policy type \
  --download-types video,image,article \
  --download-counts video=2,image=10,article=3
```

- 按序号下载（序号来自扫描清单输出）：
```bash
python tools/authorized_security_tester/main.py \
  --mode auto \
  --download-policy item \
  --download-item-indexes "video:1,3;image:2;article:1"
```

## 输出结构

- `output/reports/discovered_endpoints.json`：接口探测结果（含可达状态）
- `output/reports/apis/http_endpoints.csv`：接口列表 CSV
- `output/reports/logs/scan_steps.jsonl`：步骤日志
- `output/collected/users/users.json`：用户采样数据
- `output/collected/users/crack_result.json`：破解演示结果（可选）
- `output/collected/media/videos.json`：视频数据
- `output/collected/media/images.json`：插画数据
- `output/collected/text/articles.json`：专栏数据
- `output/collected/chat/chat_items.json`：对话数据
- `output/collected/chat/chat_export.txt`：对话文本导出
- `output/downloads/video/*`：真实下载的视频文件（二进制直存）
- `output/downloads/image/*`：真实下载的插画图片（二进制直存）
- `output/downloads/article/*.doc`：文章导出的 Word 文档（`.doc`）
- `output/reports/asset_inventory.json`：可下载资产清单（含标题/ID/URL）
- `output/reports/download_results.json`：下载执行结果（逐条成功/拒绝原因）
- `output/integrity/checksums.json`：文件完整性校验信息

## 参数说明

- `--base-url`：目标 API 基础地址，默认 `http://localhost:3000/api`
- `--asset-origin`：资源下载域名覆盖（例如 `http://localhost:5173`），用于将后端返回的绝对资源地址统一重写到指定端口
- `--output-dir`：输出目录，默认 `tools/authorized_security_tester/output`
- `--mode`：`manual/auto/hybrid`
- `--timeout`：HTTP 请求超时秒数
- `--delay-ms`：步进请求间隔（模拟正常访问节奏）
- `--max-items-per-type`：每类数据最大保存数量
- `--probe-ws-url`：可选的 WebSocket 地址
- `--include-crack-demo`：是否调用 `/leak/crack`
- `--enable-attack-probes`：启用 XSS/SQLi 探测阶段（仅授权演练）
- `--download-policy`：`prompt/all/type/item/none`
- `--download-types`：`type` 策略时指定类型集合
- `--download-counts`：`type` 策略时指定每类数量上限
- `--download-item-indexes`：`item` 策略时指定条目序号

## 端口说明（重要）

- `5173` 通常是前端开发服务器端口（Vite）
- `3000` 通常是后端 API 服务端口
- 脚本默认直接访问后端 API（`3000`）更稳定
- 如果你必须走 `5173` 反向代理：
  - `--base-url http://localhost:5173/api`
  - `--asset-origin http://localhost:5173`

## 日志策略

- 终端默认输出“关键信息”（方法/路径/状态/hint），减少冗长回显
- 完整请求与响应（含参数与请求体）会写入：
  - `output/reports/request_traces.json`
  - `output/reports/attack_probe_results.json`（启用攻击探测时）

## 合规边界

- 仅可用于你拥有明确授权的目标系统。
- 禁止用于未授权环境、生产破坏性测试或数据滥用。
- 建议留存授权证明、执行日志与导出清单，满足审计可追溯要求。
