[CmdletBinding()]
param(
    [Parameter(Position = 0)][int]$Port = 3000
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

Add-ToolPath
Assert-Command "npm" "Rode .\scripts\setup-env.ps1 primeiro."
Assert-Port -Port $Port -Name "porta do frontend"

$frontendDir = Join-Path $RepoRoot "frontend"
Set-Location $frontendDir

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "node_modules ausente; instalando dependências..."
    & npm install
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao instalar dependências do frontend."
    }
}

Write-Host "=== INICIANDO BOMBERMAN REACT FRONTEND ==="
Write-Host "Porta: $Port"

# cmd /c garante que o "--" chegue ao npm e o --port seja repassado ao Vite,
# inclusive no Windows PowerShell 5.1.
if ($env:OS -eq "Windows_NT") {
    & cmd.exe /c "npm run dev -- --port $Port"
}
else {
    & npm run dev -- --port $Port
}
if ($LASTEXITCODE -ne 0) {
    throw "npm terminou com código $LASTEXITCODE."
}
