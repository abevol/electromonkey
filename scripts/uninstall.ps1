#Requires -Version 5.1
<#
.SYNOPSIS
    ElectroMonkey 卸载脚本
.DESCRIPTION
    恢复目标 Electron 应用的原始 app.asar，并清理 ElectroMonkey 运行时文件。
    插件目录默认保留，如需完全删除请手动删除 %LOCALAPPDATA%\ElectroMonkey。
.PARAMETER TargetPath
    目标 Electron 应用的 resources 目录路径（包含 app-original.asar 的目录）。
.EXAMPLE
    .\uninstall.ps1 "C:\Users\你的用户名\AppData\Local\SomeApp\1.0.0\resources"
#>
param(
    [Parameter(Position = 0)]
    [string]$TargetPath
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Step  { param([string]$Msg) Write-Host $Msg -ForegroundColor Cyan }
function Write-Ok    { param([string]$Msg) Write-Host "   $Msg" -ForegroundColor Green }
function Write-Warn  { param([string]$Msg) Write-Host "   $Msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$Msg) Write-Host $Msg -ForegroundColor Red }

Write-Host ""
Write-Host "  ElectroMonkey 卸载程序" -ForegroundColor White
Write-Host "  ─────────────────────" -ForegroundColor DarkGray
Write-Host ""

$InstallDir = Join-Path $env:LOCALAPPDATA "ElectroMonkey"

# ── 验证目标路径 ──

if (-not $TargetPath) {
    Write-Host "路径应指向目标 Electron 应用的 resources 目录（包含 app-original.asar 的目录）。" -ForegroundColor Gray
    Write-Host ""
    $TargetPath = Read-Host "请输入目标路径"
    $TargetPath = $TargetPath.Trim('"', "'", ' ')
    if (-not $TargetPath) {
        Write-Err "错误：未指定目标路径。"
        Write-Host ""
        Read-Host "按 Enter 键退出"
        exit 1
    }
}

$resolved = Resolve-Path -LiteralPath $TargetPath -ErrorAction SilentlyContinue
if ($resolved) { $TargetPath = $resolved.Path }
if (-not $resolved) {
    Write-Err "错误：指定的路径不存在: $TargetPath"
    Read-Host "按 Enter 键退出"
    exit 1
}

$OrigAsarPath = Join-Path $TargetPath "app-original.asar"

if (-not (Test-Path $OrigAsarPath)) {
    Write-Err "错误：未找到 app-original.asar: $OrigAsarPath"
    Write-Host "未检测到 ElectroMonkey 安装。" -ForegroundColor Gray
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host "找到目标: $TargetPath"
Write-Host ""

# ── [1/2] 恢复原始 asar ──

Write-Step "[1/2] 恢复原始应用..."

$AsarPath = Join-Path $TargetPath "app.asar"
$UnpackedPath = Join-Path $TargetPath "app.asar.unpacked"
$OrigUnpackedPath = Join-Path $TargetPath "app-original.asar.unpacked"

if (Test-Path $AsarPath) { Remove-Item $AsarPath -Force }
Move-Item $OrigAsarPath $AsarPath -Force
Write-Ok "app.asar 已恢复"

if (Test-Path $OrigUnpackedPath) {
    if (Test-Path $UnpackedPath) { Remove-Item $UnpackedPath -Recurse -Force }
    Move-Item $OrigUnpackedPath $UnpackedPath -Force
    Write-Ok "app.asar.unpacked 已恢复"
}

# ── [2/2] 清理运行时 ──

Write-Step "[2/2] 清理运行时文件..."

$RuntimeDir = Join-Path $InstallDir "runtime"
$AssetsDir = Join-Path $InstallDir "assets"

if (Test-Path $RuntimeDir) {
    Remove-Item $RuntimeDir -Recurse -Force
    if (Test-Path $AssetsDir) { Remove-Item $AssetsDir -Recurse -Force }
    Write-Ok "运行时文件已清理"
    Write-Host ""
    $PluginsDir = Join-Path $InstallDir "plugins"
    Write-Warn "注意: 插件目录已保留: $PluginsDir"
    Write-Warn "如需完全删除，请手动删除: $InstallDir"
} else {
    Write-Warn "未找到运行时文件"
}

# ── 完成 ──

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ElectroMonkey 卸载完成" -ForegroundColor Green
Write-Host "  应用已恢复为原始状态" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Read-Host "按 Enter 键退出"
