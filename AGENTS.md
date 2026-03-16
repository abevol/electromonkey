# ElectroMonkey — Agent Knowledge Base

## Project Overview

ElectroMonkey is a sideloading plugin framework for Electron applications. It provides a Tampermonkey-like experience: multi-plugin support, URL match patterns, GM_* APIs, and per-plugin CSS/JS injection.

## Dual-Mode Architecture

ElectroMonkey operates in two mutually exclusive modes. Only one can be active at a time (they share the same asar slot).

### Dev Mode (`npm run deploy`)

For developers with Node.js. Bootstrap asar points to the git repo's `src/patch/loader.js` via absolute path.

- `process.env.ELECTROMONKEY_MODE = 'dev'`
- `process.env.ELECTROMONKEY_ROOT` is NOT set (falls back to `path.resolve(__dirname, '..', '..')`)
- Plugin dirs: `<git-repo>/plugins/` + `%LOCALAPPDATA%/ElectroMonkeyDev/plugins/`
- Control panel title shows a **DEV** badge

### Release Mode (`install.ps1`)

For end users without Node.js. Bootstrap asar is pre-built and points to `%LOCALAPPDATA%/ElectroMonkey/`.

- `process.env.ELECTROMONKEY_MODE = 'release'`
- `process.env.ELECTROMONKEY_ROOT = %LOCALAPPDATA%/ElectroMonkey`
- Plugin dirs: `%LOCALAPPDATA%/ElectroMonkey/plugins/` only
- Runtime files installed to `%LOCALAPPDATA%/ElectroMonkey/runtime/`

### Path Resolution

`loader.js` resolves `PROJECT_ROOT` via:
```js
const PROJECT_ROOT = process.env.ELECTROMONKEY_ROOT
  || path.resolve(__dirname, '..', '..');
```

Dev mode: env var unset → relative path from git repo's `src/patch/` → git repo root.
Release mode: env var set by bootstrap → `%LOCALAPPDATA%/ElectroMonkey`.

## File Layout

```
electromonkey/
├── src/patch/               # Runtime injection modules (loaded inside target app)
│   ├── loader.js            # Main process injector (mode-aware path resolution)
│   ├── plugin-manager.js    # Multi-dir plugin discovery, URL matching, GM_* API builder
│   ├── preload-inject.js    # Renderer preload chain loader + plugin injector
│   └── package.json
├── scripts/
│   ├── deploy.js            # Dev mode: asar-patch deployer (sets MODE=dev)
│   ├── undeploy.js          # Dev mode: restores original asar from backup
│   ├── build.js             # Builds release package into dist/
│   ├── install.ps1           # Release mode: Windows install (PowerShell, no Node.js required)
│   └── uninstall.ps1         # Release mode: Windows uninstall (PowerShell)
├── assets/
│   └── icon.png             # App icon
├── plugins/                 # Built-in plugins (shipped with both modes)
│   ├── control-panel/       # ElectroMonkey Control Panel (DEV badge in dev mode)
│   └── *.user.js            # Example/bundled userscripts
└── package.json             # deploy/undeploy/build scripts
```

Release install layout on user's machine:
```
%LOCALAPPDATA%/ElectroMonkey/
├── runtime/                 # Copied from git repo's src/patch/
├── plugins/                 # User's plugin directory (survives updates)
│   ├── control-panel/       # Updated on each install
│   └── (user-added plugins)
└── assets/
```

Dev external plugin directory (not in git):
```
%LOCALAPPDATA%/ElectroMonkeyDev/plugins/
└── (developer's test plugins)
```

## Injection Mechanism (asar-patch)

1. `deploy.js` (dev) or `install.ps1` (release) backs up the target asar (e.g. `app.asar` → `app-em-backup.asar`)
2. Replaces the target asar with a tiny bootstrap asar containing only `index.js` + `package.json` (`{ "main": "index.js" }`)
3. Bootstrap `index.js` scans its parent directory for `*-em-backup.asar` to locate the original backup, reads its `package.json` to restore `app.name` and `app.setVersion()`, sets `ELECTROMONKEY_MODE` + `ELECTROMONKEY_ROOT` (release only), then `require(loader.js)` → `require(*-em-backup.asar)`
4. `loader.js` patches BrowserWindow (with fallback) and registers `web-contents-created` hooks
5. Target app launches normally with plugins injected

## Key Technical Constraints

- **tt_electron exports `BrowserWindow` as non-configurable** — `Object.defineProperty` throws. The loader isolates this in a try/catch and falls back to `web-contents-created` + `executeJavaScript` injection.
- **`EnableEmbeddedAsarIntegrityValidation` is DISABLED** in the target app's Electron fuses, making asar replacement safe.
- **`OnlyLoadAppFromAsar` is DISABLED** but tt_electron's custom launcher (`electron_main_win_new.cc`) hardcodes asar loading, ignoring `resources/app/` directory override.
- **WSL path conversion** is needed in dev deploy scripts: `/mnt/d/...` → `D:/...` for `require()` paths embedded in the bootstrap asar.

## Plugin System

### Multi-Directory Discovery

`PluginManager` accepts an array of plugin directories. `discoverPlugins()` iterates each directory via `_scanDirectory()`, scanning for directory plugins (manifest.json) then .user.js files.

- Dev mode scans: `<repo>/plugins/` + `%LOCALAPPDATA%/ElectroMonkeyDev/plugins/`
- Release mode scans: `%LOCALAPPDATA%/ElectroMonkey/plugins/` only

### Plugin Formats

Two formats are supported:

#### Format 1: Directory plugin (manifest.json)

```json
{
  "name": "Plugin Name",
  "version": "1.0.0",
  "match": ["*://*.*.com/*"],
  "renderer": "renderer.js",
  "css": "style.css",
  "runAt": "document-idle",
  "grant": ["GM_addStyle", "GM_setValue"]
}
```

#### Format 2: Tampermonkey .user.js single-file script

```javascript
// ==UserScript==
// @name        My Script
// @version     1.0.0
// @match       *://*.*.com/*
// @grant       GM_addStyle
// ==/UserScript==
```

### GM_info.mode

`buildRendererCode()` injects `GM_info.mode` (`'dev'` or `'release'`) into the renderer IIFE. The control panel uses this to conditionally show the DEV badge.

## Code Conventions

- Pure CommonJS (`require`/`module.exports`), no transpilation
- `'use strict'` at top of every file
- All runtime errors wrapped in try/catch to never break the host app
- Console output prefixed with `[ElectroMonkey]`

## Commands

```bash
npm run deploy    # Dev mode: backup asar + create dev bootstrap
npm run undeploy  # Dev mode: restore original asar
npm run build     # Build release package into dist/
```

The `config.targetApp` field in `package.json` points to the target app's asar file (e.g. `../douyin/7.4.0/resources/app.asar`), used by dev mode scripts. The backup naming convention is `*-em-backup.asar` (e.g. `app.asar` → `app-em-backup.asar`).
