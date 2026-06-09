$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

$logDirectory = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$npmLogPath = Join-Path $logDirectory "npm-$timestamp.log"
$browserLogPath = Join-Path $logDirectory "browser-$timestamp.log"

try {
    Write-Host "[MLS] npm log: $npmLogPath"
    Write-Host "[MLS] Browser log: $browserLogPath"

    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
        throw 'Node.js is not installed or is not in PATH. Install Node.js LTS from https://nodejs.org/'
    }

    if (-not (Test-Path (Join-Path $PSScriptRoot 'node_modules'))) {
        Write-Host '[MLS] Installing dependencies...'
        & npm.cmd install 2>&1 | Tee-Object -FilePath $npmLogPath -Append
        if ($LASTEXITCODE -ne 0) {
            throw "Dependency installation failed with exit code $LASTEXITCODE."
        }
    }

    $env:MLS_BROWSER_LOG_PATH = $browserLogPath

    Write-Host '[MLS] Starting http://localhost:5173/'
    Write-Host '[MLS] Keep this window open. Press Ctrl+C to stop the server.'

    Start-Job -ScriptBlock {
        Start-Sleep -Seconds 2
        Start-Process 'http://localhost:5173/'
    } | Out-Null

    & npm.cmd run dev 2>&1 | Tee-Object -FilePath $npmLogPath -Append
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        throw "The development server stopped with exit code $exitCode."
    }
}
catch {
    Write-Host ''
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "[MLS] Review the npm log: $npmLogPath"
    Read-Host 'Press Enter to close'
    exit 1
}
