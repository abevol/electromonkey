// ==UserScript==
// @name        页面计时器
// @version     1.0.0
// @description 在页面左下角显示当前页面停留时间（演示 .user.js 格式）
// @author      ElectroMonkey
// @match       *://*/*
// @match       *://localhost/*
// @run-at      document-idle
// @grant       GM_addStyle
// @grant       GM_log
// ==/UserScript==

GM_log('Userscript loaded', location.href);

var seconds = 0;
var timer = document.createElement('div');
timer.id = 'em-userscript-timer';
document.body.appendChild(timer);

GM_addStyle([
  '#em-userscript-timer {',
  '  position: fixed;',
  '  bottom: 40px;',
  '  left: 20px;',
  '  z-index: 999999;',
  '  padding: 6px 14px;',
  '  background: rgba(0,0,0,0.7);',
  '  color: #25f4ee;',
  '  font-size: 13px;',
  '  font-family: "SF Mono", "Cascadia Code", "Consolas", monospace;',
  '  border-radius: 8px;',
  '  pointer-events: none;',
  '  user-select: none;',
  '}',
].join('\n'));

function update() {
  seconds++;
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  timer.textContent = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

update();
setInterval(update, 1000);
