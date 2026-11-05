import React, { useEffect, useState } from 'react';
import { Direction, GameStateDTO, PlayerDTO } from '../types';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bomb,
  Rocket,
  ShieldAlert,
  Award,
  Skull,
  Scale,
  RotateCcw,
  Terminal,
  Zap,
  Network
} from 'lucide-react';

interface HUDProps {
  gameState: GameStateDTO | null;
  localPlayer: PlayerDTO | null;
  onMove: (dir: Direction) => void;
  onPlantBomb: () => void;
  onConfirmTurn: () => void;
  onRestartMatch: () => void;
  isActionLoading: boolean;
  errorMessage: string | null;
}

interface LogEntry {
  id: number;
  time: string;
  tag: 'RMI_BRIDGE' | 'MATCH' | 'ACTION' | 'ALERT';
  message: string;
}

export const HUD: React.FC<HUDProps> = ({
  gameState,
  localPlayer,
  onMove,
  onPlantBomb,
  onConfirmTurn,
  onRestartMatch,
  isActionLoading,
  errorMessage
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!gameState?.lastActionMessage) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLogs(prev => {
      if (prev.length > 0 && prev[prev.length - 1].message === gameState.lastActionMessage) {
        return prev;
      }
      const msg = gameState.lastActionMessage;
      const tag: LogEntry['tag'] =
        msg.toLowerCase().includes('bomba') || msg.toLowerCase().includes('explos')
          ? 'ALERT'
          : msg.toLowerCase().includes('turno') || msg.toLowerCase().includes('venceu')
          ? 'MATCH'
          : 'ACTION';
      return [...prev.slice(-14), { id: Date.now(), time: timeStr, tag, message: msg }];
    });
  }, [gameState?.lastActionMessage]);

  if (!gameState) return null;

  const myPlayerInState = gameState.players.find(p => p.id === localPlayer?.id);

  const isMyTurn =
    gameState.status === 'IN_PROGRESS' &&
    localPlayer &&
    gameState.currentTurnPlayerId === localPlayer.id;
  const isAlive = myPlayerInState ? myPlayerInState.vivo : false;

  const apCount = myPlayerInState?.ap ?? 0;
  const movementLeft = myPlayerInState?.movementLeft ?? 0;
  const maxMovement = myPlayerInState?.maxMovement ?? 5;
  const myTurnsPlayed = myPlayerInState?.turnsPlayed ?? 1;

  // Format padded numbers like 03 AP, 04 / 12
  const pad2 = (n: number) => String(n).padStart(2, '0');

  return (
    <aside className="flex flex-col justify-between w-full lg:w-[430px] border border-outline-variant bg-surface-container p-4 z-40 shadow-2xl relative">
      {/* Cybernetic Corner Ticks */}
      <span className="absolute top-1 left-1 font-badge-code text-badge-code text-primary-container select-none">+</span>
      <span className="absolute top-1 right-1 font-badge-code text-badge-code text-primary-container select-none">+</span>
      <span className="absolute bottom-1 left-1 font-badge-code text-badge-code text-primary-container select-none">+</span>
      <span className="absolute bottom-1 right-1 font-badge-code text-badge-code text-primary-container select-none">+</span>

      <div className="flex flex-col gap-3.5">
        {/* Console Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-outline-variant">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-surface-container-high border border-primary-container flex items-center justify-center text-primary-container">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold tracking-wide text-primary leading-none">
                CANAL TÁTICO HUD
              </h2>
              <p className="font-telemetry-sm text-telemetry-sm text-on-surface-variant mt-0.5">
                PONTE RMI // JRMP SYNC // TURNO #{pad2(gameState.turnNumber || 1)}
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-surface-container-high border border-primary-container text-primary-container font-badge-code text-badge-code">
            [SYS_OK]
          </span>
        </div>

        {/* Match Result Banner (Victory / Defeat / Draw) */}
        {gameState.status === 'FINISHED' && (() => {
          const isDraw = gameState.winnerId === 'EMPATE';
          const isWinner = !isDraw && localPlayer && gameState.winnerId === localPlayer.id;

          let bannerContent;
          if (isDraw) {
            bannerContent = (
              <div className="p-4 bg-surface-container-lowest border-2 border-outline text-center relative">
                <Scale className="w-8 h-8 text-on-surface-variant mx-auto mb-1" />
                <span className="font-badge-code text-badge-code text-outline block mb-0.5">[DESFECHO: MÚTUA DESTRUIÇÃO]</span>
                <h3 className="text-lg font-black text-on-surface font-arcade">EMPATE!</h3>
                <p className="text-xs font-telemetry-sm text-on-surface-variant mt-1">
                  AMBOS OS OPERADORES FORAM ELIMINADOS NA DETONAÇÃO.
                </p>
              </div>
            );
          } else if (isWinner) {
            bannerContent = (
              <div className="p-4 bg-surface-container-lowest border-2 border-primary-container glow-cyan text-center relative">
                <Award className="w-8 h-8 text-primary-container mx-auto mb-1 animate-bounce" />
                <span className="font-badge-code text-badge-code text-primary-container block mb-0.5">[SUPREMACIA CONFIRMADA]</span>
                <h3 className="text-lg font-black text-primary-container font-arcade">VITÓRIA!</h3>
                <p className="text-xs font-telemetry-sm text-primary mt-1">
                  VOCÊ DOMINOU A ARENA 9x9! ({gameState.winnerName})
                </p>
              </div>
            );
          } else {
            bannerContent = (
              <div className="p-4 bg-error-container/30 border-2 border-on-tertiary-container glow-crimson text-center relative">
                <Skull className="w-8 h-8 text-error mx-auto mb-1 animate-pulse" />
                <span className="font-badge-code text-badge-code text-error block mb-0.5">[OPERADOR NEUTRALIZADO]</span>
                <h3 className="text-lg font-black text-error font-arcade">DERROTA!</h3>
                <p className="text-xs font-telemetry-sm text-on-error-container mt-1">
                  VOCÊ FOI ELIMINADO! VENCEDOR: {gameState.winnerName} ({gameState.winnerId})
                </p>
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-2">
              {bannerContent}
              <button
                onClick={onRestartMatch}
                disabled={isActionLoading}
                className="chamfer-btn w-full py-3 px-4 bg-primary-container text-surface-container-lowest font-headline-sm text-headline-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-t border-white hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(0,245,255,0.6)]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>JOGAR NOVAMENTE / REVANCHE</span>
              </button>
            </div>
          );
        })()}

        {/* SECTION A: 1v1 Combatants Telemetry Cards (P1 vs P2) */}
        <div className="grid grid-cols-2 gap-2.5">
          {gameState.players.map((p) => {
            const isThisLocal = localPlayer?.id === p.id;
            const isThisTurn = gameState.currentTurnPlayerId === p.id && gameState.status === 'IN_PROGRESS';
            const isP1 = p.id === 'P1';
            const pMaxMove = p.maxMovement ?? 5;
            const stepPct = Math.min(100, Math.max(0, Math.round((p.movementLeft / pMaxMove) * 100)));

            return (
              <div
                key={p.id}
                className={`bg-surface-container-low p-3 border transition-all relative ${
                  isP1
                    ? isThisTurn
                      ? 'border-2 border-primary-container glow-cyan'
                      : 'border-primary-container/60'
                    : isThisTurn
                    ? 'border-2 border-on-tertiary-container glow-crimson'
                    : 'border-on-tertiary-container/60'
                } ${!p.vivo ? 'opacity-45 grayscale' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-telemetry-sm text-telemetry-sm font-bold ${
                      isP1 ? 'text-primary-container' : 'text-on-tertiary-container'
                    }`}
                  >
                    {p.id} {isThisLocal ? '[VOCÊ]' : '[RIVAL]'}
                  </span>
                  <span
                    className={`font-badge-code text-badge-code flex items-center gap-1 ${
                      p.vivo
                        ? isP1
                          ? 'text-primary-container'
                          : 'text-secondary'
                        : 'text-error'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        p.vivo
                          ? isP1
                            ? 'bg-primary-container animate-pulse'
                            : 'bg-secondary animate-pulse'
                          : 'bg-error'
                      }`}
                    />
                    {p.vivo ? 'VIVO' : 'KIA'}
                  </span>
                </div>

                <div className="font-headline-sm text-sm font-bold text-primary truncate">
                  {p.nome}
                </div>

                {/* Turn Mobility Bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] font-telemetry-sm mb-0.5">
                    <span className="text-on-surface-variant">MOBILIDADE</span>
                    <span className={isP1 ? 'text-primary-container font-bold' : 'text-secondary font-bold'}>
                      {p.movementLeft}/{pMaxMove}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-highest">
                    <div
                      className={`h-full transition-all duration-200 ${
                        isP1
                          ? 'bg-primary-container shadow-[0_0_8px_rgba(0,245,255,0.7)]'
                          : 'bg-on-tertiary-container shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                      }`}
                      style={{ width: `${p.vivo ? stepPct : 0}%` }}
                    />
                  </div>
                </div>

                {/* Bomb Stock & Position */}
                <div className="mt-2.5 flex items-center justify-between border-t border-outline-variant/50 pt-2">
                  <div>
                    <span className="text-[9px] font-telemetry-sm text-on-surface-variant block">
                      ARSENAL AP
                    </span>
                    <div
                      className={`flex items-center gap-0.5 mt-0.5 font-telemetry-sm text-xs font-bold ${
                        isP1 ? 'text-primary-container' : 'text-secondary'
                      }`}
                    >
                      {p.ap > 4 ? (
                        <span>💣 x{p.ap}</span>
                      ) : p.ap > 0 ? (
                        Array.from({ length: p.ap }).map((_, idx) => (
                          <Bomb key={idx} className="w-3.5 h-3.5 fill-current" />
                        ))
                      ) : (
                        <span className="text-outline">0 AP</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-telemetry-sm text-on-surface-variant block">
                      COORD
                    </span>
                    <span className="font-telemetry-sm text-xs font-bold text-on-surface">
                      [{String.fromCharCode(65 + p.x)}{p.y + 1}]
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {gameState.players.length < 2 && (
            <div className="bg-surface-container-lowest border border-dashed border-outline-variant p-3 flex flex-col items-center justify-center text-center">
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping mb-1.5" />
              <span className="font-telemetry-sm text-telemetry-sm text-secondary font-bold">
                AGUARDANDO P2
              </span>
              <span className="font-badge-code text-[9px] text-outline mt-1">
                CONECTE NA PORTA :8082
              </span>
            </div>
          )}
        </div>

        {/* SECTION B: Local Player Telemetry & Progressive Turn Scaling */}
        {myPlayerInState && (
          <div className="bg-surface-container-low border border-outline-variant p-3">
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              {/* Available Bombs (AP) */}
              <div className="bg-surface-container-lowest border border-outline-variant p-2 flex flex-col items-center">
                <span className="text-[10px] font-telemetry-sm text-on-surface-variant">
                  BOMBAS DISPONÍVEIS
                </span>
                <span className="font-telemetry-lg text-[24px] text-secondary font-bold tracking-tight mt-0.5">
                  {pad2(apCount)} AP
                </span>
              </div>

              {/* Remaining Steps */}
              <div className="bg-surface-container-lowest border border-outline-variant p-2 flex flex-col items-center">
                <span className="text-[10px] font-telemetry-sm text-on-surface-variant">
                  PASSOS RESTANTES
                </span>
                <span className="font-telemetry-lg text-[24px] text-primary-container font-bold tracking-tight mt-0.5">
                  {pad2(movementLeft)} / {pad2(maxMovement)}
                </span>
              </div>
            </div>

            {/* Active Progression Rule Badge */}
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-surface-container border border-secondary/60 text-secondary font-telemetry-sm text-[10px]">
              <span className="flex items-center gap-1.5 font-bold">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                ESCALONAMENTO ATIVO (SEU TURNO #{myTurnsPlayed})
              </span>
              <span className="text-on-surface-variant font-mono">
                [MAX: {maxMovement} PASSOS]
              </span>
            </div>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-2.5 bg-error-container/40 border border-on-tertiary-container text-on-error-container font-telemetry-sm text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-error" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SECTION C: Tactical D-Pad & Arcade Action Deck */}
        <div className="bg-surface-container-high border border-outline-variant p-3">
          <div className="flex items-center justify-between mb-2.5 pb-1 border-b border-outline-variant/60">
            <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant font-bold">
              CONTROLE MECÂNICO DE COMBATE
            </span>
            <span
              className={`font-badge-code text-badge-code ${
                isMyTurn ? 'text-primary-container' : 'text-outline'
              }`}
            >
              {isMyTurn ? '[AUTORIZADO // SUA VEZ]' : '[AGUARDANDO TURNO]'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Arcade D-Pad (Left) */}
            <div className="w-32 h-32 relative bg-surface-container-lowest border border-outline-variant p-1 flex items-center justify-center shrink-0">
              {/* Up (W) */}
              <button
                onClick={() => onMove('UP')}
                disabled={!isMyTurn || !isAlive || movementLeft <= 0 || isActionLoading}
                title="Mover Cima (W / ↑)"
                className="absolute top-1 left-1/2 -translate-x-1/2 w-9 h-9 bg-surface-container border border-outline-variant hover:border-primary-container hover:text-primary-container active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all flex flex-col items-center justify-center"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span className="font-badge-code text-[8px] font-bold leading-none mt-0.5">W</span>
              </button>

              {/* Left (A) */}
              <button
                onClick={() => onMove('LEFT')}
                disabled={!isMyTurn || !isAlive || movementLeft <= 0 || isActionLoading}
                title="Mover Esquerda (A / ←)"
                className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 bg-surface-container border border-outline-variant hover:border-primary-container hover:text-primary-container active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all flex flex-col items-center justify-center"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="font-badge-code text-[8px] font-bold leading-none mt-0.5">A</span>
              </button>

              {/* Center Pivot */}
              <div className="w-6 h-6 bg-surface-container-high border border-outline flex items-center justify-center">
                <span
                  className={`w-1.5 h-1.5 ${
                    isMyTurn ? 'bg-primary-container animate-ping' : 'bg-outline'
                  }`}
                />
              </div>

              {/* Right (D) */}
              <button
                onClick={() => onMove('RIGHT')}
                disabled={!isMyTurn || !isAlive || movementLeft <= 0 || isActionLoading}
                title="Mover Direita (D / →)"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 bg-surface-container border border-outline-variant hover:border-primary-container hover:text-primary-container active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all flex flex-col items-center justify-center"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="font-badge-code text-[8px] font-bold leading-none mt-0.5">D</span>
              </button>

              {/* Down (S) */}
              <button
                onClick={() => onMove('DOWN')}
                disabled={!isMyTurn || !isAlive || movementLeft <= 0 || isActionLoading}
                title="Mover Baixo (S / ↓)"
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-9 h-9 bg-surface-container border border-outline-variant hover:border-primary-container hover:text-primary-container active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition-all flex flex-col items-center justify-center"
              >
                <span className="font-badge-code text-[8px] font-bold leading-none mb-0.5">S</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Prominent Arcade Action Buttons (Right) */}
            <div className="flex-1 flex flex-col gap-2.5">
              {/* Button 1: Plant Bomb (-1 AP) */}
              <button
                onClick={onPlantBomb}
                disabled={!isMyTurn || !isAlive || apCount < 1 || isActionLoading}
                className="chamfer-btn w-full bg-secondary-container text-surface-container-lowest font-headline-sm font-bold py-2.5 px-3 flex items-center justify-between border-t border-secondary hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none transition-all shadow-[0_0_12px_rgba(238,152,0,0.45)]"
              >
                <div className="flex items-center gap-2">
                  <Bomb className="w-5 h-5 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="leading-tight text-[12px] font-extrabold">PLANTAR BOMBA</span>
                    <span className="text-[9px] font-telemetry-sm opacity-90">CUSTO: -1 AP</span>
                  </div>
                </div>
                <kbd className="bg-surface-container-lowest/85 text-secondary-fixed text-[9px] font-telemetry-sm px-1.5 py-0.5">
                  ESPAÇO
                </kbd>
              </button>

              {/* Button 2: Confirm Turn / Detonate */}
              <button
                onClick={onConfirmTurn}
                disabled={!isMyTurn || !isAlive || isActionLoading}
                className="chamfer-btn w-full bg-primary-container text-surface-container-lowest font-headline-sm font-bold py-3 px-3 flex items-center justify-between border-t border-white hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none transition-all shadow-[0_0_15px_rgba(0,245,255,0.65)]"
              >
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="leading-tight text-[12px] font-extrabold">CONFIRMAR TURNO</span>
                    <span className="text-[9px] font-telemetry-sm opacity-90">PASSAR / DETONAR</span>
                  </div>
                </div>
                <kbd className="bg-surface-container-lowest/85 text-primary-fixed text-[9px] font-telemetry-sm px-1.5 py-0.5">
                  ENTER
                </kbd>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION D: RMI Session Event Log */}
        <div className="bg-surface-container-lowest border border-outline-variant p-3 flex flex-col">
          <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/60 mb-2">
            <span className="font-telemetry-sm text-telemetry-sm text-on-surface-variant flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-primary-container" />
              LOG DE SESSÃO RMI (TEMPO REAL)
            </span>
            <span className="text-[9px] font-badge-code text-primary-container animate-pulse">
              REC ●
            </span>
          </div>

          <div className="font-telemetry-sm text-[11px] leading-relaxed text-on-surface-variant space-y-1 max-h-24 overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <p className="text-outline">
                [SISTEMA] Aguardando eventos de combate via ponte JRMP...
              </p>
            ) : (
              logs.map((entry) => (
                <p key={entry.id} className="truncate">
                  <span className="text-outline">[{entry.time}]</span>{' '}
                  <span
                    className={`font-bold ${
                      entry.tag === 'ALERT'
                        ? 'text-error'
                        : entry.tag === 'MATCH'
                        ? 'text-secondary'
                        : 'text-primary-container'
                    }`}
                  >
                    {entry.tag}:
                  </span>{' '}
                  <span className="text-on-surface">{entry.message}</span>
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Console Footer Actions */}
      <div className="pt-3 border-t border-outline-variant flex items-center justify-between gap-2 mt-3">
        <button
          onClick={onRestartMatch}
          disabled={isActionLoading}
          title="Reiniciar partida no servidor RMI"
          className="flex-1 py-1.5 px-3 bg-surface-container-high border border-outline-variant text-on-surface-variant font-telemetry-sm text-telemetry-sm hover:border-primary-container hover:text-primary-container transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          REINICIAR PARTIDA / REVANCHE
        </button>
      </div>
    </aside>
  );
};
