import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BridgeApi } from './api';
import { GameBoardCanvas } from './components/GameBoardCanvas';
import { HUD } from './components/HUD';
import { Direction, GameStateDTO, PlayerDTO } from './types';
import { Wifi, Flame, UserCheck, RefreshCw, LogOut } from 'lucide-react';

export const App: React.FC = () => {
  const [bridgeUrl, setBridgeUrl] = useState<string>('http://localhost:8081');
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
      showError('Por favor, informe seu nome.');
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
          // Se o jogador local foi removido do servidor (ex: partida reiniciada por nova conexão), volta ao lobby
          const stillInMatch = state.players.some(p => p.id === localPlayer.id && p.nome === localPlayer.nome);
          if (!stillInMatch && state.status !== 'FINISHED') {
            setLocalPlayer(null);
            setGameState(null);
            return;
          }
          setGameState(state);
        }
      } catch (err) {
        // Silently keep polling or log
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
      // Don't intercept typing in input fields
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950 text-gray-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-xl shadow-lg shadow-rose-950/50">
            <Flame className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300 bg-clip-text text-transparent font-arcade">
              BOMBERMAN 1v1
            </h1>
            <p className="text-[10px] text-gray-400 font-mono">Sistemas Distribuídos • Java RMI + Bridge REST</p>
          </div>
        </div>

        {/* Bridge URL Configuration */}
        <div className="flex items-center gap-2 bg-gray-900/80 p-1.5 px-3 rounded-xl border border-gray-800 text-xs">
          <Wifi className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-gray-400 font-medium">Bridge URL:</span>
          <input
            type="text"
            value={bridgeUrl}
            onChange={(e) => handleBridgeUrlChange(e.target.value)}
            disabled={!!localPlayer}
            placeholder="http://localhost:8081"
            className="bg-gray-800 text-indigo-200 px-2 py-1 rounded border border-gray-700 w-44 font-mono text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          />
          {localPlayer && (
            <button
              onClick={handleDisconnect}
              title="Desconectar do jogo"
              className="ml-2 flex items-center gap-1 px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded text-xs transition"
            >
              <LogOut className="w-3 h-3" /> Sair
            </button>
          )}
        </div>
      </header>

      {/* Main Game Arena */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 max-w-7xl mx-auto w-full">
        {!localPlayer ? (
          /* Join Game Modal / Screen */
          <div className="w-full max-w-md p-8 bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-indigo-500/30 shadow-2xl shadow-indigo-950/60 text-center animate-fade-in">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-900/50">
              <UserCheck className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-xl font-black text-gray-100 font-arcade mb-2">ENTRAR NA PARTIDA</h2>
            <p className="text-xs text-gray-400 mb-6">
              Insira seu apelido para conectar ao Bridge local e entrar no grid 9x9.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs rounded-xl text-left">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleConnect} className="flex flex-col gap-4 text-left">
              <div>
                <label className="text-xs font-bold text-gray-300 mb-1 block">Apelido do Jogador</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Ex: Bomberman Azul"
                  maxLength={16}
                  className="w-full px-4 py-3 bg-gray-800 text-gray-100 rounded-xl border border-gray-700 focus:outline-none focus:border-indigo-500 font-bold"
                  autoFocus
                />
              </div>

              <div className="text-[11px] text-gray-400 bg-gray-950/60 p-3 rounded-xl border border-gray-800/80">
                💡 <span className="font-semibold text-gray-300">Dica Multi-Aba:</span> Suba o <code className="text-indigo-300 font-mono">Bridge 1</code> na porta <code className="text-indigo-300 font-mono">8081</code> e o <code className="text-indigo-300 font-mono">Bridge 2</code> na porta <code className="text-indigo-300 font-mono">8082</code> para jogar em duas abas!
              </div>

              <button
                type="submit"
                disabled={isConnecting}
                className="mt-2 w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-xl shadow-indigo-950/60 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Conectando...
                  </>
                ) : (
                  'Conectar e Jogar'
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Active Game View: Board Canvas + HUD */
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 w-full max-w-5xl">
            {/* Canvas Board (9x9) */}
            <div className="flex flex-col items-center">
              <GameBoardCanvas gameState={gameState} localPlayer={localPlayer} />
              <div className="mt-2 text-center text-xs text-gray-400 font-mono">
                Teclas: <span className="text-amber-300 font-bold">WASD / Setas</span> (Mover) • <span className="text-amber-300 font-bold">Espaço</span> (Bomba) • <span className="text-emerald-400 font-bold">Enter</span> (Confirmar)
              </div>
            </div>

            {/* Sidebar HUD */}
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
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 bg-gray-950/60 py-2.5 px-6 text-center text-[11px] text-gray-500">
        Trabalho Prático de Sistemas Distribuídos • Java RMI + JRMP + HTTP Bridge + React Canvas
      </footer>
    </div>
  );
};

export default App;
