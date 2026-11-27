[CmdletBinding()]
param(
    [int[]]$Ports = @(1099, 8081, 8082, 3000),
    [switch]$Force
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "common.ps1")

$connections = @()
foreach ($port in $Ports) {
    $connection = Get-PortOwner -Port $port
    if ($connection) {
        $connections += $connection
    }
}

if ($connections.Count -eq 0) {
    Write-Host "Nenhum processo escutando nas portas: $($Ports -join ', ')."
    return
}

$rows = foreach ($connection in $connections) {
    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        Porta = $connection.LocalPort
        PID = $connection.OwningProcess
        Processo = if ($process) { $process.ProcessName } else { "desconhecido" }
    }
}

$rows | Sort-Object Porta | Format-Table -AutoSize

if (-not $Force) {
    $answer = Read-Host "Encerrar esses processos? [s/N]"
    if ($answer -notmatch "^[sSyY]") {
        Write-Host "Cancelado."
        return
    }
}

foreach ($procId in ($rows.PID | Sort-Object -Unique)) {
    try {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Host "Processo $procId encerrado."
    }
    catch {
        Write-Warning "Falha ao encerrar o processo ${procId}: $($_.Exception.Message)"
    }
}
