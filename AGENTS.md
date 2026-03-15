# ElectroMonkey — Agent Knowledge Base

## Project Overview

ElectroMonkey is a sideloading plugin framework for Electron applications (primarily targeting ByteDance's tt_electron-based Douyin PC). It provides a Tampermonkey-like experience: multi-plugin support, URL match patterns, GM_* APIs, and per-plugin CSS/JS injection.

## Architecture

```
electromonkey/
├── src/patch/           # Runtime injection modules (loaded inside target app)
│   ├── loader.js        # Main process injector (BrowserWindow patch + web-contents-created)
│   ├── plugin-manager.js # Plugin discovery, URL matching, GM_* API builder
│   ├── preload-inject.js # Renderer preload chain loader + plugin injector
│   └── package.json
├── scripts/
│   ├── deploy.js        # asar-patch deployer (backup + bootstrap asar)
│   └── undeploy.js      # Restores original asar from backup
├── plugins/             # Plugin directory (each subfolder = one plugin)
│   └── example-plugin/
└── package.json         # Project root with deploy/undeploy scripts
```

## Injection Mechanism (asar-patch)

1. `deploy.js` renames `app.asar` → `app-original.asar`
2. Creates a tiny bootstrap `app.asar` containing only `index.js` + `package.json`
3. Bootstrap `index.js` does: `require(loader.js)` → `require(app-original.asar)`
4. `loader.js` patches BrowserWindow (with fallback) and registers `web-contents-created` hooks
5. Target app launches normally with plugins injected

## Key Technical Constraints

- **tt_electron exports `BrowserWindow` as non-configurable** — `Object.defineProperty` throws. The loader isolates this in a try/catch and falls back to `web-contents-created` + `executeJavaScript` injection.
- **`EnableEmbeddedAsarIntegrityValidation` is DISABLED** in the target app's Electron fuses, making asar replacement safe.
- **`OnlyLoadAppFromAsar` is DISABLED** but tt_electron's custom launcher (`electron_main_win_new.cc`) hardcodes asar loading, ignoring `resources/app/` directory override.
- **WSL path conversion** is needed in deploy scripts: `/mnt/d/...` → `D:/...` for `require()` paths embedded in the bootstrap asar.

## Plugin Structure

Each plugin is a directory under `plugins/` with a `manifest.json`:

```json
{
  "name": "Plugin Name",
  "version": "1.0.0",
  "match": ["*://*.douyin.com/*"],
  "renderer": "renderer.js",
  "css": "style.css",
  "runAt": "document-idle",
  "grant": ["GM_addStyle", "GM_setValue"]
}
```

## Code Conventions

- Pure CommonJS (`require`/`module.exports`), no transpilation
- `'use strict'` at top of every file
- All runtime errors wrapped in try/catch to never break the host app
- Console output prefixed with `[ElectroMonkey]`

## Deploy/Undeploy

```bash
npm run deploy    # Backup asar + create bootstrap
npm run undeploy  # Restore original asar from backup
```

The `config.targetApp` field in `package.json` points to the target app's `resources/` directory.
