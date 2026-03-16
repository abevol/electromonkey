#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * 解析 .env 文件，返回键值对对象。
 * 仅处理 KEY=VALUE 格式，忽略空行和 # 注释行。
 */
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};

  const result = {};
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // 去除可选的引号包裹
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/**
 * 解析目标 asar 路径。
 * 优先级：--target CLI 参数 > .env 中的 TARGET_APP
 */
function resolveTargetApp() {
  // 1. --target 命令行参数
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      return path.resolve(args[++i]);
    }
  }

  // 2. .env 中的 TARGET_APP
  const env = loadEnv();
  if (env.TARGET_APP) {
    return path.resolve(ROOT, env.TARGET_APP);
  }

  return null;
}

module.exports = { ROOT, loadEnv, resolveTargetApp };
