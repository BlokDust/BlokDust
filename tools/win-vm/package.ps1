# The Windows installer (CHG-0005 task 12): Release x64 build of both plugins (VST3) and the BlokDust Standalone (FX has none, CHG-0010), then Inno Setup.
# Prints "PACKAGE <path>" for `pnpm bd win package`, which copies it back and checks it.
#   powershell -ExecutionPolicy Bypass -File C:\blokdust\tools\win-vm\package.ps1 -Version 2.0.0
param([Parameter(Mandatory = $true)][string]$Version)
$ErrorActionPreference = 'Stop'
Set-Location C:\blokdust
$build = 'C:\blokdust-build\release'
$webview2 = 'C:\blokdust-build\.webview2'
if (-not (Test-Path (Join-Path $webview2 'Microsoft.Web.WebView2'))) {
  nuget install Microsoft.Web.WebView2 -OutputDirectory $webview2 -ExcludeVersion | Out-Null
}
Get-Process BlokDust, 'BlokDust FX' -ErrorAction SilentlyContinue | Stop-Process -Force
cmake -S . -B $build -A x64 -DBLOKDUST_BUILD_TESTS=OFF -DBLOKDUST_BUILD_TOOLS=ON -DBLOKDUST_BUILD_PLUGIN=ON "-DJUCE_WEBVIEW2_PACKAGE_LOCATION=$webview2" | Out-Null
if ($LASTEXITCODE) { throw 'configure failed' }
# JUCE's version resources (FILEVERSION) can survive a version bump in an existing build folder (2.1.0's first build
# still said 2.0.1): remove them so this build writes them from the release's version.
Get-ChildItem -Path "$build\plugin" -Recurse -Include *_resources.rc, *_resources.res -ErrorAction SilentlyContinue | Remove-Item -Force
cmake --build $build --config Release --parallel --target BlokDust_VST3 BlokDustFX_VST3 BlokDust_Standalone -- /nologo /verbosity:minimal
if ($LASTEXITCODE) { throw 'build failed' }
# The version every binary carries must be the release's.
foreach ($exe in @("$build\plugin\BlokDust_artefacts\Release\Standalone\BlokDust.exe")) {
  "FILEVERSION $((Get-Item $exe).VersionInfo.ProductVersion) $(Split-Path $exe -Leaf)"
}
Remove-Item "$build\dist" -Recurse -Force -ErrorAction SilentlyContinue
& 'C:\Program Files (x86)\Inno Setup 6\ISCC.exe' /Q "/DVersion=$Version" "/DBuild=$build" "/DSrc=C:\blokdust" tools\win-vm\installer.iss
if ($LASTEXITCODE) { throw 'ISCC failed' }
"PACKAGE $build\dist\BlokDust-$Version-Windows.exe"
