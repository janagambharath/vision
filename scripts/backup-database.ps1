param(
  [string]$OutputDir = ".\backups",
  [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL is required."
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  Write-Error "pg_dump is not installed or is not on PATH."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $OutputDir "vision-vistara-$timestamp.dump"

& $pgDump.Source --format=custom --no-owner --no-acl --file=$backupFile $env:DATABASE_URL

$backup = Get-Item $backupFile
if ($backup.Length -lt 1024) {
  Remove-Item -LiteralPath $backupFile -Force
  Write-Error "Backup verification failed: dump file is suspiciously small."
}

$cutoff = (Get-Date).AddDays(-1 * $RetentionDays)
Get-ChildItem -Path $OutputDir -Filter "vision-vistara-*.dump" |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  Remove-Item -Force

Write-Output "Backup complete: $($backup.FullName) ($($backup.Length) bytes)"
