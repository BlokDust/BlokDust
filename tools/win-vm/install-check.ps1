# The Windows installer installs where DAWs look and uninstalls cleanly (CHG-0005 task 12). Silent, in the VM.
#   powershell -ExecutionPolicy Bypass -File C:\blokdust\tools\win-vm\install-check.ps1 -Installer C:\...\BlokDust-2.0.0-Windows.exe
param([Parameter(Mandatory = $true)][string]$Installer)
$ErrorActionPreference = 'Stop'
$vst3 = "$env:CommonProgramFiles\VST3"
$app = "$env:ProgramFiles\BlokDust"
foreach ($p in @("$vst3\BlokDust.vst3", "$vst3\BlokDust FX.vst3")) { if (Test-Path $p) { Remove-Item -Recurse -Force $p } }
$p = Start-Process -FilePath $Installer -ArgumentList '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART' -Wait -PassThru
$installed = [ordered]@{
  exit = $p.ExitCode
  vst3 = (Test-Path "$vst3\BlokDust.vst3\Contents\x86_64-win\BlokDust.vst3")
  fxVst3 = (Test-Path "$vst3\BlokDust FX.vst3\Contents\x86_64-win\BlokDust FX.vst3")
  app = (Test-Path "$app\BlokDust.exe")
  noFxApp = -not (Test-Path "$app\BlokDust FX.exe")  # FX is a plug-in only (CHG-0010)
  notice = (Test-Path "$app\NOTICE.txt")
  licence = (Test-Path "$app\LICENSE.txt")
  startMenu = (Test-Path "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\BlokDust\BlokDust.lnk")
}
$u = Start-Process -FilePath "$app\unins000.exe" -ArgumentList '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART' -Wait -PassThru
Start-Sleep -Seconds 3
$removed = -not (Test-Path "$vst3\BlokDust.vst3") -and -not (Test-Path "$app\BlokDust.exe")
"INSTALL_RESULT $(@{ installed = $installed; uninstallExit = $u.ExitCode; removed = $removed } | ConvertTo-Json -Compress -Depth 3)"
