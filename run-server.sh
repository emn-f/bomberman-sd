#!/usr/bin/env bash
set -e

export PATH="$HOME/.local/bin:$PATH"

PORT=${1:-1099}
HOST=${2:-127.0.0.1}

echo "=== INICIANDO BOMBERMAN RMI SERVER ==="
echo "Porta RMI: $PORT | Host: $HOST"

cd "$(dirname "$0")/backend-rmi"
mvn compile exec:java -Dexec.mainClass="server.ServerMain" -Dexec.args="$PORT" -Djava.rmi.server.hostname="$HOST"
