#!/usr/bin/env node
'use strict';

const asar = require('@electron/asar');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  let target = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      target = path.resolve(args[++i]);
    }
  }
  if (!target) {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    const relPath = pkg.config && pkg.config.targetApp;
    if (relPath) target = path.resolve(ROOT, relPath);
  }
  return target;
}

// WSL /mnt/d/... → D:/... (forward slashes for JS require() compatibility)
function toRequirePath(p) {
  const wslMatch = p.match(/^\/mnt\/([a-z])\/(.*)/);
  if (wslMatch) {
    return `${wslMatch[1].toUpperCase()}:/${wslMatch[2]}`;
  }
  return p.replace(/\\/g, '/');
}

async function main() {
  const targetResources = parseArgs();
  if (!targetResources) {
    console.error('错误：未指定目标路径。');
    console.error('用法: node scripts/deploy.js --target <resources目录路径>');
    process.exit(1);
  }

  const asarPath = path.join(targetResources, 'app.asar');
  const unpackedPath = path.join(targetResources, 'app.asar.unpacked');
  const origAsarPath = path.join(targetResources, 'app-original.asar');
  const origUnpackedPath = path.join(targetResources, 'app-original.asar.unpacked');

  if (!fs.existsSync(asarPath) && !fs.existsSync(origAsarPath)) {
    console.error('错误：未找到 app.asar:', asarPath);
    process.exit(1);
  }

  // 如果已部署过，先还原再重新部署（支持重复 deploy）
  if (fs.existsSync(origAsarPath)) {
    console.log('⚠  检测到已有部署，先还原...');
    if (fs.existsSync(asarPath)) fs.unlinkSync(asarPath);
    fs.renameSync(origAsarPath, asarPath);
    if (fs.existsSync(origUnpackedPath)) {
      if (fs.existsSync(unpackedPath)) fs.rmSync(unpackedPath, { recursive: true, force: true });
      fs.renameSync(origUnpackedPath, unpackedPath);
    }
  }

  const loaderPath = path.join(ROOT, 'src', 'patch', 'loader.js');
  if (!fs.existsSync(loaderPath)) {
    console.error('错误：未找到 loader.js:', loaderPath);
    process.exit(1);
  }

  console.log('📦 备份 app.asar → app-original.asar');
  fs.renameSync(asarPath, origAsarPath);
  if (fs.existsSync(unpackedPath)) {
    console.log('📦 备份 app.asar.unpacked/ → app-original.asar.unpacked/');
    fs.renameSync(unpackedPath, origUnpackedPath);
  }

  const winLoaderPath = toRequirePath(loaderPath);
  const bootstrapIndex = [
    "'use strict';",
    "process.env.ELECTROMONKEY_MODE = 'dev';",
    "var path = require('path');",
    "var origAsar = path.join(path.dirname(__dirname), 'app-original.asar');",
    "try { var _p = require(path.join(origAsar, 'package.json')), _a = require('electron').app; if (_p.productName) _a.name = _p.productName; else if (_p.name) _a.name = _p.name; if (_p.version) _a.setVersion(_p.version); } catch(e) {}",
    "try { require('" + winLoaderPath + "'); } catch(e) { console.error('[ElectroMonkey] Loader error:', e.message, e.stack); }",
    "try { require('electron').app.getAppPath = function() { return origAsar; }; } catch(e) {}",
    "require(origAsar);",
  ].join('\n');

  console.log('🔨 创建引导 asar...');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'electromonkey-'));
  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ main: 'index.js' }));
    fs.writeFileSync(path.join(tempDir, 'index.js'), bootstrapIndex);
    await asar.createPackage(tempDir, asarPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ ElectroMonkey 部署完成 (asar-patch 模式)');
  console.log('');
  console.log('  📦 原始备份: app-original.asar');
  console.log('  🔨 引导 asar: app.asar (极简引导)');
  console.log('');
  console.log('  🚀 使用: 正常启动目标应用即可');
  console.log('  📋 卸载: npm run undeploy');
  console.log('');
  console.log('  💡 原理: 用极简引导 asar 替换 app.asar，');
  console.log('     加载 ElectroMonkey 后再 require 原始应用。');
  console.log('     原始文件完整保存在 app-original.asar 中。');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('部署失败:', err.message);
  process.exit(1);
});
