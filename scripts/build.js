#!/usr/bin/env node
'use strict';

const asar = require('@electron/asar');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

async function main() {
  const distDir = path.join(ROOT, 'dist');
  const contentDir = path.join(distDir, 'electromonkey');

  if (fs.existsSync(distDir)) {
    try {
      fs.rmSync(distDir, { recursive: true, force: true });
    } catch (e) {
      // Directory may be locked by Explorer/indexer — clear contents instead
      const clearDir = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, entry.name);
          try {
            if (entry.isDirectory()) { fs.rmSync(p, { recursive: true, force: true }); }
            else { fs.unlinkSync(p); }
          } catch (_) { clearDir(p); }
        }
      };
      clearDir(contentDir);
    }
  }

  fs.mkdirSync(path.join(contentDir, 'runtime'), { recursive: true });
  fs.mkdirSync(path.join(contentDir, 'plugins'), { recursive: true });
  fs.mkdirSync(path.join(contentDir, 'assets'), { recursive: true });

  for (const file of ['loader.js', 'plugin-manager.js', 'preload-inject.js', 'package.json']) {
    fs.copyFileSync(
      path.join(ROOT, 'src', 'patch', file),
      path.join(contentDir, 'runtime', file)
    );
  }

  copyDirSync(path.join(ROOT, 'plugins'), path.join(contentDir, 'plugins'));
  copyDirSync(path.join(ROOT, 'assets'), path.join(contentDir, 'assets'));

  console.log('Building bootstrap.asar...');
  const bootstrapIndex = [
    "'use strict';",
    "process.env.ELECTROMONKEY_MODE = 'release';",
    "var path = require('path');",
    "var fs = require('fs');",
    "process.env.ELECTROMONKEY_ROOT = path.join(process.env.LOCALAPPDATA, 'ElectroMonkey');",
    "var loaderPath = path.join(process.env.ELECTROMONKEY_ROOT, 'runtime', 'loader.js');",
    "var _dir = path.dirname(__dirname);",
    "var _backupFile = fs.readdirSync(_dir).find(function(f) { return f.endsWith('-em-backup.asar') && !f.endsWith('.unpacked'); });",
    "if (!_backupFile) { console.error('[ElectroMonkey] Backup asar not found in', _dir); process.exit(1); }",
    "var origAsar = path.join(_dir, _backupFile);",
    "try { var _p = require(path.join(origAsar, 'package.json')), _a = require('electron').app; if (_p.productName) _a.name = _p.productName; else if (_p.name) _a.name = _p.name; if (_p.version) _a.setVersion(_p.version); } catch(e) {}",
    "try { require(loaderPath); } catch(e) { console.error('[ElectroMonkey] Loader error:', e.message, e.stack); }",
    "try { require('electron').app.getAppPath = function() { return origAsar; }; } catch(e) {}",
    "require(origAsar);",
  ].join('\n');

  const bootstrapPkg = JSON.stringify({ main: 'index.js' });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'electromonkey-build-'));
  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), bootstrapPkg);
    fs.writeFileSync(path.join(tempDir, 'index.js'), bootstrapIndex);
    await asar.createPackage(tempDir, path.join(contentDir, 'bootstrap.asar'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  fs.copyFileSync(
    path.join(ROOT, 'scripts', 'install.ps1'),
    path.join(contentDir, 'install.ps1')
  );
  fs.copyFileSync(
    path.join(ROOT, 'scripts', 'uninstall.ps1'),
    path.join(contentDir, 'uninstall.ps1')
  );

  console.log('');
  console.log('Build complete: dist/electromonkey/');
  console.log('  bootstrap.asar  - release mode bootstrap');
  console.log('  runtime/        - runtime modules');
  console.log('  plugins/        - built-in plugins');
  console.log('  install.ps1     - user install script');
  console.log('  uninstall.ps1   - user uninstall script');
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

main().catch(err => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
