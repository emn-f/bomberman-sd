# Funções compartilhadas pelos scripts PowerShell do Bomberman SD.
# Carregue com: . (Join-Path $PSScriptRoot "common.ps1")

$script:ScriptsDir = $PSScriptRoot
$script:RepoRoot = Split-Path -Parent $PSScriptRoot

function Get-ToolsDir {
    if ($env:USERPROFILE) {
        return (Join-Path $env:USERPROFILE "tools")
    }
    return (Join-Path $HOME "tools")
}

function Get-JavaMajor {
    param([string]$VersionOutput)

    if ($VersionOutput -match 'version "(\d+)(?:\.(\d+))?') {
        $major = [int]$Matches[1]
        if ($major -eq 1 -and $Matches[2]) {
            $major = [int]$Matches[2]
        }
        return $major
    }
    return 0
}

function Test-Java17Home {
    param([string]$JavaHome)

    if ([string]::IsNullOrWhiteSpace($JavaHome)) {
        return $false
    }

    $javaExe = Join-Path $JavaHome "bin\java.exe"
    $javacExe = Join-Path $JavaHome "bin\javac.exe"
    if (-not (Test-Path $javaExe) -or -not (Test-Path $javacExe)) {
        return $false
    }

    $output = & $javaExe -version 2>&1 | Out-String
    return ((Get-JavaMajor $output) -ge 17)
}

function Test-Java17OnPath {
    $java = Get-Command "java" -ErrorAction SilentlyContinue
    if (-not $java) {
        return $false
    }
    if (-not (Get-Command "javac" -ErrorAction SilentlyContinue)) {
        return $false
    }

    $output = & java -version 2>&1 | Out-String
    return ((Get-JavaMajor $output) -ge 17)
}

function Test-JavaEnvironment {
    if ($env:JAVA_HOME) {
        return (Test-Java17Home $env:JAVA_HOME)
    }
    return (Test-Java17OnPath)
}

function Test-Node18OnPath {
    $node = Get-Command "node" -ErrorAction SilentlyContinue
    if (-not $node) {
        return $false
    }

    $output = (& node --version 2>&1 | Out-String).Trim()
    if ($output -match "^v(\d+)") {
        return ([int]$Matches[1] -ge 18)
    }
    return $false
}

function Add-ToolPath {
    $toolsDir = Get-ToolsDir
    $candidates = @()

    $jdkDir = Join-Path $toolsDir "jdk-17"
    if (Test-Path (Join-Path $jdkDir "bin\java.exe")) {
        $candidates += (Join-Path $jdkDir "bin")
        if (-not (Test-Java17Home $env:JAVA_HOME)) {
            $env:JAVA_HOME = $jdkDir
        }
    }

    $mvnBin = Join-Path $toolsDir "apache-maven-3.9.9\bin"
    if (Test-Path (Join-Path $mvnBin "mvn.cmd")) {
        $candidates += $mvnBin
    }

    $nodeDir = Join-Path $toolsDir "node-v20.18.0-win-x64"
    if (Test-Path (Join-Path $nodeDir "node.exe")) {
        $candidates += $nodeDir
    }

    foreach ($path in $candidates) {
        $currentParts = @($env:PATH -split ";" | Where-Object { $_ })
        if ($currentParts -notcontains $path) {
            $env:PATH = "$path;$env:PATH"
        }
    }
}

function Assert-Command {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [string]$Hint = ""
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        $message = "Comando '$Name' não encontrado."
        if ($Hint) {
            $message += " $Hint"
        }
        throw $message
    }
}

function Assert-Port {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [string]$Name = "porta"
    )

    if ($Port -lt 1 -or $Port -gt 65535) {
        throw "$Name inválida: $Port."
    }
}

function Test-TcpPort {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [string]$TargetHost = "127.0.0.1",
        [int]$TimeoutMs = 500
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($TargetHost, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs)) {
            return $false
        }
        $client.EndConnect($async)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

function Wait-Port {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [int]$TimeoutSec = 120,
        [string]$Label = "porta $Port"
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    Write-Host "Aguardando $Label em 127.0.0.1:$Port ..."

    while ((Get-Date) -lt $deadline) {
        if (Test-TcpPort -Port $Port) {
            Write-Host "OK: $Label pronta."
            return $true
        }
        Start-Sleep -Milliseconds 500
    }

    Write-Warning "Timeout de ${TimeoutSec}s aguardando $Label."
    return $false
}

function Get-PortOwner {
    param([Parameter(Mandatory = $true)][int]$Port)

    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

function Stop-PortProcess {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [switch]$Force
    )

    $connection = Get-PortOwner -Port $Port
    if (-not $connection) {
        return
    }

    $procId = $connection.OwningProcess
    $process = Get-Process -Id $procId -ErrorAction SilentlyContinue
    $processName = if ($process) { $process.ProcessName } else { "desconhecido" }

    if (-not $Force) {
        throw "Porta $Port em uso por $processName (PID $procId). Use -Force ou rode .\scripts\stop-all.ps1."
    }

    Write-Host "Encerrando $processName (PID $procId) na porta $Port..."
    Stop-Process -Id $procId -Force -ErrorAction Stop

    for ($i = 0; $i -lt 20; $i++) {
        if (-not (Test-TcpPort -Port $Port)) {
            return
        }
        Start-Sleep -Milliseconds 250
    }

    throw "A porta $Port continua em uso após encerrar o processo $procId."
}

function Get-LanIPv4 {
    $configurations = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object { $null -ne $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" }

    foreach ($configuration in $configurations) {
        $addresses = @($configuration.IPv4Address | ForEach-Object { $_.IPAddress })
        foreach ($address in $addresses) {
            if ($address -and $address -ne "127.0.0.1" -and $address -notlike "169.254.*") {
                return $address
            }
        }
    }

    return $null
}

function Start-NewConsole {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][string]$ScriptPath,
        [string[]]$ScriptArgs = @()
    )

    $escapedTitle = $Title -replace "'", "''"
    $escapedPath = $ScriptPath -replace "'", "''"
    $argumentText = ($ScriptArgs | ForEach-Object {
        $value = [string]$_
        if ($value -match "\s|'") {
            "'" + ($value -replace "'", "''") + "'"
        }
        else {
            $value
        }
    }) -join " "

    $command = "`$Host.UI.RawUI.WindowTitle = '$escapedTitle'; & '$escapedPath' $argumentText"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))

    Start-Process -FilePath "powershell.exe" `
        -WorkingDirectory $RepoRoot `
        -ArgumentList @("-NoProfile", "-NoExit", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encoded) |
        Out-Null
}

function Open-BrowserWindow {
    param([Parameter(Mandatory = $true)][string]$Url)

    $candidates = @()

    if ($env:ProgramFiles) {
        $candidates += @{
            Path = (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe")
            Arguments = @("--new-window", $Url)
        }
        $candidates += @{
            Path = (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe")
            Arguments = @("--new-window", $Url)
        }
        $candidates += @{
            Path = (Join-Path $env:ProgramFiles "Mozilla Firefox\firefox.exe")
            Arguments = @("-new-window", $Url)
        }
    }

    if (${env:ProgramFiles(x86)}) {
        $candidates += @{
            Path = (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe")
            Arguments = @("--new-window", $Url)
        }
        $candidates += @{
            Path = (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe")
            Arguments = @("--new-window", $Url)
        }
    }

    if ($env:LOCALAPPDATA) {
        $candidates += @{
            Path = (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
            Arguments = @("--new-window", $Url)
        }
    }

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate.Path) {
            Start-Process -FilePath $candidate.Path -ArgumentList $candidate.Arguments | Out-Null
            return
        }
    }

    Start-Process $Url | Out-Null
}
