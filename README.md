# Bomberman Multiplayer em Turnos (1v1) - Sistemas Distribuídos

Projeto de Bomberman Multiplayer baseado em turnos utilizando **Java RMI**, **Local HTTP Adapter (Bridge)** no cliente e **React + HTML5 Canvas** no frontend, desenvolvido para a disciplina de Sistemas Distribuídos.

---

## 📁 Estrutura do Monorepo

```
├── backend-rmi/
│   ├── pom.xml
│   └── src/
│       ├── main/java/
│       │   ├── shared/         # Interfaces RMI, DTOs, Enums e Exceções
│       │   ├── server/         # BombermanServiceImpl e ServerMain (RMI Registry)
│       │   └── clientbridge/   # ClientBridgeMain (HTTP Server <-> RMI Stub)
│       └── test/java/server/   # Testes unitários JUnit 5 de mecânicas e concorrência
├── frontend/                   # Aplicação React 18 + Vite + TypeScript + HTML5 Canvas
├── docs/
│   └── RELATORIO_TECNICO.md    # Relatório Técnico completo (6 seções obrigatórias)
├── run-server.sh               # Script de execução rápida do Servidor RMI
├── run-bridge.sh               # Script de execução do Bridge Local
└── run-frontend.sh             # Script de execução do Frontend Vite
```

---

## 🚀 Como Executar

### 1. Iniciar o Servidor RMI
```bash
./run-server.sh
# Ou manualmente:
cd backend-rmi
mvn exec:java -Dexec.mainClass="server.ServerMain" -Dexec.args="1099"
```

### 2. Iniciar os Bridges Locais (Dois Jogadores)
Para testar o modo 1v1 em duas abas no mesmo computador, inicie duas instâncias do bridge:

**Terminal 1 (Jogador 1 na porta 8081):**
```bash
./run-bridge.sh 8081 1099 localhost
```

**Terminal 2 (Jogador 2 na porta 8082):**
```bash
./run-bridge.sh 8082 1099 localhost
```

### 3. Iniciar o Frontend React
```bash
./run-frontend.sh
# Ou:
cd frontend
npm run dev
```

Acesse `http://localhost:3000`:
- **Aba 1:** Conecte no bridge `http://localhost:8081` (Jogador 1, P1). Fica em espera (`WAITING_FOR_PLAYERS`).
- **Aba 2:** Altere o campo Bridge URL no topo para `http://localhost:8082` e conecte (Jogador 2, P2). O jogo inicia automaticamente (`IN_PROGRESS`).

---

## 🎮 Controles no Jogo

- **Mover:** Teclas `W`, `A`, `S`, `D` ou Setas do teclado (ou botões no D-Pad da HUD). Consome 1 movimento de 4.
- **Plantar Bomba:** Tecla `Espaço` ou botão **"Plantar Bomba (-1 AP)"**.
- **Confirmar Turno:** Tecla `Enter` ou botão **"Confirmar Turno / Detonar"** (detona todas as bombas ativas em cruz de raio 2 e passa a vez).
- **Economia de Bombas:** Passar o turno sem plantar bombas garante **+1 AP de bônus** extra para a próxima rodada!
