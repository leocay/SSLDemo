$pidFile = Join-Path $PSScriptRoot "server.pid"

if (-not (Test-Path $pidFile)) {
    Write-Host "No server.pid file found."
    exit 0
}

$serverPid = Get-Content $pidFile
$process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue

if ($null -eq $process) {
    Write-Host "Server process is not running."
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    exit 0
}

Stop-Process -Id $serverPid
Remove-Item $pidFile -ErrorAction SilentlyContinue
Write-Host "Stopped LocalHttpHttpsDemo server."
