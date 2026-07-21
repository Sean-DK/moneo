$ErrorActionPreference = "Stop"

$SERVER_USER = "seang"
$SERVER_HOST = "192.168.1.101"
$SERVER_DIR  = "/opt/moneo"
$FRONTEND_DIR = "../client"
$BACKEND_DIR = "../api"
$STATIC_DIR  = "/var/www/moneo"

# Helper — throws if the last external command failed
function Assert-Success {
    param([string]$Step)
    if ($LASTEXITCODE -ne 0) {
		Pop-Location
        throw "❌ Step failed: $Step (exit code $LASTEXITCODE)"
    }
}

Write-Host "Moneo Deploy" -ForegroundColor Cyan

# Version: days since 1996-08-22 + time of day (24h, seconds precision)
$epoch          = [datetime]"1996-08-22"
$now            = Get-Date
$daysSinceEpoch = [math]::Floor(($now - $epoch).TotalDays)
$timeOfDay      = $now.ToString("HHmmss")
$appVersion     = "$daysSinceEpoch.$timeOfDay"

Write-Host ">> Version: $appVersion" -ForegroundColor Cyan

# ---- Build React app for Capacitor (no service worker) ----
Write-Host "Building React app for Capacitor..." -ForegroundColor Yellow
Push-Location $FRONTEND_DIR
Set-Content .env.production "VITE_API_URL=https://moneoapi.stablesea.net`nVITE_DEV_AUTH_BYPASS=false"
$env:BUILD_TARGET    = "capacitor"
$env:VITE_APP_VERSION = $appVersion
npm run build
Assert-Success "Capacitor build"
Remove-Item Env:\BUILD_TARGET     -ErrorAction SilentlyContinue
Remove-Item Env:\VITE_APP_VERSION -ErrorAction SilentlyContinue

# ---- Sync Capacitor build ----
Write-Host "Syncing Capacitor build..." -ForegroundColor Yellow
npx cap sync android
Assert-Success "Capacitor sync"
Pop-Location

# ---- Build API Docker image ----
Write-Host "Building API Docker image..." -ForegroundColor Yellow
Push-Location $BACKEND_DIR
docker build -f src\Moneo.Api\Dockerfile -t moneo-api:latest .
Assert-Success "Docker build"

# ---- Transfer Docker image to server ----
Write-Host "Transferring Docker image to server..." -ForegroundColor Yellow
docker save moneo-api:latest -o moneo-api.tar
Assert-Success "Docker save"
scp moneo-api.tar "${SERVER_USER}@${SERVER_HOST}:/tmp/moneo-api.tar"
Assert-Success "SCP Docker image"
ssh "${SERVER_USER}@${SERVER_HOST}" "docker load -i /tmp/moneo-api.tar && rm /tmp/moneo-api.tar"
Assert-Success "Docker load on server"
Remove-Item moneo-api.tar

# ---- Upload docker-compose ----
Write-Host "Uploading docker-compose.prod.yml..." -ForegroundColor Yellow
ssh "${SERVER_USER}@${SERVER_HOST}" "mkdir -p $SERVER_DIR"
Assert-Success "Create server dir"
scp docker-compose.prod.yml "${SERVER_USER}@${SERVER_HOST}:${SERVER_DIR}/"
Assert-Success "Upload docker-compose"

# ---- Restart API container ----
Write-Host "Restarting API container..." -ForegroundColor Yellow
ssh "${SERVER_USER}@${SERVER_HOST}" "cd $SERVER_DIR && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate api"
Assert-Success "Restart API container"

# ---- Run migrations ----
Write-Host "Waiting for API to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Running database migrations..." -ForegroundColor Yellow
try {
    ssh "${SERVER_USER}@${SERVER_HOST}" "cd $SERVER_DIR && docker compose -f docker-compose.prod.yml --env-file .env.prod exec api dotnet Moneo.Api.dll migrate"
} catch {
    Write-Host "Migration step skipped." -ForegroundColor Yellow
}

Pop-Location
Write-Host "✅ Deploy complete! Version: $appVersion" -ForegroundColor Green