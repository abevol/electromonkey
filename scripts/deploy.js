#!/usr/bin/env node
'use strict';

const asar = require('@electron/asar');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const BACKUP_SUFFIX = '-em-backup';

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

/**
 * 从目标 asar 文件路径推导备份相关路径。
 * 例：app.asar → app-em-backup.asar, app.asar.unpacked → app-em-backup.asar.unpacked
 */
function deriveBackupPaths(asarPath) {
  const dir = path.dirname(asarPath);
  const asarName = path.basename(asarPath);
  const baseName = asarName.replace(/\.asar$/, '');
  const backupName = baseName + BACKUP_SUFFIX + '.asar';
  return {
    dir,
    asarPath,
    unpackedPath: path.join(dir, asarName + '.unpacked'),
    backupAsarPath: path.join(dir, backupName),
    backupUnpackedPath: path.join(dir, backupName + '.unpacked'),
    asarName,
    backupName,
  };
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
  const targetAsar = parseArgs();
  if (!targetAsar) {
    console.error('错误：未指定目标路径。');
    console.error('用法: node scripts/deploy.js --target <asar文件路径>');
    process.exit(1);
  }

  const paths = deriveBackupPaths(targetAsar);

  if (!fs.existsSync(paths.asarPath) && !fs.existsSync(paths.backupAsarPath)) {
    console.error('错误：未找到目标 asar:', paths.asarPath);
    process.exit(1);
  }

  // 如果已部署过，先还原再重新部署（支持重复 deploy）
  if (fs.existsSync(paths.backupAsarPath)) {
    console.log('⚠  检测到已有部署，先还原...');
    if (fs.existsSync(paths.asarPath)) fs.unlinkSync(paths.asarPath);
    fs.renameSync(paths.backupAsarPath, paths.asarPath);
    if (fs.existsSync(paths.backupUnpackedPath)) {
      if (fs.existsSync(paths.unpackedPath)) fs.rmSync(paths.unpackedPath, { recursive: true, force: true });
      fs.renameSync(paths.backupUnpackedPath, paths.unpackedPath);
    }
  }

  const loaderPath = path.join(ROOT, 'src', 'patch', 'loader.js');
  if (!fs.existsSync(loaderPath)) {
    console.error('错误：未找到 loader.js:', loaderPath);
    process.exit(1);
  }

  console.log('📦 备份 %s → %s', paths.asarName, paths.backupName);
  fs.renameSync(paths.asarPath, paths.backupAsarPath);
  if (fs.existsSync(paths.unpackedPath)) {
    console.log('📦 备份 %s.unpacked/ → %s.unpacked/', paths.asarName, paths.backupName);
    fs.renameSync(paths.unpackedPath, paths.backupUnpackedPath);
  }

  const winLoaderPath = toRequirePath(loaderPath);
  const bootstrapIndex = [
    "'use strict';",
    "process.env.ELECTROMONKEY_MODE = 'dev';",
    "var path = require('path');",
    "var fs = require('fs');",
    "var _dir = path.dirname(__dirname);",
    "var _backupFile = fs.readdirSync(_dir).find(function(f) { return f.endsWith('-em-backup.asar') && !f.endsWith('.unpacked'); });",
    "if (!_backupFile) { console.error('[ElectroMonkey] Backup asar not found in', _dir); process.exit(1); }",
    "var origAsar = path.join(_dir, _backupFile);",
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
    await asar.createPackage(tempDir, paths.asarPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ ElectroMonkey 部署完成 (asar-patch 模式)');
  console.log('');
  console.log('  📦 原始备份: %s', paths.backupName);
  console.log('  🔨 引导 asar: %s (极简引导)', paths.asarName);
  console.log('');
  console.log('  🚀 使用: 正常启动目标应用即可');
  console.log('  📋 卸载: npm run undeploy');
  console.log('');
  console.log('  💡 原理: 用极简引导 asar 替换 %s，', paths.asarName);
  console.log('     加载 ElectroMonkey 后再 require 原始应用。');
  console.log('     原始文件完整保存在 %s 中。', paths.backupName);
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('部署失败:', err.message);
  process.exit(1);
});
