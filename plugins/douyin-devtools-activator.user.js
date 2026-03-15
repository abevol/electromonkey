// ==UserScript==
// @name         抖音原生调试面板激活器
// @version      1.0.0
// @description  自动激活抖音客户端原生调试面板。开启后可按 Ctrl+Shift+I 打开调试面板。
// @author       ElectroMonkey
// @match        https://www.douyin.com/*
// @run-at       document-start
// @grant        GM_log
// ==/UserScript==

(function() {
    'use strict';

    GM_log('正在等待 TTE_ENV 初始化...');

    let attempts = 0;
    const maxAttempts = 50; // 50 * 200ms = 10s
    
    const timer = setInterval(() => {
        attempts++;
        if (window.TTE_ENV && window.TTE_ENV.bridge && typeof window.TTE_ENV.bridge.invoke === 'function') {
            clearInterval(timer);
            try {
                window.TTE_ENV.bridge.invoke("addDebugMenu", {});
                GM_notification('成功激活抖音客户端原生调试面板！\n现在可以按 Ctrl+Shift+I 打开调试面板。');
            } catch (err) {
                GM_log('触发原生调试面板失败:', err);
            }
        } else if (attempts >= maxAttempts) {
            clearInterval(timer);
            GM_log('等待 TTE_ENV 超时，当前页面可能不支持。');
        }
    }, 200);
})();