$ErrorActionPreference = "Stop"

function Require-Command {
  param(
    [string] $Name,
    [string] $InstallHint
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-Error "$Name was not found. $InstallHint"
  }
}

Write-Host "Checking runtime environment..."
Require-Command "node" "Install Node.js 22.12 or newer, then run this script again."
Require-Command "pnpm" "Install pnpm, then run this script again."
Require-Command "git" "Install Git, then run this script again."

if (-not (Test-Path -LiteralPath ".env")) {
  Write-Host "No .env file found. Run scripts/setup-windows.ps1 or pnpm setup first."
  exit 1
}

Write-Host "Starting the development server. Existing .env and database files are preserved."
pnpm dev
