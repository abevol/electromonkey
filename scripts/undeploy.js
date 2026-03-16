#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { resolveTargetApp } = require('./config');

const BACKUP_SUFFIX = '-em-backup';

function main() {
  const targetAsar = resolveTargetApp();
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
