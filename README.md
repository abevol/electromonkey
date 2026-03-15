# ElectroMonkey

Electron 应用旁载插件框架，提供类似 Tampermonkey 的体验。

通过 asar-patch 技术将插件系统注入到已发布的 Electron 应用中，支持多插件管理、URL 匹配、GM_\* API、CSS/JS 注入，且不破坏原始应用文件（可一键还原）。

## 特性

- **零破坏部署** — 原始 `app.asar` 完整保存为 `app-original.asar`，随时可还原
- **多插件架构** — 每个插件独立目录，含 `manifest.json` 描述
- **URL 匹配** — 支持 Chrome 扩展 match pattern 语法（`*://*.example.com/*`）
- **GM_\* API** — `GM_getValue`、`GM_setValue`、`GM_addStyle`、`GM_notification`、`GM_xmlhttpRequest` 等
- **运行时机控制** — `document-start`、`document-end`、`document-idle`
- **主进程插件** — 支持 `main` 入口，可访问 Electron 主进程 API
- **自动降级** — BrowserWindow 补丁失败时自动切换到 `web-contents-created` 注入

## 快速开始

### 安装

```bash
git clone https://github.com/abevol/electromonkey.git
cd electromonkey
npm install
```

### 配置目标应用

编辑 `package.json` 中的 `config.targetApp`，指向目标 Electron 应用的 `resources` 目录：

```json
{
  "config": {
    "targetApp": "../douyin/7.4.0/resources"
  }
}
```

### 部署 / 卸载

```bash
npm run deploy     # 部署插件框架
npm run undeploy   # 还原原始应用
```

部署后直接启动目标应用即可，无需特殊启动器。

## 编写插件

在 `plugins/` 目录下创建子目录，包含 `manifest.json` 和脚本文件：

```
plugins/
└── my-plugin/
    ├── manifest.json
    ├── renderer.js
    └── style.css
```

### manifest.json

```json
{
  "name": "我的插件",
  "version": "1.0.0",
  "description": "插件描述",
  "author": "作者",
  "match": ["*://*.example.com/*"],
  "exclude": [],
  "runAt": "document-idle",
  "renderer": "renderer.js",
  "css": "style.css",
  "main": null,
  "grant": ["GM_addStyle", "GM_setValue", "GM_getValue"],
  "enabled": true
}
```

| 字段 | 说明 |
|---|---|
| `match` | URL 匹配规则，支持 `*` 通配符（Chrome 扩展语法） |
| `exclude` | URL 排除规则 |
| `runAt` | 运行时机：`document-start` \| `document-end` \| `document-idle` |
| `renderer` | 渲染器脚本文件名 |
| `css` | 样式文件名 |
| `main` | 主进程脚本（可选，需导出 `activate(context)` 函数） |
| `grant` | 声明使用的 GM_\* API |
| `enabled` | 是否启用 |

### 可用 GM_\* API

| API | 说明 |
|---|---|
| `GM_info` | 插件和框架元信息 |
| `GM_getValue(key, default)` | 读取持久化存储 |
| `GM_setValue(key, value)` | 写入持久化存储 |
| `GM_deleteValue(key)` | 删除存储项 |
| `GM_listValues()` | 列出所有存储键名 |
| `GM_addStyle(css)` | 注入 CSS 样式 |
| `GM_log(...args)` | 带插件名前缀的控制台日志 |
| `GM_notification(details)` | 桌面通知 |
| `GM_setClipboard(text)` | 写入剪贴板 |
| `GM_xmlhttpRequest(details)` | 网络请求（基于 fetch） |

### 渲染器脚本示例

```javascript
// ==ElectroMonkey==
// @name        我的插件
// @version     1.0.0
// @match       *://*.example.com/*
// ==/ElectroMonkey==

GM_log('插件已加载', location.href);
GM_addStyle('body { border: 2px solid red; }');

var count = GM_getValue('visitCount', 0) + 1;
GM_setValue('visitCount', count);
GM_log('第', count, '次访问');
```

## 工作原理

```
目标应用启动
  → 加载 app.asar（极简引导，2KB）
    → index.js:
      1. require(loader.js)     ← ElectroMonkey 注入
      2. require(app-original.asar)  ← 原始应用正常启动
```

### 注入流程

1. **loader.js** 在主进程中执行，尝试 monkey-patch `BrowserWindow`（替换 preload）
2. 如果 BrowserWindow 为 non-configurable（如 tt_electron），自动降级到 `web-contents-created` 钩子
3. 在 `dom-ready` 事件中，通过 `executeJavaScript` 和 `insertCSS` 注入匹配当前 URL 的插件

## 项目结构

```
electromonkey/
├── src/patch/
│   ├── loader.js           # 主进程注入器
│   ├── plugin-manager.js   # 插件管理（发现、匹配、GM_* API 构建）
│   ├── preload-inject.js   # 渲染器 preload 链式注入
│   └── package.json
├── scripts/
│   ├── deploy.js           # 部署脚本（asar-patch）
│   └── undeploy.js         # 卸载脚本（还原 asar）
├── plugins/
│   └── example-plugin/     # 示例插件
│       ├── manifest.json
│       ├── renderer.js
│       └── style.css
└── package.json
```

## 许可证

MIT
