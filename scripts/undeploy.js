#!/usr/bin/env node
'use strict';

const fs = require('fs');
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

function main() {
  const targetResources = parseArgs();
  if (!targetResources) {
    console.error('错误：未指定目标路径。');
    process.exit(1);
  }

  const asarPath = path.join(targetResources, 'app.asar');
  const unpackedPath = path.join(targetResources, 'app.asar.unpacked');
  const origAsarPath = path.join(targetResources, 'app-original.asar');
  const origUnpackedPath = path.join(targetResources, 'app-original.asar.unpacked');

  let restored = false;

  // 还原 asar-patch 部署
  if (fs.existsSync(origAsarPath)) {
    if (fs.existsSync(asarPath)) fs.unlinkSync(asarPath);
    fs.renameSync(origAsarPath, asarPath);
    console.log('🔄 已恢复 app.asar');

    if (fs.existsSync(origUnpackedPath)) {
      if (fs.existsSync(unpackedPath)) fs.rmSync(unpackedPath, { recursive: true, force: true });
      fs.renameSync(origUnpackedPath, unpackedPath);
      console.log('🔄 已恢复 app.asar.unpacked/');
    }
    restored = true;
  }

  // 清理旧方案残留 (resources/app/)
  const oldAppDir = path.join(targetResources, 'app');
  if (fs.existsSync(oldAppDir) && fs.existsSync(path.join(oldAppDir, 'loader.js'))) {
    fs.rmSync(oldAppDir, { recursive: true, force: true });
    console.log('🗑  清理旧 resources/app/ 残留');
    restored = true;
  }

  // 清理旧 NODE_OPTIONS 方案残留
  const douyinDir = path.dirname(path.dirname(targetResources));
  for (const name of ['douyin-patched.cmd', 'douyin-patched.ps1']) {
    const p = path.join(douyinDir, name);
    if (fs.existsSync(p)) { fs.unlinkSync(p); console.log('🗑  清理旧启动器:', name); restored = true; }
  }

  if (!restored) {
    console.log('ℹ  未发现 ElectroMonkey 部署，无需卸载。');
    return;
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ ElectroMonkey 卸载完成');
  console.log('  🔄 应用已恢复为原始状态');
  console.log('  💡 直接运行 douyin.exe 即可启动原版应用');
  console.log('═══════════════════════════════════════════════════════');
}

main();
