[CmdletBinding()]
param(
    [Parameter(Position = 0)][int]$HttpPort = 8081,
    [Parameter(Position = 1)][int]$RmiPort = 1099,
    [Parameter(Position = 2)][string]$RmiHost = "127.0.0.1",
    [switch]$SkipCompile
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

Add-ToolPath
Assert-Command "mvn" "Rode .\scripts\setup-env.ps1 primeiro."
Assert-Port -Port $HttpPort -Name "porta HTTP"
Assert-Port -Port $RmiPort -Name "porta RMI"

Set-Location (Join-Path $RepoRoot "backend-rmi")

Write-Host "=== INICIANDO BOMBERMAN LOCAL HTTP BRIDGE ==="
Write-Host "Porta HTTP: $HttpPort | RMI Host: $RmiHost | Porta RMI: $RmiPort"

$goals = @()
if (-not $SkipCompile) {
    $goals += "compile"
}
$goals += "exec:java"

$execArgs = "-httpPort $HttpPort -rmiPort $RmiPort -rmiHost $RmiHost"
& mvn @goals "-Dexec.mainClass=clientbridge.ClientBridgeMain" "-Dexec.args=$execArgs"
if ($LASTEXITCODE -ne 0) {
    throw "Maven terminou com código $LASTEXITCODE."
}
