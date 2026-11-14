# Runs a command on the VM's logged-in desktop and waits for it.
#
#   powershell -File run-interactive.ps1 -Command "<cmdline>" [-TimeoutSeconds 1800]
#   powershell -File run-interactive.ps1 -Command "<cmdline>" -NoWait   # start it and return
#
# An SSH session is not interactive: it has no desktop, so a WebView2 editor
# cannot be created there and a window cannot be screenshotted. A scheduled
# task registered with LogonType Interactive runs as the auto-logged-in user,
# on their desktop, which is where pluginval's editor tests and REAPER have to
# run. Output goes to a log file because the task has no console to return.
param(
    [Parameter(Mandatory)] [string] $Command,
    [int] $TimeoutSeconds = 1800,
    [string] $Log = "$env:USERPROFILE\interactive.log",
    [switch] $NoWait
)

$ErrorActionPreference = 'Stop'
$name = 'blokdust-interactive'
$done = "$Log.exit"
Remove-Item $Log, $done -ErrorAction SilentlyContinue

# cmd /c so the exit code can be written beside the log for us to read back.
# The whole line is wrapped in one extra pair of quotes, because when a /c
# line *starts* with a quote cmd strips the first and last quote characters
# on it — so `"C:\Program Files\...\reaper.exe" ... > "log"` silently became
# a different command and nothing started.
$wrapped = "/c `"$Command > `"$Log`" 2>&1 & echo %ERRORLEVEL% > `"$done`"`""
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $wrapped
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds $TimeoutSeconds) `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $name -Action $action -Principal $principal -Settings $settings | Out-Null
Start-ScheduledTask -TaskName $name

# Something long-lived (a DAW) that the caller will inspect and then stop.
# Left registered: unregistering a running task ends what it started, and the
# next run replaces it anyway.
if ($NoWait) { exit 0 }

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while (-not (Test-Path $done) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 2 }

if (Test-Path $Log) { Get-Content $Log }
Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue

if (-not (Test-Path $done)) { Write-Output "TIMEOUT after $TimeoutSeconds s"; exit 124 }
$code = [int]((Get-Content $done | Select-Object -First 1).Trim())
exit $code
