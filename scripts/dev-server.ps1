$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$env:NEXT_TEST_WASM = "1"
$env:NEXT_TEST_WASM_DIR = (Resolve-Path "node_modules\@next\swc-wasm-nodejs").Path

npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
