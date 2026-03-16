'use strict';

/**
 * loader.js — ElectroMonkey 主进程注入器
 *
 * 注入方式：asar-patch（引导 asar 的 index.js require 本文件）
 *
 * 原理：
 *   deploy 脚本将原始 asar 备份为 *-em-backup.asar，
 *   用一个极简引导 asar 替代，其 index.js 先 require 本文件完成注入，
 *   再 require 备份 asar 启动真正的应用。
 */

// 仅在主进程中执行（防止被子进程意外加载）
if (process.type !== 'browser') return;

try {
  const path = require('path');
  const electron = require('electron');
  const PluginManager = require('./plugin-manager');

  // ── 路径常量 ────────────────────────────────────────────────────────────────
  // dev 模式: loader.js 位于 src/patch/，上两级 = 项目根
  // release 模式: ELECTROMONKEY_ROOT 由 bootstrap 设置，指向 %LOCALAPPDATA%/ElectroMonkey
  const PATCH_DIR = __dirname;
  const PROJECT_ROOT = process.env.ELECTROMONKEY_ROOT
    || path.resolve(PATCH_DIR, '..', '..');
  const MODE = process.env.ELECTROMONKEY_MODE || 'dev';
  const PLUGINS_DIRS = [path.join(PROJECT_ROOT, 'plugins')];
  const PRELOAD_INJECT = path.join(PATCH_DIR, 'preload-inject.js');

  // 开发模式：添加外部插件目录（不受 Git 管控）
  if (MODE === 'dev' && process.env.LOCALAPPDATA) {
    PLUGINS_DIRS.push(path.join(process.env.LOCALAPPDATA, 'ElectroMonkeyDev', 'plugins'));
  }

  // ── 加载高清 LOGO ──────────────────────────────────────────────────────────
  // 从 assets/icon.png 读取 256px 原图，覆盖 PluginManager 上的缩略图默认值
  try {
    const fs = require('fs');
    const iconPath = path.join(PROJECT_ROOT, 'assets', 'icon.png');
    if (fs.existsSync(iconPath)) {
      const iconBase64 = fs.readFileSync(iconPath).toString('base64');
      PluginManager.LOGO_DATA_URI = 'data:image/png;base64,' + iconBase64;
    }
  } catch (_) {
    // 读取失败则保留 PluginManager 上的小图默认值
  }

  // ── 初始化插件管理器 ────────────────────────────────────────────────────────
  const pluginManager = new PluginManager(PLUGINS_DIRS, { mode: MODE });
  pluginManager.discoverPlugins();

  // ── 全局引用 ────────────────────────────────────────────────────────────────
  global.__electroMonkey = {
    pluginManager,
    patchDir: PATCH_DIR,
    projectRoot: PROJECT_ROOT,
    mode: MODE,
    version: '1.0.0',
  };

  // BrowserWindow 补丁：tt_electron 将 BrowserWindow 导出为 non-configurable，
  // Object.defineProperty 会抛出，此处隔离失败不影响后续注入。
  try {
    const OriginalBrowserWindow = electron.BrowserWindow;
    class PatchedBrowserWindow extends OriginalBrowserWindow {
      constructor(options = {}) {
        const wp = options.webPreferences = options.webPreferences || {};
        const args = wp.additionalArguments = wp.additionalArguments || [];
        if (wp.preload) {
          args.push('--original-preload=' + wp.preload);
        }
        wp.preload = PRELOAD_INJECT;
        super(options);
      }
    }
    Object.setPrototypeOf(PatchedBrowserWindow, OriginalBrowserWindow);
    Object.setPrototypeOf(PatchedBrowserWindow.prototype, OriginalBrowserWindow.prototype);
    Object.defineProperty(electron, 'BrowserWindow', {
      get: () => PatchedBrowserWindow,
      configurable: true,
    });
    console.log('[ElectroMonkey] BrowserWindow patched');
  } catch (_) {
    console.log('[ElectroMonkey] BrowserWindow non-configurable, using web-contents-created injection');
  }

  // web-contents-created：主注入路径（BrowserWindow 补丁失败时为唯一路径）
  electron.app.on('web-contents-created', (_event, webContents) => {
    webContents.on('dom-ready', () => {
      try {
        const url = webContents.getURL();
        if (!url || url === 'about:blank') return;

        const plugins = pluginManager.getMatchingPlugins(url);
        if (plugins.length > 0) {
          webContents.executeJavaScript(
            'window.__ELECTROMONKEY_LOGO__ = ' + JSON.stringify(PluginManager.LOGO_DATA_URI) + ';'
          ).catch(() => {});
        }
        for (const plugin of plugins) {
          const css = pluginManager.getPluginCSS(plugin);
          if (css) {
            webContents.insertCSS(css).catch(() => {});
          }
          const code = pluginManager.buildRendererCode(plugin);
          if (code) {
            webContents.executeJavaScript(code).catch(() => {});
          }
        }
      } catch (err) {
        console.error('[ElectroMonkey] web-contents injection error:', err.message);
      }
    });
  });

  // ── 3. IPC 通道 ────────────────────────────────────────────────────────────
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

  // ── 4. 加载主进程插件 ──────────────────────────────────────────────────────
  pluginManager.loadMainProcessPlugins();

  // ── 启动完成 ────────────────────────────────────────────────────────────────
  // NODE_OPTIONS 模式下原应用自动加载，无需手动 require
  console.log('[ElectroMonkey] Loader initialized (' + MODE + ' mode)');
  console.log('[ElectroMonkey] Project root:', PROJECT_ROOT);
  console.log('[ElectroMonkey] Plugin dirs:', PLUGINS_DIRS.join(', '));
  console.log('[ElectroMonkey] Plugins loaded:', pluginManager.plugins.length);

} catch (err) {
  // 安全网：如果 ElectroMonkey 初始化失败，不阻塞原应用启动
  console.error('[ElectroMonkey] FATAL: Failed to initialize —', err.message);
  console.error('[ElectroMonkey] The app will continue without plugins.');
}
