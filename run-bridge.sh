#!/usr/bin/env bash
set -e

export PATH="$HOME/.local/bin:$PATH"

HTTP_PORT=${1:-8081}
RMI_PORT=${2:-1099}
RMI_HOST=${3:-localhost}

echo "=== INICIANDO BOMBERMAN LOCAL HTTP BRIDGE ==="
echo "Porta HTTP: $HTTP_PORT | RMI Host: $RMI_HOST | Porta RMI: $RMI_PORT"

cd "$(dirname "$0")/backend-rmi"
mvn compile exec:java -Dexec.mainClass="clientbridge.ClientBridgeMain" -Dexec.args="-httpPort $HTTP_PORT -rmiPort $RMI_PORT -rmiHost $RMI_HOST"
