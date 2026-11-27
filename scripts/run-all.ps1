[CmdletBinding()]
param(
    [int]$RmiPort = 1099,
    [int]$Bridge1Port = 8081,
    [int]$Bridge2Port = 8082,
    [int]$FrontendPort = 3000,
    [string]$RmiHost = "127.0.0.1",
    [switch]$Lan,
    [switch]$Force,
    [switch]$NoBrowser,
    [switch]$NoSetup
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

Write-Host "=== BOMBERMAN SD - SUBINDO AMBIENTE COMPLETO ==="

Add-ToolPath

if ($Lan -and -not $PSBoundParameters.ContainsKey("RmiHost")) {
    $lanIp = Get-LanIPv4
    if (-not $lanIp) {
        throw "Não foi possível detectar o IPv4 da LAN. Informe -RmiHost <ip>."
    }
    $RmiHost = $lanIp
}

$missing = @()
if (-not (Test-JavaEnvironment)) {
    $missing += "Java 17+"
}
if (-not (Test-Node18OnPath)) {
    $missing += "Node.js 18+"
}
foreach ($command in @("mvn", "npm")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        $missing += $command
    }
}

if ($missing.Count -gt 0) {
    if ($NoSetup) {
        throw "Faltando: $($missing -join ', '). Rode .\scripts\setup-env.ps1."
    }

    Write-Host "Faltando: $($missing -join ', '). Executando setup-env.ps1..."
    & (Join-Path $PSScriptRoot "setup-env.ps1")
    Add-ToolPath

    if (-not (Test-JavaEnvironment)) {
        throw "Java 17+ não encontrado após o setup."
    }
    if (-not (Test-Node18OnPath)) {
        throw "Node.js 18+ não encontrado após o setup."
    }
    foreach ($command in @("mvn", "npm")) {
        Assert-Command $command "Rode .\scripts\setup-env.ps1."
    }
}

$portSpecs = @(
    [PSCustomObject]@{ Port = $RmiPort; Name = "Servidor RMI" },
    [PSCustomObject]@{ Port = $Bridge1Port; Name = "Bridge 1" },
    [PSCustomObject]@{ Port = $Bridge2Port; Name = "Bridge 2" },
    [PSCustomObject]@{ Port = $FrontendPort; Name = "Frontend" }
)

$distinctPorts = @($portSpecs | ForEach-Object { $_.Port } | Sort-Object -Unique)
if ($distinctPorts.Count -ne $portSpecs.Count) {
    throw "As portas do servidor, bridges e frontend precisam ser diferentes."
}

foreach ($spec in $portSpecs) {
    Assert-Port -Port $spec.Port -Name $spec.Name

    $owner = Get-PortOwner -Port $spec.Port
    if (-not $owner) {
        continue
    }

    $process = Get-Process -Id $owner.OwningProcess -ErrorAction SilentlyContinue
    $processName = if ($process) { $process.ProcessName } else { "desconhecido" }

    if (-not $Force) {
        throw "Porta $($spec.Port) ($($spec.Name)) em uso por $processName (PID $($owner.OwningProcess)). Use -Force ou .\scripts\stop-all.ps1."
    }

    Write-Host "Porta $($spec.Port) ocupada por $processName (PID $($owner.OwningProcess)); encerrando..."
    Stop-PortProcess -Port $spec.Port -Force
}

Write-Host ""
Write-Host "Compilando backend-rmi..."
Push-Location (Join-Path $RepoRoot "backend-rmi")
try {
    & mvn -B compile
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao compilar o backend."
    }
}
finally {
    Pop-Location
}

$frontendDir = Join-Path $RepoRoot "frontend"
if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "Instalando dependências do frontend..."
    Push-Location $frontendDir
    try {
        & npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao instalar dependências do frontend."
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "Abrindo servidor RMI (porta $RmiPort)..."
$serverScript = Join-Path $PSScriptRoot "run-server.ps1"
Start-NewConsole -Title "Bomberman - Servidor RMI ($RmiPort)" -ScriptPath $serverScript -ScriptArgs @($RmiPort, $RmiHost, "-SkipCompile")
if (-not (Wait-Port -Port $RmiPort -TimeoutSec 240 -Label "servidor RMI")) {
    throw "O servidor RMI não subiu. Veja a janela 'Bomberman - Servidor RMI'."
}

# A porta 1099 abre antes do registry.rebind(); dá um instante para o serviço
# estar realmente publicado antes de os bridges fazerem o Naming.lookup.
Start-Sleep -Milliseconds 750

Write-Host "Abrindo bridges (portas $Bridge1Port e $Bridge2Port)..."
$bridgeScript = Join-Path $PSScriptRoot "run-bridge.ps1"
Start-NewConsole -Title "Bomberman - Bridge $Bridge1Port (Jogador 1)" -ScriptPath $bridgeScript -ScriptArgs @($Bridge1Port, $RmiPort, $RmiHost, "-SkipCompile")
Start-NewConsole -Title "Bomberman - Bridge $Bridge2Port (Jogador 2)" -ScriptPath $bridgeScript -ScriptArgs @($Bridge2Port, $RmiPort, $RmiHost, "-SkipCompile")

if (-not (Wait-Port -Port $Bridge1Port -TimeoutSec 120 -Label "bridge 1")) {
    throw "O bridge 1 não subiu. Veja a janela 'Bomberman - Bridge $Bridge1Port'."
}
if (-not (Wait-Port -Port $Bridge2Port -TimeoutSec 120 -Label "bridge 2")) {
    throw "O bridge 2 não subiu. Veja a janela 'Bomberman - Bridge $Bridge2Port'."
}

Write-Host "Abrindo frontend (porta $FrontendPort)..."
$frontendScript = Join-Path $PSScriptRoot "run-frontend.ps1"
Start-NewConsole -Title "Bomberman - Frontend ($FrontendPort)" -ScriptPath $frontendScript -ScriptArgs @($FrontendPort)
if (-not (Wait-Port -Port $FrontendPort -TimeoutSec 90 -Label "frontend")) {
    throw "O frontend não subiu. Veja a janela 'Bomberman - Frontend'."
}

$localUrl = "http://localhost:$FrontendPort"
if (-not $NoBrowser) {
    Write-Host "Abrindo duas janelas do navegador em $localUrl..."
    Open-BrowserWindow -Url $localUrl
    Start-Sleep -Milliseconds 800
    Open-BrowserWindow -Url $localUrl
}

Write-Host ""
Write-Host "=== AMBIENTE NO AR ==="
Write-Host "Servidor RMI : rmi://${RmiHost}:$RmiPort/BombermanService"
Write-Host "Bridge 1     : http://localhost:$Bridge1Port  (Jogador 1)"
Write-Host "Bridge 2     : http://localhost:$Bridge2Port  (Jogador 2)"
Write-Host "Frontend     : $localUrl"
if ($Lan) {
    Write-Host "LAN          : http://${RmiHost}:$FrontendPort"
    Write-Host "Libere TCP 1099, $Bridge1Port, $Bridge2Port e $FrontendPort no firewall."
}
Write-Host ""
Write-Host "Para encerrar: .\scripts\stop-all.ps1 -Force"
