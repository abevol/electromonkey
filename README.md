<p align="center">
  <img src="assets/icon.png" alt="ElectroMonkey" width="128">
</p>

<h1 align="center">ElectroMonkey</h1>

<p align="center">Electron 应用旁载插件框架，提供类似 Tampermonkey 的体验。</p>

通过 asar-patch 技术将插件系统注入到已发布的 Electron 应用中，支持多插件管理、URL 匹配、GM\_\* API、CSS/JS 注入，且不破坏原始应用文件（可一键还原）。

## 特性

- **零破坏部署** — 原始 asar 完整保存为 `*-em-backup.asar`，随时可还原
- **多插件架构** — 每个插件独立目录，含 `manifest.json` 描述；同时支持 Tampermonkey `.user.js` 单文件脚本
- **URL 匹配** — 支持 Chrome 扩展 match pattern 语法（`*://*.example.com/*`）
- **GM\_\* API** — `GM_getValue`、`GM_setValue`、`GM_addStyle`、`GM_notification`、`GM_xmlhttpRequest` 等
- **运行时机控制** — `document-start`、`document-end`、`document-idle`
- **主进程插件** — 支持 `main` 入口，可访问 Electron 主进程 API
- **自动降级** — BrowserWindow 补丁失败时自动切换到 `web-contents-created` 注入
- **双模式架构** — 开发模式（需 Node.js）与发布模式（免安装，运行 PowerShell 脚本即可）

## 普通用户安装

无需 Node.js，无需命令行。

1. 从 [Releases](https://github.com/abevol/electromonkey/releases) 下载最新的 `electromonkey-x.x.x.zip`
2. 解压到任意位置
3. 右键 `install.ps1` → 选择「使用 PowerShell 运行」，按提示输入目标 asar 文件路径（如 `app.asar`）
4. 正常启动目标应用即可

也可在 PowerShell 中直接运行：

```powershell
.\install.ps1 "C:\Users\你的用户名\AppData\Local\SomeApp\1.0.0\resources\app.asar"
```

卸载：右键 `uninstall.ps1` → 选择「使用 PowerShell 运行」，应用恢复为原始状态。

> **插件目录**：安装后插件存放在 `%LOCALAPPDATA%\ElectroMonkey\plugins\`，将 `.user.js` 脚本或插件文件夹放入即可生效。

## 开发者使用

### 安装

```bash
git clone https://github.com/abevol/electromonkey.git
cd electromonkey
npm install
```

### 配置目标应用

复制 `.env.example` 为 `.env`，设置目标 Electron 应用的 asar 文件路径：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```ini
TARGET_APP=../target-app/resources/app.asar
```

### 部署 / 卸载

```bash
npm run deploy     # 部署插件框架（开发模式）
npm run undeploy   # 还原原始应用
```

也可以通过 `--target` 参数指定目标：

```bash
node scripts/deploy.js --target /path/to/electron-app/resources/app.asar
```

> **路径解析优先级**：`--target` 参数 > `.env` 中的 `TARGET_APP`

部署后直接启动目标应用即可，无需特殊启动器。控制面板标题会显示 **DEV** 标签以区分开发模式。

### 外部插件目录

开发模式下，除了 git 仓库内的 `plugins/` 目录，还会扫描以下目录：

```
%LOCALAPPDATA%\ElectroMonkeyDev\plugins\
```

此目录不受 Git 管控，适合放置开发测试用的插件。

### 构建发布包

```bash
npm run build    # 构建到 dist/electromonkey/
```

生成的 `dist/electromonkey/` 包含 `install.ps1`、`uninstall.ps1`、预构建的 `bootstrap.asar` 及所有运行时文件，可直接打包为 zip 发布。

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
| `grant` | 声明使用的 GM\_\* API |
| `enabled` | 是否启用 |

### 可用 GM\_\* API

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
// @match       *://*.*.com/*
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
  → 加载 app.asar（极简引导，~1KB）
    → index.js:
      1. 扫描同级目录，找到 *-em-backup.asar（原始应用备份）
      2. 从备份 asar 读取 package.json，恢复 app.name 和 version
      3. 设置 ELECTROMONKEY_MODE + ELECTROMONKEY_ROOT（release 模式）
      4. require(loader.js)     ← ElectroMonkey 注入
      5. require(*-em-backup.asar)  ← 原始应用正常启动
```

### 注入流程

1. **loader.js** 在主进程中执行，尝试 monkey-patch `BrowserWindow`（替换 preload）
2. 如果 BrowserWindow 为 non-configurable（如 tt_electron），自动降级到 `web-contents-created` 钩子
3. 在 `dom-ready` 事件中，通过 `executeJavaScript` 和 `insertCSS` 注入匹配当前 URL 的插件

### 双模式对比

| | 开发模式 | 发布模式 |
|---|---|---|
| 触发方式 | `npm run deploy` | `install.ps1` |
| 依赖 | Node.js + npm | 无 |
| 运行时位置 | git 仓库 `src/patch/` | `%LOCALAPPDATA%\ElectroMonkey\runtime\` |
| 插件目录 | 仓库 `plugins/` + `%LOCALAPPDATA%\ElectroMonkeyDev\plugins\` | `%LOCALAPPDATA%\ElectroMonkey\plugins\` |
| 控制面板标识 | 显示 **DEV** 标签 | 无标签 |

## 项目结构

```
electromonkey/
├── src/patch/
│   ├── loader.js           # 主进程注入器（模式感知路径解析）
│   ├── plugin-manager.js   # 插件管理（多目录发现、匹配、GM_* API 构建）
│   ├── preload-inject.js   # 渲染器 preload 链式注入
│   └── package.json
├── scripts/
│   ├── deploy.js           # 开发模式部署脚本
│   ├── undeploy.js         # 开发模式卸载脚本
│   ├── build.js            # 构建发布包
│   ├── install.ps1         # 发布模式安装脚本 (PowerShell)
│   └── uninstall.ps1       # 发布模式卸载脚本 (PowerShell)
├── assets/
│   └── icon.png            # 应用图标
├── plugins/
│   ├── control-panel/      # ElectroMonkey 控制面板
│   │   ├── manifest.json
│   │   ├── renderer.js
│   │   └── style.css
│   └── *.user.js           # 示例脚本
└── package.json
```

## 许可证

MIT
