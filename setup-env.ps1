# Script para preparar o ambiente do Bomberman SD no Windows (sem precisar de acesso administrador)

$ErrorActionPreference = "Stop"

$toolsDir = "$env:USERPROFILE\tools"
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

# 1. Baixar e extrair Apache Maven 3.9.9
$mvnDir = "$toolsDir\apache-maven-3.9.9"
$mvnBin = "$mvnDir\bin"
if (-not (Test-Path "$mvnBin\mvn.cmd")) {
    Write-Host "Baixando Apache Maven 3.9.9..."
    $mvnZip = "$env:TEMP\maven.zip"
    Invoke-WebRequest -Uri "https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip" -OutFile $mvnZip
    Expand-Archive -Path $mvnZip -DestinationPath $toolsDir -Force
    Remove-Item $mvnZip -Force
} else {
    Write-Host "Maven 3.9.9 já encontrado em $mvnDir"
}

# 2. Baixar e extrair Node.js 20.18.0 LTS
$nodeDir = "$toolsDir\node-v20.18.0-win-x64"
if (-not (Test-Path "$nodeDir\node.exe")) {
    Write-Host "Baixando Node.js 20.18.0..."
    $nodeZip = "$env:TEMP\node.zip"
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip" -OutFile $nodeZip
    Expand-Archive -Path $nodeZip -DestinationPath $toolsDir -Force
    Remove-Item $nodeZip -Force
} else {
    Write-Host "Node.js 20.18.0 já encontrado em $nodeDir"
}

# 3. Adicionar Maven e Node.js ao PATH do usuário (permanente)
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathsToAdd = @($mvnBin, $nodeDir) | Where-Object { $userPath -notlike "*$_*" }
if ($pathsToAdd.Count -gt 0) {
    $newPath = ($userPath.TrimEnd(';') + ";" + ($pathsToAdd -join ";")).TrimStart(';')
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "PATH do usuário atualizado."
}

# Atualiza o PATH da sessão atual
$env:Path = "$mvnBin;$nodeDir;$env:Path"

# 4. Compilar backend e instalar dependências do frontend
Write-Host "Compilando backend-rmi..."
Push-Location "$PSScriptRoot\backend-rmi"
mvn test-compile
Pop-Location

Write-Host "Instalando dependências do frontend..."
Push-Location "$PSScriptRoot\frontend"
npm install
Pop-Location

Write-Host "Ambiente pronto! Abra um novo PowerShell para usar mvn, node e npm."
