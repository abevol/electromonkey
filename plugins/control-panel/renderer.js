    // ==ElectroMonkey==
    // @name        ElectroMonkey 控制面板
    // @version     1.0.0
    // @description ElectroMonkey 控制面板：状态浮标、插件管理、快捷键面板
    // @match       *://*.douyin.com/*
    // @run-at      document-idle
    // ==/ElectroMonkey==

    GM_log('插件已加载 ✓', '页面:', location.href);

    // ── 1. 控制台 Banner ──────────────────────────────────────────────────────
    console.log(
      '%c ElectroMonkey %c v' + GM_info.patchVersion + ' %c 插件系统已激活 ',
      'background:#fe2c55;color:#fff;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold',
      'background:#25f4ee;color:#000;padding:4px 8px;font-weight:bold',
      'background:#333;color:#fff;padding:4px 8px;border-radius:0 4px 4px 0'
    );

    // ── 2. 状态浮标 ──────────────────────────────────────────────────────────
    var badge = document.createElement('div');
    badge.id = 'em-badge';
    badge.innerHTML = '<img src="' + window.__ELECTROMONKEY_LOGO__ + '" style="width:20px;height:20px;vertical-align:middle"> <span>ElectroMonkey</span>';
    document.body.appendChild(badge);

    // 点击浮标切换面板
    badge.addEventListener('click', function() {
      togglePanel();
    });

    // ── 3. 插件管理面板 ──────────────────────────────────────────────────────
    var panelVisible = GM_getValue('panelVisible', false);

    function buildPluginListHTML() {
      var list = GM_info.plugins || [GM_info.script];
      var html = '';
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var icon = p.enabled !== false ? '\u2705' : '\u274C';
        var tag = p.isUserScript ? ' \u003cspan class="dp-plugin-tag"\u003e.user.js\u003c/span\u003e' : '';
        html += '\u003cdiv class="dp-plugin-item"\u003e';
        html += '  \u003cdiv class="dp-plugin-name"\u003e' + icon + ' ' + p.name + tag + '\u003c/div\u003e';
        html += '  \u003cdiv class="dp-plugin-desc"\u003e' + (p.description || '') + '\u003c/div\u003e';
        html += '  \u003cdiv class="dp-plugin-version"\u003ev' + p.version + '\u003c/div\u003e';
        html += '\u003c/div\u003e';
      }
      return html;
    }

    function createPanel() {
      var panel = document.createElement('div');
      panel.id = 'em-panel';
      panel.innerHTML = [
        '\u003cdiv class="dp-panel-header"\u003e',
        '  \u003cspan class="dp-panel-title"\u003e\u003cimg src="' + window.__ELECTROMONKEY_LOGO__ + '" class="dp-panel-icon"\u003e ElectroMonkey 控制面板\u003c/span\u003e',
        '  \u003cbutton class="dp-panel-close"\u003e\u2715\u003c/button\u003e',
        '\u003c/div\u003e',
        '\u003cdiv class="dp-panel-body"\u003e',
        '  \u003cdiv class="dp-section"\u003e',
        '    \u003cdiv class="dp-section-title"\u003e框架信息\u003c/div\u003e',
        '    \u003cdiv class="dp-info-row"\u003e\u003cspan\u003e版本\u003c/span\u003e\u003cspan\u003ev' + GM_info.patchVersion + '\u003c/span\u003e\u003c/div\u003e',
        '    \u003cdiv class="dp-info-row"\u003e\u003cspan\u003e当前页面\u003c/span\u003e\u003cspan class="dp-url"\u003e' + location.hostname + location.pathname.slice(0, 30) + '\u003c/span\u003e\u003c/div\u003e',
        '    \u003cdiv class="dp-info-row"\u003e\u003cspan\u003e插件总数\u003c/span\u003e\u003cspan\u003e' + (GM_info.plugins ? GM_info.plugins.length : 1) + '\u003c/span\u003e\u003c/div\u003e',
        '  \u003c/div\u003e',
        '  \u003cdiv class="dp-section"\u003e',
        '    \u003cdiv class="dp-section-title"\u003e快捷键\u003c/div\u003e',
        '    \u003cdiv class="dp-info-row"\u003e\u003cspan\u003eCtrl+Shift+P\u003c/span\u003e\u003cspan\u003e切换面板\u003c/span\u003e\u003c/div\u003e',
        '    \u003cdiv class="dp-info-row"\u003e\u003cspan\u003eCtrl+Shift+D\u003c/span\u003e\u003cspan\u003e切换浮标\u003c/span\u003e\u003c/div\u003e',
        '  \u003c/div\u003e',
        '  \u003cdiv class="dp-section"\u003e',
        '    \u003cdiv class="dp-section-title"\u003e已加载插件\u003c/div\u003e',
             buildPluginListHTML(),
        '  \u003c/div\u003e',
        '  \u003cdiv class="dp-section"\u003e',
        '    \u003cdiv class="dp-section-title"\u003e存储测试\u003c/div\u003e',
        '    \u003cdiv class="dp-info-row"\u003e\u003cspan\u003e面板打开次数\u003c/span\u003e\u003cspan id="dp-open-count"\u003e0\u003c/span\u003e\u003c/div\u003e',
        '  \u003c/div\u003e',
        '\u003c/div\u003e',
      ].join('\n');
      document.body.appendChild(panel);

      // 关闭按钮
      panel.querySelector('.dp-panel-close').addEventListener('click', function(e) {
        e.stopPropagation();
        togglePanel(false);
      });

      return panel;
    }

    function togglePanel(force) {
      panelVisible = force !== undefined ? force : !panelVisible;
      GM_setValue('panelVisible', panelVisible);

      var panel = document.getElementById('em-panel');
      if (!panel) panel = createPanel();
      panel.style.display = panelVisible ? 'flex' : 'none';

      if (panelVisible) {
        // 更新打开次数（演示 GM_setValue/GM_getValue）
        var count = GM_getValue('openCount', 0) + 1;
        GM_setValue('openCount', count);
        var el = document.getElementById('dp-open-count');
        if (el) el.textContent = count;
      }
    }

    // 初始面板状态
    if (panelVisible) {
      setTimeout(function() { togglePanel(true); }, 500);
    }

    // ── 4. 快捷键 ────────────────────────────────────────────────────────────
    document.addEventListener('keydown', function(e) {
      // Ctrl+Shift+P — 切换面板
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyP') {
        e.preventDefault();
        e.stopPropagation();
        togglePanel();
      }
      // Ctrl+Shift+D — 切换浮标
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        e.stopPropagation();
        var b = document.getElementById('em-badge');
        if (b) b.style.display = b.style.display === 'none' ? 'flex' : 'none';
      }
    });

    GM_log('控制面板初始化完成');
