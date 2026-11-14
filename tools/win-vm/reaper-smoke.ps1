# Opens BlokDust in REAPER on the VM's desktop, plays it, and prints REAPER's JSON report (loaded, peak level).
#   powershell -File reaper-smoke.ps1 [-Seconds 6] [-Mode play|mpe|fx|state] [-Fx VST3i:BlokDust] [-Quit] [-Stop]
# Modes: tools/reaper/__startup.lua (CHG-0004 3.10).
# Leaves REAPER running so `bd win shot` can capture the editor; -Stop closes it.
param([int] $Seconds = 6, [switch] $Stop, [string] $Mode = 'play', [string] $Fx = 'VST3i:BlokDust', [switch] $Quit)
$ErrorActionPreference = 'Stop'
Get-Process reaper -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
if ($Stop) { 'stopped'; exit 0 }
$reaper = @("$env:ProgramFiles\REAPER (x64)\reaper.exe", "$env:ProgramFiles\REAPER\reaper.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $reaper) { throw 'REAPER is not installed in the VM' }
$scripts = "$env:APPDATA\REAPER\Scripts"
New-Item -ItemType Directory -Force -Path $scripts | Out-Null
Copy-Item (Join-Path $PSScriptRoot '..\reaper\__startup.lua') $scripts -Force
# First run would stop at "You have not yet selected an audio device": pre-seed WaveOut on the VM's sound card.
$ini = "$env:APPDATA\REAPER\reaper.ini"
if (-not ((Test-Path $ini) -and (Select-String -Path $ini -Pattern '^\[audioconfig\]' -Quiet))) {
  New-Item -ItemType Directory -Force -Path (Split-Path $ini) | Out-Null
  Add-Content $ini "`r`n[audioconfig]`r`nmode=2`r`nwaveout_srate=44100`r`nwaveout_bps=16`r`nwaveout_devicein=-1`r`nwaveout_deviceout=-1`r`nwaveout_bs=1024`r`nwaveout_numblocks=8`r`nwaveout_nch_in=2`r`nwaveout_nch_out=2"
}
$report = "$env:USERPROFILE\blokdust-reaper-report.json"
Remove-Item $report -ErrorAction SilentlyContinue
$quitLine = if ($Quit) { "`nquit=1" } else { '' }
Set-Content "$env:USERPROFILE\blokdust-reaper-plan.txt" "fx=$Fx`nseconds=$Seconds`nmode=$Mode$quitLine"
& (Join-Path $PSScriptRoot 'run-interactive.ps1') -Command "`"$reaper`" -newinst -new" -NoWait -Log "$env:USERPROFILE\reaper-stdout.log"
$deadline = (Get-Date).AddSeconds($Seconds + 90)   # REAPER scans new plugins on first launch
while ((Get-Date) -lt $deadline -and -not (Test-Path $report)) { Start-Sleep -Seconds 1 }
$tag = if ($Mode -eq 'play') { 'REAPER_RESULT' } else { "REAPER_$($Mode.ToUpper())" }
if (Test-Path $report) { "$tag $(Get-Content $report -Raw)".Trim() } else { "$tag {`"loaded`":false,`"error`":`"no report`"}" }
