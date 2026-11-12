# Build the MuYu x64 portable ZIP without bundling an installer.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$target = 'x86_64-pc-windows-msvc'
$targetDir = Join-Path $projectRoot '.build\cargo-target'
$projectCargo = Join-Path $projectRoot '.build-tools\cargo'
$projectRustup = Join-Path $projectRoot '.build-tools\rustup'

if (Test-Path -LiteralPath (Join-Path $projectCargo 'bin\cargo.exe')) {
    $env:CARGO_HOME = $projectCargo
    $env:RUSTUP_HOME = $projectRustup
    $env:PATH = (Join-Path $projectCargo 'bin') + ';' + $env:PATH
}
$env:CARGO_TARGET_DIR = $targetDir
if (-not (Get-Command cargo.exe -ErrorAction SilentlyContinue)) {
    throw 'Rust MSVC is required. Install the x86_64-pc-windows-msvc toolchain and C++ Build Tools with the Windows SDK.'
}

Push-Location -LiteralPath $projectRoot
try {
    if (-not (Test-Path -LiteralPath 'node_modules\.bin\tauri.cmd')) {
        throw 'Build dependencies are missing. Run npm ci first.'
    }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw "Tests failed: $LASTEXITCODE" }
    & npm.cmd run tauri -- build --no-bundle --target $target
    if ($LASTEXITCODE -ne 0) { throw "Tauri build failed: $LASTEXITCODE" }

    $configuration = Get-Content -LiteralPath 'src-tauri\tauri.conf.json' -Raw | ConvertFrom-Json
    $releaseDir = Join-Path $targetDir "$target\release"
    $executable = Join-Path $releaseDir "$($configuration.mainBinaryName).exe"
    if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) { throw "Missing compiled executable: $executable" }

    $name = "MuYu-$($configuration.version)-windows-x64-portable"
    $distDir = Join-Path $projectRoot 'dist'
    $packageDir = Join-Path $distDir $name
    $zipPath = Join-Path $distDir "$name.zip"
    New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
    Copy-Item -LiteralPath $executable -Destination (Join-Path $packageDir 'MuYu.exe') -Force
    $documents = @('README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md')
    foreach ($file in $documents) {
        Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $packageDir -Force
    }
    $licenseDir = Join-Path $packageDir 'licenses'
    New-Item -ItemType Directory -Path $licenseDir -Force | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'licenses') -File -Filter '*.txt' |
        Copy-Item -Destination $licenseDir -Force
    $contents = @('MuYu.exe') + $documents
    $archivePaths = @($contents | ForEach-Object { Join-Path $packageDir $_ }) + $licenseDir
    Compress-Archive -LiteralPath $archivePaths -DestinationPath $zipPath -Force
    $hashes = @(
        ('{0}  {1}' -f (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant(), "$name.zip")
        ('{0}  {1}' -f (Get-FileHash -LiteralPath (Join-Path $packageDir 'MuYu.exe') -Algorithm SHA256).Hash.ToLowerInvariant(), "$name/MuYu.exe")
    )
    $hashes | Set-Content -LiteralPath (Join-Path $distDir 'SHA256SUMS.txt') -Encoding ASCII
    Write-Output "Portable executable: $(Join-Path $packageDir 'MuYu.exe')"
    Write-Output "Portable archive: $zipPath"
} finally {
    Pop-Location
}
