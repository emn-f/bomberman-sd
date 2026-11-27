# Prepara o ambiente do Bomberman SD no Windows sem precisar de administrador.
# Instala JDK 17 (Temurin), Maven e Node.js em %USERPROFILE%\tools,
# ajusta PATH/JAVA_HOME e compila o backend + instala as dependências do frontend.

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

. (Join-Path $PSScriptRoot "common.ps1")

$toolsDir = Get-ToolsDir
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

Write-Host "=== PREPARANDO AMBIENTE (Windows) ==="
Write-Host "Pasta de ferramentas: $toolsDir"
Write-Host ""

# 1. JDK 17 (Temurin)
$jdkDir = Join-Path $toolsDir "jdk-17"
$javaExe = Join-Path $jdkDir "bin\java.exe"

if (-not (Test-Path $javaExe)) {
    Write-Host "Baixando Temurin JDK 17..."
    $jdkZip = Join-Path $env:TEMP "temurin17.zip"
    $extractDir = Join-Path $env:TEMP "temurin17-extract"
    Remove-Item $jdkZip -Force -ErrorAction SilentlyContinue
    Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue

    $jdkUrls = @(
        "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse",
        "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.13%2B11/OpenJDK17U-jdk_x64_windows_hotspot_17.0.13_11.zip"
    )
    $downloaded = $false
    foreach ($url in $jdkUrls) {
        try {
            Invoke-WebRequest -Uri $url -OutFile $jdkZip -UseBasicParsing
            $downloaded = $true
            break
        }
        catch {
            Write-Warning "Falha ao baixar o JDK de $url : $($_.Exception.Message)"
            Remove-Item $jdkZip -Force -ErrorAction SilentlyContinue
        }
    }
    if (-not $downloaded) {
        throw "Não foi possível baixar o JDK 17. Verifique a conexão ou instale o Temurin 17 manualmente."
    }

    Expand-Archive -Path $jdkZip -DestinationPath $extractDir -Force

    $extracted = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
    if (-not $extracted) {
        throw "Não foi possível extrair o JDK 17 baixado."
    }

    if (Test-Path $jdkDir) {
        Remove-Item $jdkDir -Recurse -Force
    }
    Move-Item -Path $extracted.FullName -Destination $jdkDir

    Remove-Item $jdkZip -Force -ErrorAction SilentlyContinue
    Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
}
else {
    Write-Host "JDK 17 já encontrado em $jdkDir"
}

# 2. Apache Maven 3.9.9
$mvnDir = Join-Path $toolsDir "apache-maven-3.9.9"
$mvnBin = Join-Path $mvnDir "bin"

if (-not (Test-Path (Join-Path $mvnBin "mvn.cmd"))) {
    Write-Host "Baixando Apache Maven 3.9.9..."
    $mvnZip = Join-Path $env:TEMP "maven.zip"
    Remove-Item $mvnZip -Force -ErrorAction SilentlyContinue

    Invoke-WebRequest -Uri "https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip" -OutFile $mvnZip -UseBasicParsing
    Expand-Archive -Path $mvnZip -DestinationPath $toolsDir -Force
    Remove-Item $mvnZip -Force -ErrorAction SilentlyContinue
}
else {
    Write-Host "Maven 3.9.9 já encontrado em $mvnDir"
}

# 3. Node.js 20.18.0 LTS
$nodeDir = Join-Path $toolsDir "node-v20.18.0-win-x64"

if (-not (Test-Path (Join-Path $nodeDir "node.exe"))) {
    Write-Host "Baixando Node.js 20.18.0..."
    $nodeZip = Join-Path $env:TEMP "node.zip"
    Remove-Item $nodeZip -Force -ErrorAction SilentlyContinue

    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip" -OutFile $nodeZip -UseBasicParsing
    Expand-Archive -Path $nodeZip -DestinationPath $toolsDir -Force
    Remove-Item $nodeZip -Force -ErrorAction SilentlyContinue
}
else {
    Write-Host "Node.js 20.18.0 já encontrado em $nodeDir"
}

# 4. PATH do usuário (permanente)
$pathsToAdd = @(
    (Join-Path $jdkDir "bin"),
    $mvnBin,
    $nodeDir
)

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ([string]::IsNullOrWhiteSpace($userPath)) {
    $userPath = ""
}
$userParts = @($userPath -split ";" | Where-Object { $_ })
foreach ($path in $pathsToAdd) {
    if ($userParts -notcontains $path) {
        $userParts += $path
    }
}

$newUserPath = $userParts -join ";"
if ($newUserPath -ne $userPath) {
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
    Write-Host "PATH do usuário atualizado."
}
else {
    Write-Host "PATH do usuário já estava configurado."
}

# 5. JAVA_HOME (mantém um JDK 17+ já existente)
$existingJavaHome = $env:JAVA_HOME
if (-not (Test-Java17Home $existingJavaHome)) {
    $userJavaHome = [Environment]::GetEnvironmentVariable("JAVA_HOME", "User")
    if (Test-Java17Home $userJavaHome) {
        $existingJavaHome = $userJavaHome
    }
}

if (Test-Java17Home $existingJavaHome) {
    $env:JAVA_HOME = $existingJavaHome
    Write-Host "JAVA_HOME mantido: $existingJavaHome"
}
else {
    [Environment]::SetEnvironmentVariable("JAVA_HOME", $jdkDir, "User")
    $env:JAVA_HOME = $jdkDir
    Write-Host "JAVA_HOME definido para $jdkDir"
}

# Atualiza o PATH da sessão atual
Add-ToolPath

# 6. Verificação das ferramentas
Write-Host ""
Write-Host "Verificando ferramentas..."

$javaOutput = (& java -version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Java não executou corretamente.`n$javaOutput"
}
Write-Host (($javaOutput -split "`r?`n")[0])

$mvnOutput = (& mvn -version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Maven não executou corretamente.`n$mvnOutput"
}
Write-Host (($mvnOutput -split "`r?`n")[0])

$nodeOutput = (& node --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Node.js não executou corretamente.`n$nodeOutput"
}
Write-Host "Node.js $nodeOutput"

$npmOutput = (& npm --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "npm não executou corretamente.`n$npmOutput"
}
Write-Host "npm $npmOutput"

# 7. Compila o backend e instala as dependências do frontend
Write-Host ""
Write-Host "Compilando backend-rmi..."
Push-Location (Join-Path $RepoRoot "backend-rmi")
try {
    & mvn -B test-compile
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao compilar o backend (mvn test-compile)."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Instalando dependências do frontend..."
Push-Location (Join-Path $RepoRoot "frontend")
try {
    & npm install
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao instalar dependências do frontend (npm install)."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== AMBIENTE PRONTO ==="
Write-Host "Para subir tudo: .\scripts\start.cmd"
Write-Host "Ou:              .\scripts\run-all.ps1"
Write-Host "Para parar:      .\scripts\stop-all.ps1"
Write-Host "Se 'mvn' ou 'npm' não forem encontrados nesta janela, abra um novo PowerShell."
