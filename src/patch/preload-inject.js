'use strict';

/**
 * preload-inject.js — 渲染器预加载注入
 *
 * 本脚本被设置为每个 BrowserWindow 的 preload。
 * 执行顺序：
 *   1. 链式加载原始 preload（从 additionalArguments 获取路径）
 *   2. 通过 IPC 获取匹配当前 URL 的插件
 *   3. 根据 @run-at 时机注入插件代码和样式
 */

const { ipcRenderer } = require('electron');
const path = require('path');

// ── 1. 链式加载原始 preload ──────────────────────────────────────────────────
// BrowserWindow 的原始 preload 路径通过 additionalArguments 传入
const originalPreloadArg = process.argv.find(arg => arg.startsWith('--original-preload='));
if (originalPreloadArg) {
  const originalPreload = originalPreloadArg.split('=').slice(1).join('=');
  try {
    require(originalPreload);
  } catch (err) {
    console.error('[ElectroMonkey] Failed to load original preload:', err.message);
  }
}

// ── 2. 注入辅助函数 ──────────────────────────────────────────────────────────

/**
 * 在页面主世界中执行 JS 代码（绕过 contextIsolation）
 */
function injectScript(code) {
  const script = document.createElement('script');
  script.textContent = code;
  // 立即执行并移除，不留痕迹
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

/**
 * 注入 CSS 样式
 */
function injectCSS(css, pluginName) {
  const style = document.createElement('style');
  style.setAttribute('data-electromonkey', pluginName || 'unknown');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
}

// ── 3. 按时机注入插件 ────────────────────────────────────────────────────────

async function injectPlugins() {
  try {
    const url = location.href;
    if (!url || url === 'about:blank') return;

    const plugins = await ipcRenderer.invoke('electromonkey:get-plugins', url);
    if (!plugins || plugins.length === 0) return;

    // 分组：按 run-at 时机
    const startPlugins = [];
    const endPlugins = [];
    const idlePlugins = [];

    for (const plugin of plugins) {
      switch (plugin.runAt) {
        case 'document-start':
          startPlugins.push(plugin);
          break;
        case 'document-end':
          endPlugins.push(plugin);
          break;
        default:
          idlePlugins.push(plugin);
      }
    }

    // document-start：立即注入
    for (const p of startPlugins) {
      if (p.css) injectCSS(p.css, p.name);
      if (p.rendererCode) injectScript(p.rendererCode);
    }

    // document-end：DOMContentLoaded 时注入
    if (endPlugins.length > 0) {
      const injectEnd = () => {
        for (const p of endPlugins) {
          if (p.css) injectCSS(p.css, p.name);
          if (p.rendererCode) injectScript(p.rendererCode);
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectEnd, { once: true });
      } else {
        injectEnd();
      }
    }

    // document-idle：load 事件后或 DOMContentLoaded + requestIdleCallback
    if (idlePlugins.length > 0) {
      const injectIdle = () => {
        const doInject = () => {
          for (const p of idlePlugins) {
            if (p.css) injectCSS(p.css, p.name);
            if (p.rendererCode) injectScript(p.rendererCode);
          }
        };
        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(doInject);
        } else {
          setTimeout(doInject, 0);
        }
      };

      if (document.readyState === 'complete') {
        injectIdle();
      } else {
        window.addEventListener('load', injectIdle, { once: true });
      }
    }

    console.log('[ElectroMonkey] Preload injected', plugins.length, 'plugin(s) for', url);
  } catch (err) {
    console.error('[ElectroMonkey] Preload injection error:', err.message);
  }
}

// 启动注入流程
injectPlugins();
