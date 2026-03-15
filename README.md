# ElectroMonkey

Electron 应用旁载插件框架，提供类似 Tampermonkey 的体验。

通过 asar-patch 技术将插件系统注入到已发布的 Electron 应用中，支持多插件管理、URL 匹配、GM_\* API、CSS/JS 注入，且不破坏原始应用文件（可一键还原）。

## 特性

- **零破坏部署** — 原始 `app.asar` 完整保存为 `app-original.asar`，随时可还原
- **多插件架构** — 每个插件独立目录，含 `manifest.json` 描述；同时支持 Tampermonkey `.user.js` 单文件脚本
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
npm run deploy     # 部署插件框架（使用 package.json 中配置的目标路径）
npm run undeploy   # 还原原始应用
```

也可以通过 `--target` 参数指定目标应用的 `resources` 目录，覆盖 `package.json` 中的默认配置：

```bash
node scripts/deploy.js --target /path/to/electron-app/resources
node scripts/undeploy.js --target /path/to/electron-app/resources
```

> **路径解析优先级**：`--target` 参数 > `package.json` 中的 `config.targetApp`

部署后直接启动目标应用即可，无需特殊启动器。

## 编写插件

ElectroMonkey 支持两种插件格式：

```
plugins/
├── my-plugin/                  # 格式一：目录插件（manifest.json）
│   ├── manifest.json
│   ├── renderer.js
│   └── style.css
└── my-script.user.js           # 格式二：Tampermonkey .user.js 单文件脚本
```

### 格式一：目录插件（manifest.json）

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

### 格式二：Tampermonkey .user.js 脚本

直接将 `.user.js` 文件放入 `plugins/` 目录即可，无需 `manifest.json`。元数据从 `==UserScript==` 头部自动解析：

```javascript
// ==UserScript==
// @name        我的脚本
// @version     1.0.0
// @description 脚本描述
// @author      作者
// @match       *://*.douyin.com/*
// @run-at      document-idle
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

GM_addStyle('body { border: 2px solid blue; }');
console.log('Hello from userscript!');
```

支持的 `@` 标签：

| 标签 | 说明 |
|---|---|
| `@name` | 脚本名称 |
| `@version` | 版本号 |
| `@description` | 描述 |
| `@author` | 作者 |
| `@match` | URL 匹配规则（可多次声明） |
| `@include` | URL 匹配规则（`@match` 的兼容别名） |
| `@exclude` / `@exclude-match` | URL 排除规则 |
| `@run-at` | 运行时机：`document-start` \| `document-end` \| `document-idle` |
| `@grant` | 声明使用的 GM\_\* API（`none` 表示不需要） |
| `@namespace` | 命名空间（保留字段） |
| `@noframes` | 不在 iframe 中运行（保留字段） |

> **兼容性说明**：从 Tampermonkey / Greasemonkey 导出的 `.user.js` 脚本可直接放入 `plugins/` 目录使用，只要脚本使用的 GM\_\* API 在上方「可用 GM\_\* API」列表中即可。

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
│   ├── example-plugin/     # 示例插件（目录格式）
│   │   ├── manifest.json
│   │   ├── renderer.js
│   │   └── style.css
│   └── example-userscript.user.js  # 示例脚本（.user.js 格式）
└── package.json
```

## 许可证

MIT
