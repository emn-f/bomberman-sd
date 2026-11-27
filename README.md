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
│   ├── Projeto_II_Unidade_Entrega_1.pdf
│   ├── Projeto_II_Unidade_Entrega_2.pdf
│   └── Projeto_II_Unidade_Entrega_3.pdf
├── scripts/
│   ├── run-server.sh / .ps1    # Servidor RMI
│   ├── run-bridge.sh / .ps1    # Bridge Local (HTTP <-> RMI)
│   ├── run-frontend.sh / .ps1  # Frontend Vite
│   ├── run-all.ps1             # Sobe os 4 processos no Windows
│   ├── setup-env.ps1           # Prepara Java/Maven/Node no Windows
│   ├── stop-all.ps1            # Derruba os processos das portas
│   └── start.cmd / stop.cmd    # Atalhos de duplo clique no Windows
└── README.md
```

---

## 🚀 Como Executar

### Linux / macOS

#### 1. Iniciar o Servidor RMI
```bash
./scripts/run-server.sh
# Ou manualmente:
cd backend-rmi
mvn exec:java -Dexec.mainClass="server.ServerMain" -Dexec.args="1099"
```

#### 2. Iniciar os Bridges Locais (Dois Jogadores)
Para testar o modo 1v1 em duas abas no mesmo computador, inicie duas instâncias do bridge:

**Terminal 1 (Jogador 1 na porta 8081):**
```bash
./scripts/run-bridge.sh 8081 1099 localhost
```

**Terminal 2 (Jogador 2 na porta 8082):**
```bash
./scripts/run-bridge.sh 8082 1099 localhost
```

#### 3. Iniciar o Frontend React
```bash
./scripts/run-frontend.sh
# Ou:
cd frontend
npm run dev
```

### Windows (PowerShell)

O caminho mais rápido é o `start.cmd`, que sobe **servidor + bridge 8081 + bridge 8082 + frontend** em janelas separadas e aguarda cada serviço ficar pronto:

```bat
scripts\start.cmd
```

Na primeira execução, se Java 17, Maven ou Node ainda não estiverem disponíveis, o script chama o `setup-env.ps1` automaticamente (instala tudo em `%USERPROFILE%\tools`, sem precisar de administrador) e compila o projeto.

Também é possível chamar o orquestrador direto:

```powershell
# Sobe tudo em localhost
powershell -ExecutionPolicy Bypass -File scripts\run-all.ps1

# Sobe usando o IPv4 da máquina na LAN (para testar de outro dispositivo)
powershell -ExecutionPolicy Bypass -File scripts\run-all.ps1 -Lan

# Não abre as duas janelas do navegador
powershell -ExecutionPolicy Bypass -File scripts\run-all.ps1 -NoBrowser

# Derruba os processos das portas 1099/8081/8082/3000
powershell -ExecutionPolicy Bypass -File scripts\stop-all.ps1 -Force
# ou: scripts\stop.cmd
```

Para controlar cada processo manualmente no PowerShell:

```powershell
.\scripts\setup-env.ps1          # só na primeira vez
.\scripts\run-server.ps1
.\scripts\run-bridge.ps1 8081 1099 127.0.0.1
.\scripts\run-bridge.ps1 8082 1099 127.0.0.1
.\scripts\run-frontend.ps1
```

Acesse `http://localhost:3000` no computador que executa o projeto. Em outro computador na mesma rede, acesse `http://<IP-do-host>:3000`. A interface monta o endereço do bridge usando automaticamente o mesmo host e a porta escolhida (`8081` ou `8082`).
- **Aba 1:** Selecione Jogador 1 e conecte. O jogo fica em espera (`WAITING_FOR_PLAYERS`).
- **Aba 2 ou outro computador:** Selecione Jogador 2 e conecte. O jogo inicia automaticamente (`IN_PROGRESS`).

Para acesso pela rede, permita no firewall do computador host as portas TCP `3000`, `8081` e `8082`.
---

## 🎮 Controles no Jogo

- **Mover:** Teclas `W`, `A`, `S`, `D` ou Setas do teclado (ou botões no D-Pad da HUD). Consome 1 passo por deslocamento.
- **Plantar Bomba:** Tecla `Espaço` ou botão **"Plantar Bomba (-1 AP)"**. Consome 1 AP e não encerra o turno, permitindo usar os passos restantes para fuga em "L".
- **Confirmar Turno:** Tecla `Enter` ou botão **"Confirmar Turno / Detonar"** (detona todas as bombas ativas em cruz de raio 2 e passa a vez). Quando o jogador esgota todos os passos e AP possíveis, a auto-finalização (`AUTO-PASS`) confirma o turno após 1 segundo.
- **Progressão Balanceada por Turno:**
  - **Passos:** inicia em **4** no Turno 1, sobe para **5** no Turno 2 e atinge o teto de **6 passos** a partir do Turno 3.
  - **Bombas (AP):** **1 bomba** nos Turnos 1 a 3, subindo para o teto de **2 bombas** a partir do Turno 4 (AP não acumulado entre turnos).
