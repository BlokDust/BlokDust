# Engine on Windows (MSVC, x64): configure, build, run the Catch2 suite and render every golden fixture.
#   powershell -ExecutionPolicy Bypass -File C:\blokdust\tools\win-vm\engine-check.ps1
# Prints "RENDER <fixture> <json>" lines that `pnpm bd win engine` compares with tests/golden/expected.
$ErrorActionPreference = 'Stop'
Set-Location C:\blokdust
$build = 'C:\blokdust-build\engine'
cmake -S . -B $build -A x64 -DBLOKDUST_BUILD_TESTS=ON -DBLOKDUST_BUILD_TOOLS=ON | Out-Null
if ($LASTEXITCODE) { throw 'configure failed' }
cmake --build $build --config Release --parallel -- /nologo /verbosity:minimal /p:TreatWarningsAsErrors=false
if ($LASTEXITCODE) { throw 'build failed' }
ctest --test-dir $build -C Release --output-on-failure
$ctest = $LASTEXITCODE
Get-ChildItem tests\golden\*.json | ForEach-Object {
  $out = & "$build\engine\Release\blokdust_render.exe" $_.FullName
  "RENDER $($_.BaseName) $out"
}
"CTEST_EXIT $ctest"
