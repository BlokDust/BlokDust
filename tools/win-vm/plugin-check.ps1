# BlokDust plugins on Windows (MSVC x64): build both VST3s + Standalone + host test; golden/automation/FX/MIDI renders
# through the built VST3s; pluginval (desktop, with editor tests) on both; WebView2 editor round-trip; REAPER smoke;
# Standalone smoke. Prints machine-readable lines for `pnpm bd win plugin`.
#   powershell -ExecutionPolicy Bypass -File C:\blokdust\tools\win-vm\plugin-check.ps1
$ErrorActionPreference = 'Stop'
Set-Location C:\blokdust
$build = 'C:\blokdust-build\plugin'
# JUCE's FindWebView2 globs a local NuGet directory and downloads nothing: fetch the SDK once, outside the synced tree.
$webview2 = 'C:\blokdust-build\.webview2'
if (-not (Test-Path (Join-Path $webview2 'Microsoft.Web.WebView2'))) {
  nuget install Microsoft.Web.WebView2 -OutputDirectory $webview2 -ExcludeVersion | Out-Null
}
# A Standalone or REAPER left running by an earlier (interrupted) run locks the binaries the linker must overwrite.
Get-Process BlokDust, reaper, pluginval -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
cmake -S . -B $build -A x64 -DBLOKDUST_BUILD_TESTS=OFF -DBLOKDUST_BUILD_TOOLS=ON -DBLOKDUST_BUILD_PLUGIN=ON "-DJUCE_WEBVIEW2_PACKAGE_LOCATION=$webview2" | Out-Null
if ($LASTEXITCODE) { throw 'configure failed' }
cmake --build $build --config Release --parallel --target BlokDust_VST3 BlokDustFX_VST3 BlokDust_Standalone blokdust_host_test -- /nologo /verbosity:minimal
if ($LASTEXITCODE) { throw 'build failed' }
$art = "$build\plugin\BlokDust_artefacts\Release"
$vst3 = "$art\VST3\BlokDust.vst3"
$fxVst3 = "$build\plugin\BlokDustFX_artefacts\Release\VST3\BlokDust FX.vst3"
$host_ = "$build\plugin\blokdust_host_test_artefacts\Release\blokdust_host_test.exe"

# The same host cases as `pnpm bd plugin test` on macOS: each must hash like the native golden.
"HOST emitter-tone emitter-tone $(& $host_ $vst3 tests\golden\emitter-tone.json)"
"HOST toggle-pulse toggle-pulse $(& $host_ $vst3 tests\golden\toggle-pulse.json)"
"HOST dust-automation dust-filter $(& $host_ $vst3 tests\golden\dust-filter.json --state tests\golden\states\dust-filter.state.json --param 0=0.75)"
"HOST fx-audio-in fx-audio-in $(& $host_ $fxVst3 tests\golden\fx-audio-in.json)"
"HOST host-midi midi-notes $(& $host_ $vst3 tests\golden\midi-notes.json --midi on:60@4800,off:60@48000,on:67@72000,off:67@120000)"

# Install where DAWs look (VM only), then the desktop-bound checks.
foreach ($p in @($vst3, $fxVst3)) {
  $dest = Join-Path "$env:CommonProgramFiles\VST3" (Split-Path $p -Leaf)
  if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
  Copy-Item -Recurse $p $dest
}
$dest = "$env:CommonProgramFiles\VST3\BlokDust.vst3"
$diag = "$env:USERPROFILE\blokdust-ui-diag.json"
Remove-Item $diag -ErrorAction SilentlyContinue
& (Join-Path $PSScriptRoot 'run-interactive.ps1') -TimeoutSeconds 300 -Command "set BLOKDUST_DIAG_FILE=$diag&& `"$host_`" `"$dest`" C:\blokdust\tests\golden\emitter-tone.json --editor `"$diag`"" | ForEach-Object { "EDITOR $_" }
foreach ($p in @('BlokDust.vst3', 'BlokDust FX.vst3')) {
  $out = & (Join-Path $PSScriptRoot 'run-interactive.ps1') -TimeoutSeconds 900 -Command "C:\tools\pluginval\pluginval.exe --strictness-level 5 --validate-in-process --validate `"$env:CommonProgramFiles\VST3\$p`""
  "PLUGINVAL $($p -replace ' ', '_') $LASTEXITCODE"
  if ($LASTEXITCODE) { $out | Select-Object -Last 15 }
}
# CHG-0004 3.10: MPE MIDI item, the FX on a tone generator, and a project saved/reopened with Dust 1 set.
& (Join-Path $PSScriptRoot 'reaper-smoke.ps1') -Seconds 4 -Mode mpe -Quit
& (Join-Path $PSScriptRoot 'reaper-smoke.ps1') -Seconds 4 -Mode fx -Fx 'VST3:BlokDust FX' -Quit
& (Join-Path $PSScriptRoot 'reaper-smoke.ps1') -Seconds 1 -Mode state -Quit
& (Join-Path $PSScriptRoot 'reaper-smoke.ps1') -Seconds 6
& (Join-Path $PSScriptRoot 'reaper-smoke.ps1') -Stop | Out-Null

# Standalone: starts on the desktop, stays up (no crash), opens its window. Audio output in the VM is discarded.
Get-Process BlokDust -ErrorAction SilentlyContinue | Stop-Process -Force
& (Join-Path $PSScriptRoot 'run-interactive.ps1') -Command "`"$art\Standalone\BlokDust.exe`"" -NoWait -Log "$env:USERPROFILE\standalone.log"
Start-Sleep -Seconds 12
$proc = Get-Process BlokDust -ErrorAction SilentlyContinue | Select-Object -First 1
$title = if ($proc) { $proc.MainWindowTitle } else { '' }
"STANDALONE_RESULT {`"alive`":$(if ($proc) { 'true' } else { 'false' }),`"window`":`"$title`"}"
Get-Process BlokDust -ErrorAction SilentlyContinue | Stop-Process -Force  # never leave it running
