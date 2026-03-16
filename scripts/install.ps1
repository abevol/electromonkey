#Requires -Version 5.1
<#
.SYNOPSIS
    ElectroMonkey 安装脚本
.DESCRIPTION
    将 ElectroMonkey 运行时安装到 %LOCALAPPDATA%\ElectroMonkey，
    并将引导 asar 部署到目标 Electron 应用的 resources 目录。
.PARAMETER TargetPath
    目标 Electron 应用的 resources 目录路径（包含 app.asar 的目录）。
.EXAMPLE
    .\install.ps1 "C:\Users\你的用户名\AppData\Local\SomeApp\1.0.0\resources"
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
Write-Host "  ElectroMonkey 安装程序" -ForegroundColor White
Write-Host "  ─────────────────────" -ForegroundColor DarkGray
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$InstallDir = Join-Path $env:LOCALAPPDATA "ElectroMonkey"

# ── 验证目标路径 ──

if (-not $TargetPath) {
    Write-Host "路径应指向目标 Electron 应用的 resources 目录（包含 app.asar 的目录）。" -ForegroundColor Gray
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

$AsarPath = Join-Path $TargetPath "app.asar"
$OrigAsarPath = Join-Path $TargetPath "app-original.asar"

if (-not (Test-Path $AsarPath) -and -not (Test-Path $OrigAsarPath)) {
    Write-Err "错误：未找到 app.asar: $AsarPath"
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host "找到目标: $TargetPath"
Write-Host ""

# ── [1/3] 安装运行时 ──

Write-Step "[1/3] 安装 ElectroMonkey 运行时..."

$RuntimeDest = Join-Path $InstallDir "runtime"
$AssetsDest = Join-Path $InstallDir "assets"

if (Test-Path $RuntimeDest) { Remove-Item $RuntimeDest -Recurse -Force }
if (Test-Path $AssetsDest)  { Remove-Item $AssetsDest -Recurse -Force }

Copy-Item (Join-Path $ScriptDir "runtime") $RuntimeDest -Recurse -Force
Copy-Item (Join-Path $ScriptDir "assets")  $AssetsDest  -Recurse -Force

$PluginsDest = Join-Path $InstallDir "plugins"
if (-not (Test-Path $PluginsDest)) {
    Copy-Item (Join-Path $ScriptDir "plugins") $PluginsDest -Recurse -Force
} else {
    # 仅更新内置插件 control-panel
    $CpSrc = Join-Path $ScriptDir "plugins" "control-panel"
    $CpDest = Join-Path $PluginsDest "control-panel"
    if (Test-Path $CpDest) { Remove-Item $CpDest -Recurse -Force }
    Copy-Item $CpSrc $CpDest -Recurse -Force
}

Write-Ok "已安装到 $InstallDir"

# ── [2/3] 备份原始 asar ──

Write-Step "[2/3] 备份原始应用..."

if (Test-Path $OrigAsarPath) {
    Write-Warn "已有备份，跳过"
} else {
    if (-not (Test-Path $AsarPath)) {
        Write-Err "错误：未找到 app.asar"
        Read-Host "按 Enter 键退出"
        exit 1
    }
    Copy-Item $AsarPath $OrigAsarPath -Force

    $UnpackedPath = Join-Path $TargetPath "app.asar.unpacked"
    $OrigUnpackedPath = Join-Path $TargetPath "app-original.asar.unpacked"
    if (Test-Path $UnpackedPath) {
        Copy-Item $UnpackedPath $OrigUnpackedPath -Recurse -Force
    }
    Write-Ok "app.asar 已备份为 app-original.asar"
}

# ── [3/3] 部署引导 asar ──

Write-Step "[3/3] 部署引导程序..."

Copy-Item (Join-Path $ScriptDir "bootstrap.asar") $AsarPath -Force
Write-Ok "bootstrap.asar 已部署"

# ── 完成 ──

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ElectroMonkey 安装完成！" -ForegroundColor Green
Write-Host ""
Write-Host "  运行时:    $RuntimeDest" -ForegroundColor Gray
Write-Host "  插件目录:  $PluginsDest" -ForegroundColor Gray
Write-Host "  原始备份:  $OrigAsarPath" -ForegroundColor Gray
Write-Host ""
Write-Host "  直接启动目标应用即可使用 ElectroMonkey" -ForegroundColor White
Write-Host "  卸载: 运行 uninstall.ps1" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Read-Host "按 Enter 键退出"
