#!/usr/bin/env node
'use strict';

/**
 * undeploy.js — 从目标 Electron 应用移除补丁
 *
 * 用法：
 *   node scripts/undeploy.js                    # 使用默认路径
 *   node scripts/undeploy.js --target <path>    # 指定目标 resources 目录
 *
 * 操作：
 *   仅删除 <target>/app/ 目录（我们创建的）
 *   app.asar 和其他原始文件不受影响
 */

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
    if (relPath) {
      target = path.resolve(ROOT, relPath);
    }
  }

  return target;
}

function main() {
  const targetResources = parseArgs();
  if (!targetResources) {
    console.error('错误：未指定目标路径。');
    process.exit(1);
  }

  const appDirPath = path.join(targetResources, 'app');

  if (!fs.existsSync(appDirPath)) {
    console.log('ℹ  未发现已部署的补丁:', appDirPath);
    console.log('   无需卸载。');
    return;
  }

  // 安全检查：确认这是我们的补丁目录
  const loaderPath = path.join(appDirPath, 'loader.js');
  const patchPkg = path.join(appDirPath, 'package.json');

  if (!fs.existsSync(loaderPath)) {
    console.error('⚠  警告：app/ 目录不包含 loader.js，可能不是 ElectroMonkey 创建的。');
    console.error('   为安全起见，拒绝自动删除。请手动确认后删除:', appDirPath);
    process.exit(1);
  }

  // 二次确认：检查 package.json 中的 main 字段
  if (fs.existsSync(patchPkg)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(patchPkg, 'utf-8'));
      if (pkg.main !== 'loader.js') {
        console.error('⚠  警告：package.json 的 main 不是 loader.js，可能不是 ElectroMonkey。');
        process.exit(1);
      }
    } catch { /* proceed */ }
  }

  // 删除
  console.log('🗑  移除补丁目录:', appDirPath);
  fs.rmSync(appDirPath, { recursive: true, force: true });

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  ✅ 卸载完成！');
  console.log('  📁 已移除:', appDirPath);
  console.log('  🔄 应用已恢复为原始状态');
  console.log('═══════════════════════════════════════════');
}

main();
