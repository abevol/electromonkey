'use strict';

/**
 * plugin-manager.js — 插件生命周期管理
 *
 * 职责：
 *   - 从 plugins/ 目录发现并加载插件（支持目录插件 + .user.js 单文件脚本）
 *   - 解析 Tampermonkey ==UserScript== 元数据头
 *   - URL 匹配（支持 Tampermonkey @match 语法）
 *   - 构建可注入的渲染器代码（包装 GM_* API）
 *   - 加载主进程钩子
 */

const fs = require('fs');
const path = require('path');

class PluginManager {
  constructor(pluginsDir) {
    this.pluginsDir = pluginsDir;
    this.plugins = [];
  }

  // ── 插件发现 ────────────────────────────────────────────────────────────────
  discoverPlugins() {
    this.plugins = [];

    if (!fs.existsSync(this.pluginsDir)) {
      console.log('[ElectroMonkey] Plugins directory not found:', this.pluginsDir);
      return;
    }

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const pluginDir = path.join(this.pluginsDir, entry.name);
      const manifestPath = path.join(pluginDir, 'manifest.json');

      if (!fs.existsSync(manifestPath)) {
        console.warn('[ElectroMonkey] Skipping (no manifest):', entry.name);
        continue;
      }

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        // 验证必需字段
        if (!manifest.name || !manifest.version) {
          console.warn('[ElectroMonkey] Skipping (invalid manifest):', entry.name);
          continue;
        }

        // 跳过禁用的插件
        if (manifest.enabled === false) {
          console.log('[ElectroMonkey] Skipping (disabled):', manifest.name);
          continue;
        }

        this.plugins.push({
          id: entry.name,
          dir: pluginDir,
          manifest: {
            name: manifest.name,
            version: manifest.version,
            description: manifest.description || '',
            author: manifest.author || '',
            match: Array.isArray(manifest.match) ? manifest.match : (manifest.match ? [manifest.match] : ['*://*/*']),
            exclude: Array.isArray(manifest.exclude) ? manifest.exclude : (manifest.exclude ? [manifest.exclude] : []),
            runAt: manifest.runAt || 'document-idle', // document-start | document-end | document-idle
            enabled: manifest.enabled !== false,
            renderer: manifest.renderer || null,
            main: manifest.main || null,
            css: manifest.css || null,
            grant: manifest.grant || [],
          },
        });

        console.log('[ElectroMonkey] Discovered plugin:', manifest.name, 'v' + manifest.version);
      } catch (err) {
        console.error('[ElectroMonkey] Failed to load manifest:', entry.name, err.message);
      }
    }

    // ── .user.js 单文件脚本扫描 ──
    for (const entry of entries) {
      if (entry.isDirectory() || !entry.name.endsWith('.user.js')) continue;

      const filePath = path.join(this.pluginsDir, entry.name);
      try {
        const source = fs.readFileSync(filePath, 'utf-8');
        const parsed = PluginManager.parseUserScriptHeader(source);
        if (!parsed || !parsed.meta.name) {
          console.warn('[ElectroMonkey] Skipping (invalid userscript header):', entry.name);
          continue;
        }

        const id = entry.name.replace(/\.user\.js$/, '');

        this.plugins.push({
          id,
          dir: this.pluginsDir,
          isUserScript: true,
          userScriptBody: parsed.body,
          manifest: {
            name: parsed.meta.name,
            version: parsed.meta.version,
            description: parsed.meta.description,
            author: parsed.meta.author,
            match: parsed.meta.match.length > 0 ? parsed.meta.match : ['*://*/*'],
            exclude: parsed.meta.exclude,
            runAt: parsed.meta.runAt || 'document-idle',
            enabled: true,
            renderer: entry.name,
            main: null,
            css: null,
            grant: parsed.meta.grant,
          },
        });

        console.log('[ElectroMonkey] Discovered userscript:', parsed.meta.name, 'v' + parsed.meta.version);
      } catch (err) {
        console.error('[ElectroMonkey] Failed to load userscript:', entry.name, err.message);
      }
    }
  }

  // ── UserScript 头解析 ────────────────────────────────────────────────────────
  //    解析 Tampermonkey ==UserScript== 元数据块，映射到内部 manifest 结构

  /**
   * 解析 .user.js 文件中的 ==UserScript== 元数据头
   * @param {string} source - 完整的 .user.js 文件内容
   * @returns {{ meta: object, body: string } | null}
   */
  static parseUserScriptHeader(source) {
    const headerMatch = source.match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/);
    if (!headerMatch) return null;

    const meta = {
      name: '',
      version: '1.0.0',
      description: '',
      author: '',
      match: [],
      include: [],
      exclude: [],
      grant: [],
      runAt: 'document-idle',
      require: [],
      resource: [],
      namespace: '',
      icon: '',
      noframes: false,
    };

    const lines = headerMatch[1].split('\n');
    for (const line of lines) {
      const m = line.match(/\/\/\s*@(\S+)\s+(.*)/);
      if (!m) {
        // 处理无值的标记（如 @noframes）
        const flagMatch = line.match(/\/\/\s*@(\S+)\s*$/);
        if (flagMatch && flagMatch[1] === 'noframes') {
          meta.noframes = true;
        }
        continue;
      }
      const key = m[1];
      const value = m[2].trim();

      switch (key) {
        case 'name':         meta.name = value; break;
        case 'version':      meta.version = value; break;
        case 'description':  meta.description = value; break;
        case 'author':       meta.author = value; break;
        case 'namespace':    meta.namespace = value; break;
        case 'icon':         meta.icon = value; break;
        case 'match':        meta.match.push(value); break;
        case 'include':      meta.include.push(value); break;
        case 'exclude':
        case 'exclude-match': meta.exclude.push(value); break;
        case 'grant':        meta.grant.push(value); break;
        case 'run-at':       meta.runAt = value; break;
        case 'require':      meta.require.push(value); break;
        case 'resource':     meta.resource.push(value); break;
      }
    }

    // @include 作为 @match 的兼容别名
    if (meta.match.length === 0 && meta.include.length > 0) {
      meta.match = meta.include;
    }

    // grant 中的 'none' 表示不需要任何 GM API
    if (meta.grant.length === 1 && meta.grant[0] === 'none') {
      meta.grant = [];
    }

    // 提取脚本体（==/ UserScript== 标记之后的代码）
    const endMarkerIndex = source.indexOf('==/UserScript==');
    const bodyStart = source.indexOf('\n', endMarkerIndex);
    const body = bodyStart !== -1 ? source.slice(bodyStart + 1) : '';

    return { meta, body };
  }

  // ── URL 匹配 ────────────────────────────────────────────────────────────────
  //    支持 Chrome 扩展 match pattern 语法：
  //    <scheme>://<host><path>
  //    *     在 scheme 位置匹配 http/https
  //    *.    在 host 位置匹配任意子域名
  //    *     在 path 位置匹配任意字符

  /**
   * 将 match pattern 转换为正则表达式
   * @param {string} pattern - 如 "*://*.douyin.com/*"
   * @returns {RegExp}
   */
  static matchPatternToRegex(pattern) {
    // 特殊模式：匹配所有
    if (pattern === '<all_urls>' || pattern === '*://*/*') {
      return /^https?:\/\/.*/;
    }

    // 分离 scheme, host, path
    const match = pattern.match(/^(\*|https?|file):\/\/(.+?)(\/.*)$/);
    if (!match) {
      // 如果不符合标准格式，尝试作为简单通配符处理
      const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      return new RegExp('^' + escaped + '$');
    }

    const [, scheme, host, pathPart] = match;

    // scheme
    let regexStr = '^';
    regexStr += scheme === '*' ? 'https?' : scheme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    regexStr += ':\\/\\/';

    // host
    if (host === '*') {
      regexStr += '[^/]*';
    } else if (host.startsWith('*.')) {
      // *.example.com 匹配 example.com 及其子域名
      const domain = host.slice(2).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regexStr += '([^/]+\\.)?' + domain;
    } else {
      regexStr += host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // path
    const pathRegex = pathPart
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    regexStr += pathRegex;

    regexStr += '$';
    return new RegExp(regexStr);
  }

  /**
   * 检查 URL 是否匹配插件规则
   */
  isUrlMatched(plugin, url) {
    // 检查排除规则
    for (const pattern of plugin.manifest.exclude) {
      try {
        if (PluginManager.matchPatternToRegex(pattern).test(url)) return false;
      } catch { /* skip invalid patterns */ }
    }

    // 检查匹配规则
    for (const pattern of plugin.manifest.match) {
      try {
        if (PluginManager.matchPatternToRegex(pattern).test(url)) return true;
      } catch { /* skip invalid patterns */ }
    }

    return false;
  }

  /**
   * 获取匹配指定 URL 的所有插件
   */
  getMatchingPlugins(url) {
    return this.plugins.filter(p => this.isUrlMatched(p, url));
  }

  // ── 渲染器代码构建 ──────────────────────────────────────────────────────────
  //    将插件代码包装在 IIFE 中，并注入 GM_* API

  /**
   * 读取插件的渲染器脚本
   */
  getPluginRendererSource(plugin) {
    if (plugin.isUserScript) {
      return plugin.userScriptBody || null;
    }

    const rendererFile = plugin.manifest.renderer;
    if (!rendererFile) return null;

    const filePath = path.join(plugin.dir, rendererFile);
    if (!fs.existsSync(filePath)) {
      console.warn('[ElectroMonkey] Renderer file not found:', filePath);
      return null;
    }

    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * 读取插件的 CSS
   */
  getPluginCSS(plugin) {
    const cssFile = plugin.manifest.css;
    if (!cssFile) return null;

    const filePath = path.join(plugin.dir, cssFile);
    if (!fs.existsSync(filePath)) return null;

    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * 构建完整的可注入渲染器代码
   * 包含 GM_* API 和插件代码，封装在 IIFE 中
   */
  buildRendererCode(plugin) {
    const source = this.getPluginRendererSource(plugin);
    if (!source) return null;

    const info = JSON.stringify({
      script: {
        name: plugin.manifest.name,
        version: plugin.manifest.version,
        description: plugin.manifest.description,
        author: plugin.manifest.author,
      },
      patchVersion: '1.0.0',
      plugins: this.plugins.map(p => ({
        name: p.manifest.name,
        version: p.manifest.version,
        description: p.manifest.description,
        enabled: p.manifest.enabled !== false,
        isUserScript: !!p.isUserScript,
      })),
    });

    const storagePrefix = JSON.stringify('__EM_' + plugin.id + '_');

    return `
(function() {
  'use strict';

    // ═══ ElectroMonkey GM_* API ═══
  var __pluginName = ${JSON.stringify(plugin.manifest.name)};
  var __storagePrefix = ${storagePrefix};

  var GM_info = ${info};

  function GM_getValue(key, defaultValue) {
    try {
      var raw = localStorage.getItem(__storagePrefix + key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch(e) { return defaultValue; }
  }

  function GM_setValue(key, value) {
    localStorage.setItem(__storagePrefix + key, JSON.stringify(value));
  }

  function GM_deleteValue(key) {
    localStorage.removeItem(__storagePrefix + key);
  }

  function GM_listValues() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.startsWith(__storagePrefix)) {
        keys.push(k.slice(__storagePrefix.length));
      }
    }
    return keys;
  }

  function GM_addStyle(css) {
    var style = document.createElement('style');
    style.setAttribute('data-electromonkey', __pluginName);
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
    return style;
  }

  function GM_log() {
    var args = ['[' + __pluginName + ']'];
    for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
    console.log.apply(console, args);
  }

  function GM_notification(details) {
    if (typeof details === 'string') details = { text: details };
    var n = new Notification(details.title || __pluginName, {
      body: details.text || '',
      icon: details.image || undefined,
    });
    if (details.onclick) n.onclick = details.onclick;
    if (details.timeout) setTimeout(function() { n.close(); }, details.timeout);
    return n;
  }

  function GM_setClipboard(text) {
    navigator.clipboard.writeText(text).catch(function() {
      // Fallback
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    });
  }

  function GM_xmlhttpRequest(details) {
    var controller = new AbortController();
    fetch(details.url, {
      method: details.method || 'GET',
      headers: details.headers || {},
      body: details.data || undefined,
      signal: controller.signal,
    }).then(function(resp) {
      return resp.text().then(function(text) {
        var result = {
          status: resp.status,
          statusText: resp.statusText,
          responseText: text,
          finalUrl: resp.url,
        };
        if (details.onload) details.onload(result);
      });
    }).catch(function(err) {
      if (details.onerror) details.onerror({ error: err.message });
    });
    return { abort: function() { controller.abort(); } };
  }

  // GM 对象聚合
  var GM = {
    info: GM_info,
    getValue: GM_getValue,
    setValue: GM_setValue,
    deleteValue: GM_deleteValue,
    listValues: GM_listValues,
    addStyle: GM_addStyle,
    log: GM_log,
    notification: GM_notification,
    setClipboard: GM_setClipboard,
    xmlHttpRequest: GM_xmlhttpRequest,
  };

  // ═══ 插件代码 ═══
  try {
${source}
  } catch(e) {
    console.error('[ElectroMonkey] Plugin error (' + __pluginName + '):', e);
  }
})();
`;
  }

  // ── 主进程插件 ──────────────────────────────────────────────────────────────

  /**
   * 加载所有声明了 main 入口的插件
   */
  loadMainProcessPlugins() {
    for (const plugin of this.plugins) {
      if (!plugin.manifest.main) continue;

      const mainPath = path.join(plugin.dir, plugin.manifest.main);
      if (!fs.existsSync(mainPath)) {
        console.warn('[ElectroMonkey] Main script not found:', mainPath);
        continue;
      }

      try {
        const mainModule = require(mainPath);
        if (typeof mainModule.activate === 'function') {
          mainModule.activate({
            electron: require('electron'),
            pluginDir: plugin.dir,
            manifest: plugin.manifest,
          });
        }
        console.log('[ElectroMonkey] Loaded main plugin:', plugin.manifest.name);
      } catch (err) {
        console.error('[ElectroMonkey] Failed to load main plugin:', plugin.manifest.name, err.message);
      }
    }
  }
}

module.exports = PluginManager;
