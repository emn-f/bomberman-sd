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

Acesse `http://localhost:3000` no computador que executa o projeto. Em outro computador na mesma rede, acesse `http://<IP-do-host>:3000`. A interface monta o endereço do bridge usando automaticamente o mesmo host e a porta escolhida (`8081` ou `8082`).
- **Aba 1:** Selecione Jogador 1 e conecte. O jogo fica em espera (`WAITING_FOR_PLAYERS`).
- **Aba 2 ou outro computador:** Selecione Jogador 2 e conecte. O jogo inicia automaticamente (`IN_PROGRESS`).

Para acesso pela rede, permita no firewall do computador host as portas TCP `3000`, `8081` e `8082`.
---

## 🎮 Controles no Jogo

- **Mover:** Teclas `W`, `A`, `S`, `D` ou Setas do teclado (ou botões no D-Pad da HUD). Consome 1 dos 4 movimentos disponíveis no turno.
- **Plantar Bomba:** Tecla `Espaço` ou botão **"Plantar Bomba (-1 AP)"**. É permitido plantar no máximo 1 bomba por turno.
- **Confirmar Turno:** Tecla `Enter` ou botão **"Confirmar Turno / Detonar"** (detona todas as bombas ativas em cruz de raio 2 e passa a vez).
- **Recursos por turno:** Cada turno começa com 4 movimentos e 1 AP (1 bomba). AP não utilizado não acumula para o turno seguinte.
