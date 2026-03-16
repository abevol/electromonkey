#!/usr/bin/env node
'use strict';

const fs = require('fs');
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

function main() {
  const targetAsar = parseArgs();
  if (!targetAsar) {
    console.error('错误：未指定目标路径。');
    process.exit(1);
  }

  const dir = path.dirname(targetAsar);
  const asarName = path.basename(targetAsar);
  const baseName = asarName.replace(/\.asar$/, '');
  const backupName = baseName + BACKUP_SUFFIX + '.asar';

  const asarPath = targetAsar;
  const unpackedPath = path.join(dir, asarName + '.unpacked');
  const backupAsarPath = path.join(dir, backupName);
  const backupUnpackedPath = path.join(dir, backupName + '.unpacked');

  let restored = false;

  // 还原 asar-patch 部署
  if (fs.existsSync(backupAsarPath)) {
    if (fs.existsSync(asarPath)) fs.unlinkSync(asarPath);
    fs.renameSync(backupAsarPath, asarPath);
    console.log('🔄 已恢复 %s', asarName);

    if (fs.existsSync(backupUnpackedPath)) {
      if (fs.existsSync(unpackedPath)) fs.rmSync(unpackedPath, { recursive: true, force: true });
      fs.renameSync(backupUnpackedPath, unpackedPath);
      console.log('🔄 已恢复 %s.unpacked/', asarName);
    }
    restored = true;
  }

  if (!restored) {
    console.log('ℹ  未发现 ElectroMonkey 部署，无需卸载。');
    return;
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ ElectroMonkey 卸载完成');
  console.log('  💡 应用已恢复为原始状态');
  console.log('═══════════════════════════════════════════════════════');
}

main();
