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

$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if (-not $pgRestore) {
  Write-Error "pg_restore is not installed or is not on PATH. It is required to verify the archive."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $OutputDir "vision-vistara-$timestamp.dump"

& $pgDump.Source --format=custom --no-owner --no-acl --file=$backupFile $env:DATABASE_URL
if ($LASTEXITCODE -ne 0) {
  Write-Error "pg_dump failed with exit code $LASTEXITCODE."
}

$backup = Get-Item $backupFile
if ($backup.Length -lt 1024) {
  Remove-Item -LiteralPath $backupFile -Force
  Write-Error "Backup verification failed: dump file is suspiciously small."
}

# A non-empty file is not sufficient evidence of a usable PostgreSQL archive.
# Listing it validates the custom archive structure without touching production data.
& $pgRestore.Source --list $backupFile | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Backup verification failed: pg_restore could not read the archive."
}

$backupHash = (Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash

$cutoff = (Get-Date).AddDays(-1 * $RetentionDays)
Get-ChildItem -Path $OutputDir -Filter "vision-vistara-*.dump" |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  Remove-Item -Force

Write-Output "Backup complete: $($backup.FullName) ($($backup.Length) bytes, SHA256 $backupHash)"
