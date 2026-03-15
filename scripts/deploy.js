#!/usr/bin/env node
'use strict';

/**
 * deploy.js — 部署补丁到目标 Electron 应用
 *
 * 用法：
 *   node scripts/deploy.js                    # 使用默认路径
 *   node scripts/deploy.js --target <path>    # 指定目标 resources 目录
 *
 * 操作：
 *   1. 复制 src/patch/* → <target>/app/
 *   2. 复制 plugins/*  → <target>/app/plugins/
 *   3. 不修改任何原始文件（app.asar 不受影响）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── 解析参数 ──────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  let target = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      target = path.resolve(args[++i]);
    }
  }

  // 默认：从 package.json config 读取
  if (!target) {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    const relPath = pkg.config && pkg.config.targetApp;
    if (relPath) {
      target = path.resolve(ROOT, relPath);
    }
  }

  return target;
}

// ── 递归复制目录 ──────────────────────────────────────────────────────────────
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
function main() {
  const targetResources = parseArgs();
  if (!targetResources) {
    console.error('错误：未指定目标路径。');
    console.error('用法: node scripts/deploy.js --target <resources目录路径>');
    process.exit(1);
  }

  const appAsarPath = path.join(targetResources, 'app.asar');
  const appDirPath = path.join(targetResources, 'app');
  const patchSrc = path.join(ROOT, 'src', 'patch');
  const pluginsSrc = path.join(ROOT, 'plugins');

  // 验证目标目录
  if (!fs.existsSync(appAsarPath)) {
    console.error('错误：未在目标路径找到 app.asar:', appAsarPath);
    console.error('请确认路径指向正确的 Electron 应用 resources 目录。');
    process.exit(1);
  }

  // 检查是否已部署
  if (fs.existsSync(appDirPath)) {
    console.log('⚠  发现已有部署，将覆盖:', appDirPath);
    fs.rmSync(appDirPath, { recursive: true, force: true });
  }

  // 复制补丁框架
  console.log('📦 复制补丁框架...');
  console.log('   从:', patchSrc);
  console.log('   到:', appDirPath);
  copyDirSync(patchSrc, appDirPath);

  // 复制插件
  const pluginsDest = path.join(appDirPath, 'plugins');
  if (fs.existsSync(pluginsSrc)) {
    console.log('🔌 复制插件...');
    console.log('   从:', pluginsSrc);
    console.log('   到:', pluginsDest);
    copyDirSync(pluginsSrc, pluginsDest);
  } else {
    console.log('ℹ  无插件目录，创建空目录');
    fs.mkdirSync(pluginsDest, { recursive: true });
  }

  // 统计
  const pluginCount = fs.existsSync(pluginsDest)
    ? fs.readdirSync(pluginsDest, { withFileTypes: true }).filter(e => e.isDirectory()).length
    : 0;

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  ✅ 部署完成！');
  console.log('  📁 补丁位置:', appDirPath);
  console.log('  🔌 已安装插件:', pluginCount);
  console.log('  📋 卸载命令: npm run undeploy');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('原理：Electron 优先加载 resources/app/ 目录，');
  console.log('我们的 loader.js 会先注入插件，再启动原始 app.asar。');
  console.log('原始文件未被修改，删除 app/ 目录即可恢复。');
}

main();
