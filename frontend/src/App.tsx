import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BridgeApi } from './api';
import { GameBoardCanvas } from './components/GameBoardCanvas';
import { HUD } from './components/HUD';
import { Direction, GameStateDTO, PlayerDTO } from './types';
import { ArrowRight, RefreshCw, Power, ShieldAlert } from 'lucide-react';

const bridgeUrlForPort = (port: number) =>
  'http://' + (window.location.hostname || 'localhost') + ':' + port;

export const App: React.FC = () => {
  const [bridgeUrl, setBridgeUrl] = useState<string>(bridgeUrlForPort(8081));
  const [playerName, setPlayerName] = useState<string>('');
  const [localPlayer, setLocalPlayer] = useState<PlayerDTO | null>(null);
  const [gameState, setGameState] = useState<GameStateDTO | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiRef = useRef<BridgeApi>(new BridgeApi(bridgeUrl));
  const errorTimeoutRef = useRef<number | null>(null);

  const showError = useCallback((msg: string) => {
    setErrorMessage(msg);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = window.setTimeout(() => {
      setErrorMessage(null);
    }, 4000);
  }, []);

  const handleBridgeUrlChange = (url: string) => {
    setBridgeUrl(url);
    apiRef.current.setBaseUrl(url);
  };

  // Connect player
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      showError('Por favor, informe seu apelido.');
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const player = await apiRef.current.connect(playerName.trim());
      setLocalPlayer(player);
      const state = await apiRef.current.getState();
      setGameState(state);
    } catch (err: any) {
      showError(err.message || 'Falha ao conectar no jogo.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect player
  const handleDisconnect = async () => {
    if (!localPlayer) return;
    try {
      await apiRef.current.disconnect(localPlayer.id);
    } catch (err) {
      console.warn('Erro ao desconectar:', err);
    } finally {
      setLocalPlayer(null);
      setGameState(null);
    }
  };

  // Action: Move
  const handleMove = useCallback(async (dir: Direction) => {
    if (!localPlayer || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const newState = await apiRef.current.move(localPlayer.id, dir);
      setGameState(newState);
      setErrorMessage(null);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  }, [localPlayer, isActionLoading, showError]);

  // Action: Plant Bomb
  const handlePlantBomb = useCallback(async () => {
    if (!localPlayer || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const newState = await apiRef.current.plantBomb(localPlayer.id);
      setGameState(newState);
      setErrorMessage(null);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  }, [localPlayer, isActionLoading, showError]);

  // Action: Confirm Turn
  const handleConfirmTurn = useCallback(async () => {
    if (!localPlayer || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const newState = await apiRef.current.confirmTurn(localPlayer.id);
      setGameState(newState);
      setErrorMessage(null);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  }, [localPlayer, isActionLoading, showError]);

  // Action: Restart Match (Rematch)
  const handleRestartMatch = useCallback(async () => {
    if (!localPlayer || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const newState = await apiRef.current.restartMatch();
      setGameState(newState);
      setErrorMessage(null);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  }, [localPlayer, isActionLoading, showError]);

  // Polling: 300ms interval for real-time game state synchronization
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      if (!localPlayer) return;
      try {
        const state = await apiRef.current.getState();
        if (isMounted) {
          const stillInMatch = state.players.some(
            p => p.id === localPlayer.id && p.nome === localPlayer.nome
          );
          if (!stillInMatch && state.status !== 'FINISHED') {
            setLocalPlayer(null);
            setGameState(null);
            return;
          }
          setGameState(state);
        }
      } catch (err) {
        // Silently keep polling
      }
    }, 300);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [localPlayer]);

  // Keyboard controls listener (WASD, Arrows, Space, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (!localPlayer || !gameState || gameState.status !== 'IN_PROGRESS') return;
      if (gameState.currentTurnPlayerId !== localPlayer.id) return;

      const key = e.key.toLowerCase();

      if (key === 'w' || key === 'arrowup') {
        e.preventDefault();
        handleMove('UP');
      } else if (key === 's' || key === 'arrowdown') {
        e.preventDefault();
        handleMove('DOWN');
      } else if (key === 'a' || key === 'arrowleft') {
        e.preventDefault();
        handleMove('LEFT');
      } else if (key === 'd' || key === 'arrowright') {
        e.preventDefault();
        handleMove('RIGHT');
      } else if (key === ' ') {
        e.preventDefault();
        handlePlantBomb();
      } else if (key === 'enter') {
        e.preventDefault();
        handleConfirmTurn();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localPlayer, gameState, handleMove, handlePlantBomb, handleConfirmTurn]);

  const isPort8081 = bridgeUrl.includes('8081');
  const isPort8082 = bridgeUrl.includes('8082');

  const isMyTurn =
    gameState?.status === 'IN_PROGRESS' &&
    localPlayer &&
    gameState.currentTurnPlayerId === localPlayer.id;

  const currentPlayer = gameState?.players.find(p => p.id === gameState.currentTurnPlayerId);

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface flex flex-col justify-between micro-dot-bg selection:bg-primary-container selection:text-surface-container-lowest">
      {/* Header Minimalista */}
      <header className="w-full h-14 px-6 flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-primary-container font-telemetry-md text-telemetry-md">❖</span>
          <span className="font-headline-sm text-headline-sm font-bold tracking-wider text-on-surface uppercase">
            BOMBERMAN <span className="text-primary-container">1v1</span>
          </span>
        </div>

        <div className="flex items-center gap-3 font-telemetry-sm text-telemetry-sm text-on-surface-variant">
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span className="tracking-wide hidden sm:inline">
              {localPlayer
                ? `${localPlayer.nome} (${localPlayer.id}) • ${bridgeUrl}`
                : `BRIDGE ${isPort8081 ? ':8081' : ':8082'} • PRONTO`}
            </span>
          </span>

          {localPlayer && (
            <button
              onClick={handleDisconnect}
              title="Sair da partida"
              className="flex items-center gap-1 px-2.5 py-1 bg-error-container/80 text-on-error-container border border-on-tertiary-container rounded text-xs hover:bg-on-tertiary-container hover:text-tertiary transition-colors"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      {!localPlayer ? (
        /* Lobby Minimalista */
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-[420px] bg-surface-container/90 border border-outline-variant/60 rounded-lg p-8 backdrop-blur-md shadow-2xl relative">
            {/* Cantoneiras sutis */}
            <div className="absolute -top-px -left-px w-2.5 h-2.5 border-t-2 border-l-2 border-primary-container" />
            <div className="absolute -bottom-px -right-px w-2.5 h-2.5 border-b-2 border-r-2 border-primary-container" />

            {/* Cabeçalho do Card */}
            <div className="text-center mb-6">
              <h1 className="font-headline-lg text-3xl font-bold text-on-surface tracking-tight">
                Bomberman 1v1
              </h1>
              <p className="font-body-md text-sm text-on-surface-variant mt-1.5">
                Escolha sua porta e informe seu apelido para jogar
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3 bg-error-container/40 border border-on-tertiary-container rounded text-on-error-container font-telemetry-sm text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-error" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Formulário Minimalista */}
            <form onSubmit={handleConnect} className="space-y-5">
              {/* Segmented Control: Escolha de Jogador e Porta */}
              <div>
                <label className="block font-telemetry-sm text-telemetry-sm text-on-surface-variant uppercase mb-1.5 tracking-wider">
                  Alocação de Porta
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-container-lowest border border-outline-variant/40 rounded">
                  <button
                    type="button"
                    onClick={() => handleBridgeUrlChange(bridgeUrlForPort(8081))}
                    className={`py-2.5 px-3 font-telemetry-md text-telemetry-md text-center rounded transition-all duration-150 ${
                      isPort8081
                        ? 'bg-surface-container-high text-primary-container border border-primary-container/40 shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    Jogador 1 (:8081)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBridgeUrlChange(bridgeUrlForPort(8082))}
                    className={`py-2.5 px-3 font-telemetry-md text-telemetry-md text-center rounded transition-all duration-150 ${
                      isPort8082
                        ? 'bg-surface-container-high text-primary-container border border-primary-container/40 shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    Jogador 2 (:8082)
                  </button>
                </div>
              </div>

              {/* Campo de Texto: Apelido */}
              <div>
                <label
                  htmlFor="nickname"
                  className="block font-telemetry-sm text-telemetry-sm text-on-surface-variant uppercase mb-1.5 tracking-wider"
                >
                  Seu Apelido
                </label>
                <div className="relative">
                  <input
                    id="nickname"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Ex: BLASTER_01"
                    maxLength={16}
                    autoFocus
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 focus:border-primary-container focus:ring-1 focus:ring-primary-container rounded px-4 py-2.5 font-telemetry-md text-telemetry-md text-on-surface placeholder:text-on-surface-variant/40 transition-colors outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-on-surface-variant/40 font-telemetry-sm text-telemetry-sm select-none">
                    _
                  </span>
                </div>
              </div>

              {/* Botão Primário: Entrar na Partida */}
              <button
                type="submit"
                disabled={isConnecting}
                className="w-full py-3 px-4 bg-primary-container text-surface-container-lowest font-headline-sm text-headline-sm font-bold chamfer-btn glow-cyan transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar na Partida</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </main>
      ) : (
        /* Arena de Combate */
        <main className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 p-4 lg:p-6 max-w-6xl mx-auto w-full">
          {/* Coluna Esquerda: Tabuleiro 9x9 */}
          <section className="flex flex-col items-center">
            {/* Barra de Status Compacta Acima do Tabuleiro */}
            <div className="w-full bg-surface-container border border-outline-variant/60 px-3.5 py-2 mb-3 flex items-center justify-between gap-2 rounded-t">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-surface-container-lowest border border-primary-container/60 font-telemetry-md text-xs text-primary-container font-bold">
                  TURNO #{String(gameState?.turnNumber || 1).padStart(2, '0')}
                </span>
                <span className="font-telemetry-sm text-xs text-on-surface-variant">
                  {gameState?.status === 'WAITING_FOR_PLAYERS' && '⏳ Aguardando Jogador 2'}
                  {gameState?.status === 'IN_PROGRESS' && '⚔️ Em Combate'}
                  {gameState?.status === 'FINISHED' && '🏆 Partida Finalizada'}
                </span>
              </div>

              {gameState?.status === 'IN_PROGRESS' && (
                <span
                  className={`px-2.5 py-0.5 font-telemetry-sm text-xs font-bold ${
                    isMyTurn
                      ? 'bg-primary-container text-surface-container-lowest'
                      : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/50'
                  }`}
                >
                  {isMyTurn ? 'SUA VEZ!' : `Vez de ${currentPlayer?.nome || 'Oponente'}`}
                </span>
              )}
            </div>

            <GameBoardCanvas gameState={gameState} localPlayer={localPlayer} />
          </section>

          {/* Coluna Direita: HUD */}
          <HUD
            gameState={gameState}
            localPlayer={localPlayer}
            onMove={handleMove}
            onPlantBomb={handlePlantBomb}
            onConfirmTurn={handleConfirmTurn}
            onRestartMatch={handleRestartMatch}
            isActionLoading={isActionLoading}
            errorMessage={errorMessage}
          />
        </main>
      )}

      {/* Rodapé Ultraleve */}
      <footer className="w-full py-2.5 text-center font-telemetry-sm text-telemetry-sm text-on-surface-variant/40 select-none">
        <span>SISTEMAS DISTRIBUÍDOS // JAVA RMI</span>
      </footer>
    </div>
  );
};

export default App;
