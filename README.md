# 算间前端

原生 HTML、CSS 和 JavaScript，无需 npm 或构建步骤。前端不包含表达式计算引擎，最终结果来自后端 API。

## 运行环境与启动

需要现代浏览器，以及用于静态文件服务的 Python 3.10+（或任意静态 Web 服务器）。在本仓库目录执行：

```bash
python -m http.server 8080 --bind 127.0.0.1
```

打开 <http://localhost:8080>。双击 HTML 文件的 `file://` 方式不作为正式运行方式。

## 后端连接配置

`config.js` 中的 `apiBaseUrl` 控制 API 地址：

- 在 `localhost:8080` 或 `127.0.0.1:8080` 开发时默认连接 `http://127.0.0.1:8000`。
- Docker 构建时使用 `config.production.js` 覆盖 `config.js`，始终使用同源 `/api`，由 Nginx 代理到 `backend:8000`，包括映射到本机 8080 的情况。
- 若前后端部署到不同网站，将 `apiBaseUrl` 设置为后端的 HTTPS 地址，并在后端 `CORS_ORIGINS` 添加前端完整 origin。
- HTTPS 网页应连接 HTTPS 后端，避免浏览器混合内容拦截。

不要在公网部署时填入 `localhost` 后端地址。使用其他本地端口开发时也要相应调整地址和 CORS。

## 功能

计算器输入、按钮、结果与错误展示；历史查询、搜索、分页、按条删除、表达式复用；Enter 计算、Esc 清空和数字运算符快捷输入；适配手机。

- 计算器右上角选择自动、浅色或深色主题。自动模式依据本机时间，07:00–19:00 为浅色，其余为深色；每分钟和重新回到页面时更新。主题偏好保存在 LocalStorage，浏览器禁用存储时仍可切换。
- 历史每条记录旁的“☆ 收藏”／“★ 已收藏”按钮用于收藏／取消收藏；“仅收藏”可结合搜索使用。收藏通过后端 API 保存到数据库。
- “导出 CSV”下载当前搜索及收藏筛选下的全部记录，包括其他分页。UTF-8 BOM 支持中文表格软件识别；字段包含 ID、表达式、结果、UTC 计算时间和收藏状态。

数据库由后端首次启动自动初始化，前端不连接数据库，也不使用 LocalStorage 保存计算历史。

## Docker

```bash
docker build -t calculator-frontend .
```

镜像中的 Nginx 需要与名为 `backend` 的后端服务在同一 Docker 网络运行。推荐使用完整项目的 Compose 配置；单独运行前端镜像而没有后端 DNS 将无法启动代理。

## 文件

- `index.html`：页面与可访问性语义。
- `styles.css`：视觉和响应式布局。
- `app.js`：交互、HTTP 请求和历史管理。
- `theme.js`：首屏主题、时间切换与偏好保存。
- `config.js`：API 地址。
- `config.production.js`：Docker 使用的同源 API 配置。
- `nginx.conf` / `Dockerfile`：生产部署。
- `codestyle.md`：代码规范。
