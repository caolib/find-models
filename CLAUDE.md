# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

uTools 插件：浏览 [models.dev](https://models.dev) 的 AI 模型目录（搜索 / 按供应商 / 详情侧栏 / 设置）。数据源是 `https://models.dev/catalog.json` 与供应商 logo SVG。

技术栈：Vue 3 (`script setup`) + Vite 8 + Pinia（含 `pinia-plugin-persistedstate`）。包管理用 **pnpm**。无测试套件。

## Commands

```bash
pnpm install
pnpm dev          # Vite http://127.0.0.1:5173 （plugin.json development.main 指向这里）
pnpm build        # 输出 dist/，base 为 './'（适配 uTools file 协议）
pnpm format       # Prettier 格式化（.prettierrc：无分号 + 单引号，与 standard 对齐）
pnpm format:check # 仅检查
pnpm exec standard        # JS lint（已装 standard，未挂 npm script）
pnpm exec standard --fix  # 自动修
```

uTools 开发：用开发者工具加载 **`dist/` 或开发模式指向 dev server**；改 `public/plugin.json` / `public/logo.png` / preload 后需重新加载插件。生产入口是 build 后的 `index.html` + `preload/services.js`。

浏览器单独 `pnpm dev` 可以跑 UI，但 **`window.services` / `window.utools` 不存在**——目录拉取、logo 缓存、复制等会失败或需守卫；业务数据路径假定在 uTools preload 环境。

## Architecture

### Runtime split

| Layer          | Path                         | Role                                                    |
| -------------- | ---------------------------- | ------------------------------------------------------- |
| Renderer (Vue) | `src/`                       | UI、筛选、主题/字体、详情                               |
| Preload (Node) | `public/preload/services.js` | `window.services`：拉 catalog、本地缓存、logo、复制文本 |
| Manifest       | `public/plugin.json`         | `main` / `preload` / `logo` / features（含划词 `over`） |

`catalog.json` 体积大（约数 MB），**不能**塞进 `utools.dbStorage`（约 1MB 上限）。preload 用 `node:fs` 写到 `userData/modelsdev-data/catalog.json`；logo 缓存到同目录 `logos/{providerId}.svg`。

### UI shell

- `src/main.js`：Pinia + persistedstate → mount `App.vue`
- `src/App.vue`：顶栏 **单行**（Tab + 当前页工具条）+ 主面板 + 可选右侧 `Detail`
  - Tab：`search` | `providers` | `settings`（持久化）
  - 搜索 Tab：全局搜索框 + 排序 + 计数
  - 供应商 Tab：当前供应商模型搜索框 + 计数
  - 选中模型时右侧详情；设置 Tab 不显示详情
- 页面：
  - `Models/Search.vue`：卡片网格 + 无限滚动（`limit` 累加，scroll 触底）
  - `Models/Providers.vue`：左供应商列表（可 pin）/ 右模型卡片
  - `Models/Settings.vue`：字体输入、主题分段、数据来源声明
  - `Models/Detail.vue`：模型详情；外链 `utools.shellOpenExternal` 或 `window.open`
- 数据整形：`Models/data.js` 的 `flatten(catalog)` 把 providers×models 展成行记录（能力、价格、limit 等）

### State

- `stores/prefs.js`（持久化 key `modelsdev.prefs`）：`tab`、`pinnedProviders`、`fontFamily`（CSS stack 字符串）、`theme`（`system|light|dark`）
- `stores/storage.js`：`appStorage` → uTools `dbStorage`，浏览器 dev 回落 `localStorage`；含旧 `pinnedProviders` 迁移
- `stores/ui.js`（不持久化）：顶栏搜索/排序/供应商模型 query
- 主题：`html[data-theme=light|dark]` + token 在 `src/main.css`；系统模式用 `utools.isDarkColors()` 与 `matchMedia('(prefers-color-scheme: dark)')` 监听
- 字体：写 CSS 变量 `--font-mono`（`body` 用它）

### Styling conventions

- 全局 token：`src/main.css`
- 壳：`Models/app.css`；列表/卡片/供应商：`Models/index.css`；详情/设置各自 css
- 深色 logo 底：`html[data-theme="dark"] .logo-box` 白底（黑线 SVG）
- 深色背景为纯灰阶，无蓝偏

### uTools features

- `home`：打开插件（cmds 见 `plugin.json`）
- `input-search`：`type: over` 划词 → `enterAction` 写入搜索 query
- 插件 logo：`public/logo.png`（`plugin.json` 的 `"logo": "logo.png"`）

### External data notes

- API 说明见 `docs/models.dev.md`（上游 models.dev 文档摘录）
- Provider logo：`https://models.dev/logos/{providerId}.svg`
- `open_weights` = 权重可公开获取，不等于 OSI 开源许可

## Constraints / gotchas

- Vite `base: './'`、dev 固定 `127.0.0.1:5173` + polling（配合 uTools 环境）
- Preload 是 **CommonJS + Node API**，不要当 ESM/Vue 模块 import
- 渲染进程只应通过 `window.services` / `window.utools` 访问 Node/系统能力，并做可选链守卫
- 改 pinia persist 字段时注意 `pick` 与 storage 迁移
- 无自动化测试；验证以 `pnpm build` + uTools 内手动操作为主
