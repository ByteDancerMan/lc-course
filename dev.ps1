$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$webappRoot = Join-Path $projectRoot "webapp"
$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"
$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue

if (-not (Test-Path $pythonExe)) {
    Write-Error "Python executable not found: $pythonExe"
    exit 1
}

if (-not (Test-Path $webappRoot)) {
    Write-Error "Webapp directory not found: $webappRoot"
    exit 1
}

if (-not $npmCmd) {
    Write-Error "npm.cmd not found. Please install Node.js first."
    exit 1
}

$backendCommand = @"
`$env:PYTHONPATH='.'
& '$pythonExe' -m uvicorn backend.main:app --host 0.0.0.0 --port 18000 --reload
"@

$frontendCommand = @"
& '$($npmCmd.Source)' run dev -- --host
"@

Write-Host "=== Start backend on port 18000 ===" -ForegroundColor Green
Start-Process powershell.exe -WorkingDirectory $webappRoot -ArgumentList @(
    "-NoExit",
    "-Command",
    $backendCommand
)

Start-Sleep -Seconds 2

Write-Host "=== Start frontend on port 5173 ===" -ForegroundColor Green
Start-Process powershell.exe -WorkingDirectory $webappRoot -ArgumentList @(
    "-NoExit",
    "-Command",
    $frontendCommand
)

Write-Host ""
Write-Host "Backend: http://localhost:18000/docs" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Two terminal windows have been opened." -ForegroundColor Yellow
