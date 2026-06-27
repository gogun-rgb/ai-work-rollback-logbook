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

Write-Host "Checking required tools..."
Require-Command "node" "Install Node.js 22.12 or newer, then run this script again."
Require-Command "pnpm" "Install pnpm, then run this script again."
Require-Command "git" "Install Git, then run this script again."

if (-not (Test-Path -LiteralPath ".env")) {
  if (Test-Path -LiteralPath ".env.example") {
    Copy-Item -LiteralPath ".env.example" -Destination ".env"
    Write-Host "Created .env from .env.example without overwriting existing files."
  } else {
    Write-Host "No .env.example found. Create .env with a DATABASE_URL value."
  }
} else {
  Write-Host "Existing .env file preserved."
}

Write-Host "Installing dependencies..."
pnpm install --frozen-lockfile

if ($LASTEXITCODE -ne 0) {
  Write-Error "Dependency installation failed."
}

Write-Host "Preparing the local database..."
pnpm setup

if ($LASTEXITCODE -ne 0) {
  Write-Error "Local setup failed."
}

Write-Host "Setup complete. Run scripts/start-windows.ps1 or pnpm dev to start the app."
