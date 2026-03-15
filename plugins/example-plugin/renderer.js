    // ==ElectroMonkey==
    // @name        ElectroMonkey 示例插件
    // @version     1.0.0
    // @description 展示补丁框架能力：状态浮标、控制台日志、插件面板
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
    badge.innerHTML = '\uD83D\uDC35 <span>ElectroMonkey</span>';
    document.body.appendChild(badge);

    // 点击浮标切换面板
    badge.addEventListener('click', function() {
      togglePanel();
    });

    // ── 3. 插件管理面板 ──────────────────────────────────────────────────────
    var panelVisible = GM_getValue('panelVisible', false);

    function createPanel() {
      var panel = document.createElement('div');
      panel.id = 'em-panel';
      panel.innerHTML = [
        '<div class="dp-panel-header">',
        '  <span class="dp-panel-title">\uD83D\uDC35 ElectroMonkey 控制面板</span>',
        '  <button class="dp-panel-close">\u2715</button>',
        '</div>',
        '<div class="dp-panel-body">',
        '  <div class="dp-section">',
        '    <div class="dp-section-title">框架信息</div>',
        '    <div class="dp-info-row"><span>版本</span><span>v' + GM_info.patchVersion + '</span></div>',
        '    <div class="dp-info-row"><span>当前页面</span><span class="dp-url">' + location.hostname + location.pathname.slice(0, 30) + '</span></div>',
        '  </div>',
        '  <div class="dp-section">',
        '    <div class="dp-section-title">已加载插件</div>',
        '    <div class="dp-plugin-item">',
        '      <div class="dp-plugin-name">\u2705 ' + GM_info.script.name + '</div>',
        '      <div class="dp-plugin-desc">' + GM_info.script.description + '</div>',
        '      <div class="dp-plugin-version">v' + GM_info.script.version + '</div>',
        '    </div>',
        '  </div>',
        '  <div class="dp-section">',
        '    <div class="dp-section-title">快捷键</div>',
        '    <div class="dp-info-row"><span>Ctrl+Shift+P</span><span>切换面板</span></div>',
        '    <div class="dp-info-row"><span>Ctrl+Shift+D</span><span>切换浮标</span></div>',
        '  </div>',
        '  <div class="dp-section">',
        '    <div class="dp-section-title">存储测试</div>',
        '    <div class="dp-info-row"><span>面板打开次数</span><span id="dp-open-count">0</span></div>',
        '  </div>',
        '</div>',
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

    GM_log('示例插件初始化完成');
