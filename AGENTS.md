# AGENTS.md

## Estrutura e verificação

- Dois módulos independentes, sem build root: `backend-rmi/` (Java 17 + Maven, JUnit 5, Gson) e `frontend/` (React 18 + Vite 6 + TypeScript). Não há CI, lint nem `npm test`; validação é `cd backend-rmi && mvn clean compile test` (10 testes em `server.BombermanGameTest`) e `cd frontend && npm run build` (`tsc && vite build`).
- Teste isolado: `cd backend-rmi && mvn -Dtest='BombermanGameTest#testProgressiveMovementAndBombsWithCap' test`.
- O navegador não fala JRMP: cada jogador executa um `ClientBridgeMain` separado, que faz `Naming.lookup` no RMI e expõe HTTP/JSON. `shared/` é o contrato comum (DTOs, enum, exceções); as regras ficam só no servidor (`BombermanServiceImpl`, `ReentrantLock(true)`).
- Os testes manipulam o mapa com `new Random(12345)` e os helpers públicos `setCell/getCell` para abrir caminhos no tabuleiro 9x9. Produção usa `Random(42)`; revanche/reset usa `new Random()` (mapa novo).

## Executando

- Prefira os scripts em `scripts/`: os `.sh` exportam `PATH="$HOME/.local/bin:$PATH"` e rodam `mvn compile exec:java` (recompilam automaticamente). Se chamar Maven/npm direto, replique esse PATH se os binários não forem encontrados.
- Um 1v1 local exige **4 processos**: `./scripts/run-server.sh`, `./scripts/run-bridge.sh 8081 1099 localhost`, `./scripts/run-bridge.sh 8082 1099 localhost`, `./scripts/run-frontend.sh` (Vite em `:3000`, `host: true`).
- Sintaxe: `scripts/run-server.sh [RMI_PORT] [RMI_HOST]`; `scripts/run-bridge.sh [HTTP_PORT] [RMI_PORT] [RMI_HOST]`. Em LAN, o 2º arg do servidor vira `-Djava.rmi.server.hostname` — use o IP da máquina servidora, não `127.0.0.1`, e passe esse mesmo IP como `RMI_HOST` dos bridges; libere TCP `1099`, `8081`, `8082`, `3000`.
- No Windows, `scripts\start.cmd` (ou `scripts\run-all.ps1`) sobe os 4 processos em janelas separadas, espera cada porta e roda o `setup-env.ps1` automaticamente se faltar Java 17/Maven/Node. `scripts\stop-all.ps1 -Force` derruba os processos das portas. Os `.ps1` são compatíveis com Windows PowerShell 5.1 e foram validados com `pwsh` (parser + PSScriptAnalyzer).
- O bridge aceita `RMI_HOST`, `RMI_PORT` e `HTTP_PORT` como variáveis de ambiente, que **sobrescrevem** os argumentos posicionais. Ele escuta em `0.0.0.0` e responde CORS `*`.
- O frontend monta a URL do bridge com `window.location.hostname` (não `localhost`) e só oferece 8081/8082 na UI; abrir a página pelo IP da máquina faz o navegador usar `<IP>:8081` ou `<IP>:8082`.

## Comportamento que costuma confundir

- Números atuais (fonte: `shared/PlayerDTO.java` e testes): 4 passos no turno 1, 5 no turno 2, teto 6 no 3+; 1 bomba (AP) até o turno 3, 2 a partir do turno 4. AP não acumula entre turnos.
- `confirmarTurno` detona **todas** as bombas ativas de uma vez e alterna a vez. O fogo fica no tabuleiro até a próxima ação (`clearFireIfAny`); um snapshot logo após confirmar mostra `CELL_FIRE`, não célula vazia.
- Auto-confirmação do turno após 1s (sem passos e sem AP, ou sem passos e em cima de uma bomba) vive em `frontend/src/App.tsx`, não no servidor. O mesmo arquivo faz polling de `/api/state` a cada 300ms e dispara `/api/disconnect` via `sendBeacon` no `pagehide`.
- `reiniciarPartida()` só funciona após `FINISHED`; com um jogador restante, prepara a revanche e espera o oponente. Desconexão durante `IN_PROGRESS` é W.O. para quem ficou.

## Documentação

- `docs/*.md` e `docs/*.txt` são ignorados pelo `.gitignore` (só os PDFs das entregas são versionados); alterações neles não aparecem no `git status`.
- `docs/RELATORIO_TECNICO.md`, `docs/ENTREGA_3.md` e `docs/resumo_essencial.txt` estão desatualizados (ex.: "5→8→12 passos", "6 testes"). Para regras e números, confie no código e nos testes; o `README.md` está alinhado com a implementação.
