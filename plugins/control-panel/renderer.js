    // ==ElectroMonkey==
    // @name        ElectroMonkey 控制面板
    // @version     1.0.0
    // @description ElectroMonkey 控制面板：状态浮标、插件管理、快捷键面板
    // @match       *://*.douyin.com/*
    // @run-at      document-idle
    // ==/ElectroMonkey==

    GM_log('插件已加载 ✓', '页面:', location.href);


    var LOGO_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAFhUlEQVR42q2WW2xU1xWGv33OmTkzZ2Z8Hceei8e2wInrFMeYSwBTHGMHROUEocgtkagqKtRGiVQlUqU+tX1pq4hIfUGtlJYqavJQtWpFaUjTCIEM5SYQYBtjZ4zBGF+G8d1jj+dyLrsPNlWbEpxe9tveS3ut9a+91v9v+GJLAKiPOfs/rB8pABh1e3j64Fme2X8af+2uVaPyv3oXSCmAkKf9u0tHb6dl0XsJSf0ryUIoWrU9EckaGXQqKEICNda6Rt9Nw7DylRU2oeqnFiCMosi1AqhPDtAPLS0a8/MpZzq9t28mEDZ7rylcPnEBb/7nLG2SMOL8l9XpVB+9pAKgrnuhcmOHLKlrkxDcpPxL6p3qf4Jg1We/Ayjo9a2ydN03lGDpd4Turcw4Go4/UOto4SryhRbO1Cj0y5VmOCcf236f3SsCSWz3QZdL+36sKtZYVl6GprmRjkVpQZbEnB+cDA8TScbGxq+CeNu5d/qEXAHrfB4CBVrUzt+/I253PfiVyzB+0v5ia0Vxkd8By04vm7z5cp8Il80SHzVsVdOdaKRcxKqqonfjd76OPxJkaewv0KLBCID8pwCdKvQ7ghHndtfou3WNzx6prvCZi5mc0Fyqks44Sk1FShxqG6KpJsWZmxXKbEpVhJAiOT5ur48VO47Lv20x6wuI5Yt/XXG+UjL1Ub1bWl73319SjjxVFf3Bm2+9YWker3bq5ClFc3vJLKd4MOVDqh5OXo7QddONnZthZmqee0ODyqHD3xLPbWywr9/o2WkasTvb9h4YGut/2wTECgXEdrbZlnLcV1RQHYuUO9u3b1Wmx0Zob26ipKSQ5Mw8F6728GDyIcs5nc11YbY21lMU8DE6nuT81dsUlJVz5co1ZyL5ULHSuSEEh0lcvCAMqFhufu1W8769weWuE9Z01taWZmdAWoQjIVQgVFZKQ/167o9OorsVigt8XO8bIrW0hCUlo2MJPLoPo6iQmlLDSm3t0LrfPz5aHP9wg5bVwq+woTm4YWODdePCn7VUeoGFhRTYeeYsL9Xffotgz8e887PfYAT95HI5bEtj/6sv0aN/ifTxH4OukM7kwKNTGAhpNdub7e7LNyvT8fPtiqPqMbyGc6u7V0wkp1AVBd0wUAWoXi/PtLXSfuwo1DWxPJHATk7CiwfZd/R7RBu3oLg1FCHwGgZIh6HhEeIDcSgsdixclZrimL1O/IYSeLbD9Hp0JZXOiWg0wt2hDCTv8cmxD/ikJMo6fZnnD7+KmcvSNXyL1354CbrPQHYRtaCUSDTCeCKBrywq3YZfcq9PdWEPiPLycl9Sqz0fadzSZCaG5VxqUYZDFUJzaQLHpjYYIBIuZ9+eXXgMg1zeBNviw4/Ocn8iychcBgDTNGViYkKGQhUiXxASk92XLtYnr+1emeTotgi28i5u9x6EcOlujeqaanngqy+I1w91YFoWjiPJ5/IoiiA5NUd8cJg9bTv46S9+y9nzV+X94RFhOxLAJLt0BnPhCLN3xjVAMHZlHOgg2PA0un+DrfD+6GjCkLmM5dHd2qef3qWndwC320UqlWYsMcm2rY0YXp3U1LT1cHJWc6z8gmplv2mb5gDTvYOPqEdbHWkBEqbFIDAoK7+yuGwt/eHXH5wMbP5yrd28o4miwoCaSi1h+LxUV0WkR3c7v3zvj/zpoy4t71hzMrNwwJ7uO7fiV4pVWpPi3wWoRYFzlqtmZ4OZlcc0Xd91YN8u9rY+T1VlyMrlTQbiw9qp05c497drIOQZd37mjfxMPA6bXHDd/izhfb4WCCDc/DX8DWcJbpFU7ZbEWiUlm/MEnvtYrdyxnzU0Qawhp44AFAU863c2pLMcBCdb6uV384OX4rb8RznEF8j6SWikePxvo1Nd6/bfAZx+UReoUZdSAAAAAElFTkSuQmCC';
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
    badge.innerHTML = '<img src="' + LOGO_DATA_URI + '" style="width:20px;height:20px;vertical-align:middle"> <span>ElectroMonkey</span>';
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
        '  \u003cspan class="dp-panel-title"\u003e\u003cimg src="' + LOGO_DATA_URI + '" class="dp-panel-icon"\u003e ElectroMonkey 控制面板\u003c/span\u003e',
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
