'use strict';

/**
 * loader.js — 主进程引导器
 *
 * Electron 模块解析优先级：resources/app/ (目录) > resources/app.asar (归档)
 * 本文件作为 app/ 目录的入口，在原始应用启动前完成所有补丁注入。
 *
 * 执行顺序：
 *   1. 猴子补丁 electron.BrowserWindow — 让所有窗口加载我们的 preload
 *   2. 注册 web-contents-created 钩子 — 兜底渲染器注入
 *   3. 发现并加载主进程插件
 *   4. require 原始 app.asar — 启动真正的应用
 */

const path = require('path');
const electron = require('electron');
const PluginManager = require('./plugin-manager');

// ── 路径常量 ──────────────────────────────────────────────────────────────────
const PATCH_DIR = __dirname;
const PLUGINS_DIR = path.join(PATCH_DIR, 'plugins');
const ORIGINAL_APP = path.join(PATCH_DIR, '..', 'app.asar');
const PRELOAD_INJECT = path.join(PATCH_DIR, 'preload-inject.js');

// ── 初始化插件管理器 ──────────────────────────────────────────────────────────
const pluginManager = new PluginManager(PLUGINS_DIR);
pluginManager.discoverPlugins();

// ── 全局引用，供 preload-inject.js 通过 IPC 访问 ─────────────────────────────
global.__electroMonkey = {
  pluginManager,
  patchDir: PATCH_DIR,
  version: '1.0.0',
};

// ── 1. 猴子补丁 BrowserWindow ─────────────────────────────────────────────────
//    拦截所有窗口创建，在 webPreferences 中注入我们的 preload 脚本。
//    原始 preload 路径保存在 additionalArguments 中传递给渲染器。
const OriginalBrowserWindow = electron.BrowserWindow;

class PatchedBrowserWindow extends OriginalBrowserWindow {
  constructor(options = {}) {
    const wp = options.webPreferences = options.webPreferences || {};

    // 保存原始 preload 路径，通过 additionalArguments 传递给渲染器
    const args = wp.additionalArguments = wp.additionalArguments || [];
    if (wp.preload) {
      args.push('--original-preload=' + wp.preload);
    }

    // 替换为我们的 preload（它会链式加载原始 preload）
    wp.preload = PRELOAD_INJECT;

    super(options);
  }
}

// 保留全部静态方法和属性（getAllWindows, fromId 等）
Object.setPrototypeOf(PatchedBrowserWindow, OriginalBrowserWindow);
Object.setPrototypeOf(PatchedBrowserWindow.prototype, OriginalBrowserWindow.prototype);

// 替换 electron 模块上的 BrowserWindow
Object.defineProperty(electron, 'BrowserWindow', {
  get: () => PatchedBrowserWindow,
  configurable: true,
});

// ── 2. 兜底：web-contents-created 钩子 ───────────────────────────────────────
//    捕获所有 webContents（包括 <webview>、子窗口等），注入渲染器插件。
//    这是 BrowserWindow 补丁的安全网。
electron.app.on('web-contents-created', (_event, webContents) => {
  webContents.on('dom-ready', () => {
    try {
      const url = webContents.getURL();
      if (!url || url === 'about:blank') return;

      const plugins = pluginManager.getMatchingPlugins(url);
      for (const plugin of plugins) {
        // 注入 CSS
        const css = pluginManager.getPluginCSS(plugin);
        if (css) {
          webContents.insertCSS(css).catch(() => {});
        }

        // 注入渲染器代码（作为 BrowserWindow preload 注入的后备）
        // 只注入 run-at=document-idle 的脚本（dom-ready 对应此时机）
        if (plugin.manifest.runAt === 'document-idle' || !plugin.manifest.runAt) {
          const code = pluginManager.buildRendererCode(plugin);
          if (code) {
            webContents.executeJavaScript(code).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('[ElectroMonkey] web-contents injection error:', err.message);
    }
  });
});

// ── 3. IPC 通道 ──────────────────────────────────────────────────────────────
//    preload-inject.js 通过 IPC 获取插件信息
electron.ipcMain.handle('electromonkey:get-plugins', (_event, url) => {
  const plugins = pluginManager.getMatchingPlugins(url);
  return plugins.map(p => ({
    name: p.manifest.name,
    version: p.manifest.version,
    description: p.manifest.description,
    runAt: p.manifest.runAt || 'document-idle',
    rendererCode: pluginManager.buildRendererCode(p),
    css: pluginManager.getPluginCSS(p),
  }));
});

electron.ipcMain.handle('electromonkey:get-info', () => ({
  version: global.__electroMonkey.version,
  pluginCount: pluginManager.plugins.length,
  plugins: pluginManager.plugins.map(p => ({
    name: p.manifest.name,
    version: p.manifest.version,
    enabled: p.manifest.enabled !== false,
  })),
}));

// ── 4. 加载主进程插件 ────────────────────────────────────────────────────────
pluginManager.loadMainProcessPlugins();

// ── 5. 启动原始应用 ──────────────────────────────────────────────────────────
console.log('[ElectroMonkey] Loader initialized — plugins:', pluginManager.plugins.length);
console.log('[ElectroMonkey] Loading original app from:', ORIGINAL_APP);

require(ORIGINAL_APP);
