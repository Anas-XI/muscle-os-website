param([switch]$Remove)

$BotPath = "E:\MoS\mos_bot\bot.py"
$ServiceName = "MuscleOSBot"
$DisplayName = "Muscle OS Telegram Bot"
$PythonExe = (Get-Command python).Source
$LogDir = "E:\MoS\logs"

if (-not $PythonExe) {
    Write-Host "ERROR: Python not found in PATH. Install Python 3.11+ and try again." -ForegroundColor Red
    exit 1
}

if ($Remove) {
    Write-Host "Removing service $ServiceName..." -ForegroundColor Yellow
    & sc.exe stop $ServiceName 2>$null
    & sc.exe delete $ServiceName 2>$null
    Write-Host "Done." -ForegroundColor Green
    exit 0
}

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Try NSSM first (better restart management)
$NssmPath = Get-Command "nssm" -ErrorAction SilentlyContinue
if ($NssmPath) {
    Write-Host "Found NSSM. Installing with NSSM..." -ForegroundColor Green
    & nssm install $ServiceName $PythonExe "-u" "-m" "mos_bot.bot"
    & nssm set $ServiceName DisplayName $DisplayName
    & nssm set $ServiceName AppDirectory "E:\MoS"
    & nssm set $ServiceName AppStdout "$LogDir\bot_stdout.log"
    & nssm set $ServiceName AppStderr "$LogDir\bot_stderr.log"
    & nssm set $ServiceName AppRestartDelay 5000
    & nssm set $ServiceName Start SERVICE_AUTO_START
    Write-Host "Installed with NSSM. Starting..." -ForegroundColor Green
    & sc.exe start $ServiceName
    exit 0
}

# Fallback: use sc.exe
Write-Host "NSSM not found. Installing with sc.exe (basic restart only)..." -ForegroundColor Yellow
Write-Host "  For better auto-restart, install NSSM from https://nssm.cc/download" -ForegroundColor DarkYellow

$BinPath = "`"$PythonExe`" -u -m mos_bot.bot"
$ScArgs = @(
    "create", $ServiceName
    "binPath=$BinPath"
    "start=auto"
    "DisplayName=$DisplayName"
)
& sc.exe $ScArgs
& sc.exe description $ServiceName "Muscle OS AI Fitness Coach Telegram Bot"
& sc.exe failure $ServiceName reset=86400 actions=restart/5000/restart/10000/restart/30000
& sc.exe start $ServiceName

Write-Host "Done. Check $LogDir\bot_stdout.log for output." -ForegroundColor Green
