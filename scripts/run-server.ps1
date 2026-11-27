[CmdletBinding()]
param(
    [Parameter(Position = 0)][int]$RmiPort = 1099,
    [Parameter(Position = 1)][string]$RmiHost = "127.0.0.1",
    [switch]$SkipCompile
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

Add-ToolPath
Assert-Command "mvn" "Rode .\scripts\setup-env.ps1 primeiro."
Assert-Port -Port $RmiPort -Name "porta RMI"

Set-Location (Join-Path $RepoRoot "backend-rmi")

Write-Host "=== INICIANDO BOMBERMAN RMI SERVER ==="
Write-Host "Porta RMI: $RmiPort | Host: $RmiHost"

$goals = @()
if (-not $SkipCompile) {
    $goals += "compile"
}
$goals += "exec:java"

& mvn @goals "-Dexec.mainClass=server.ServerMain" "-Dexec.args=$RmiPort" "-Djava.rmi.server.hostname=$RmiHost"
if ($LASTEXITCODE -ne 0) {
    throw "Maven terminou com código $LASTEXITCODE."
}
