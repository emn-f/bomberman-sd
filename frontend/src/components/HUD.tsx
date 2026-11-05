import React from 'react';
import { Direction, GameStateDTO, PlayerDTO } from '../types';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Bomb, CheckCircle2, ShieldAlert, Award, Skull, Scale, RotateCcw, Footprints } from 'lucide-react';

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
  if (!gameState) return null;

  const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
  const myPlayerInState = gameState.players.find(p => p.id === localPlayer?.id);

  const isMyTurn = gameState.status === 'IN_PROGRESS' && localPlayer && gameState.currentTurnPlayerId === localPlayer.id;
  const isAlive = myPlayerInState ? myPlayerInState.vivo : false;

  const apCount = myPlayerInState?.ap ?? 0;
  const movementLeft = myPlayerInState?.movementLeft ?? 0;

  return (
    <div className="hud-panel flex flex-col gap-4 w-full max-w-md bg-gray-900/90 backdrop-blur-md p-5 rounded-2xl border border-gray-800 shadow-xl text-gray-100">
      {/* 1. Header: Match Status */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div>
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Status da Partida</span>
          <div className="flex items-center gap-2 mt-0.5">
            {gameState.status === 'WAITING_FOR_PLAYERS' && (
              <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 animate-pulse">
                ⏳ AGUARDANDO P2
              </span>
            )}
            {gameState.status === 'IN_PROGRESS' && (
              <span className="px-2.5 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                ⚔️ EM ANDAMENTO (TURNO #{gameState.turnNumber})
              </span>
            )}
            {gameState.status === 'FINISHED' && (
              <span className="px-2.5 py-1 text-xs font-bold bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                🏆 FINALIZADA
              </span>
            )}
          </div>
        </div>

        {/* Turn indicator badge */}
        {gameState.status === 'IN_PROGRESS' && (
          <div className={`px-3 py-1.5 rounded-xl border text-center ${
            isMyTurn 
              ? 'bg-amber-500/20 border-amber-400 text-amber-200 animate-pulse shadow-lg shadow-amber-500/20' 
              : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}>
            <span className="text-[10px] uppercase font-bold block">Vez de Jogar</span>
            <span className="text-xs font-black tracking-wide">
              {isMyTurn ? '👉 SUA VEZ! 👈' : currentPlayer?.nome || 'Aguardando'}
            </span>
          </div>
        )}
      </div>

      {/* 2. Match Result Banner (Victory / Defeat / Draw) */}
      {gameState.status === 'FINISHED' && (() => {
        const isDraw = gameState.winnerId === 'EMPATE';
        const isWinner = !isDraw && localPlayer && gameState.winnerId === localPlayer.id;

        let bannerContent;
        if (isDraw) {
          bannerContent = (
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-500/20 via-gray-500/20 to-zinc-500/20 border border-slate-400/50 text-center">
              <Scale className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <h3 className="text-lg font-black text-slate-200 font-arcade">EMPATE!</h3>
              <p className="text-sm font-semibold text-gray-300 mt-1">
                Fim de jogo: Ambos os jogadores foram eliminados!
              </p>
            </div>
          );
        } else if (isWinner) {
          bannerContent = (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-pink-500/20 border border-amber-400/50 text-center animate-bounce">
              <Award className="w-8 h-8 text-amber-400 mx-auto mb-1" />
              <h3 className="text-lg font-black text-amber-300 font-arcade">VITÓRIA!</h3>
              <p className="text-sm font-semibold text-gray-200 mt-1">
                Você venceu a partida! ({gameState.winnerName})
              </p>
            </div>
          );
        } else {
          bannerContent = (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/60 via-red-900/30 to-rose-950/60 border border-rose-500/50 text-center">
              <Skull className="w-8 h-8 text-rose-400 mx-auto mb-1 animate-pulse" />
              <h3 className="text-lg font-black text-rose-400 font-arcade">DERROTA!</h3>
              <p className="text-sm font-semibold text-gray-200 mt-1">
                Você foi eliminado! Vencedor: {gameState.winnerName} ({gameState.winnerId})
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
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 border border-indigo-400/40 transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Jogar Novamente / Revanche</span>
            </button>
          </div>
        );
      })()}

      {/* 3. Players Cards (P1 vs P2) */}
      <div className="grid grid-cols-2 gap-3">
        {gameState.players.map((p) => {
          const isThisLocal = localPlayer?.id === p.id;
          const isThisTurn = gameState.currentTurnPlayerId === p.id;
          const isP1 = p.id === 'P1';

          return (
            <div
              key={p.id}
              className={`p-3 rounded-xl border transition-all ${
                isThisTurn
                  ? 'border-yellow-400 bg-yellow-400/5 ring-2 ring-yellow-400/20'
                  : 'border-gray-800 bg-gray-800/40'
              } ${!p.vivo ? 'opacity-50 grayscale' : ''}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-black px-1.5 py-0.5 rounded ${
                  isP1 ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {p.id}
                </span>
                <span className="text-[10px] font-bold">
                  {p.vivo ? (
                    <span className="text-emerald-400">● VIVO</span>
                  ) : (
                    <span className="text-rose-500">✖ MORTO</span>
                  )}
                </span>
              </div>

              <div className="text-sm font-bold truncate text-gray-200">
                {p.nome} {isThisLocal && <span className="text-xs text-sky-400 font-normal">(Você)</span>}
              </div>

              <div className="mt-2 text-xs text-gray-400 flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span>Estoque AP:</span>
                  <span className="font-bold text-amber-400">{'💣'.repeat(p.ap) || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Passos Restantes:</span>
                  <span className="font-bold text-emerald-400">{p.movementLeft} / 5</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Action Stats Bar for Local Player */}
      {myPlayerInState && (
        <div className="bg-gray-800/70 p-3 rounded-xl border border-gray-700/60 flex items-center justify-around text-center">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block font-semibold flex items-center justify-center gap-1">
              <Bomb className="w-3.5 h-3.5 text-amber-400" /> AP (Bombas)
            </span>
            <span className="text-lg font-black text-amber-400">
              {apCount} <span className="text-xs font-normal text-gray-500">/ 5</span>
            </span>
          </div>

          <div className="h-8 w-px bg-gray-700" />

          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block font-semibold flex items-center justify-center gap-1">
              <Footprints className="w-3.5 h-3.5 text-emerald-400" /> Passos Turno
            </span>
            <span className="text-lg font-black text-emerald-400">
              {movementLeft} <span className="text-xs font-normal text-gray-500">/ 5</span>
            </span>
          </div>
        </div>
      )}

      {/* 5. Error Alert if any */}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 6. Controls Section */}
      <div className="flex flex-col items-center gap-3 pt-1">
        {/* Directional Pad */}
        <div className="grid grid-cols-3 gap-1.5 w-36">
          <div />
          <button
            onClick={() => onMove('UP')}
            disabled={!isMyTurn || !isAlive || movementLeft <= 0 || isActionLoading}
            title="Mover Cima (W / ↑)"
            className="h-10 bg-gray-800 hover:bg-gray-700 active:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-gray-800 rounded-lg flex items-center justify-center font-bold text-gray-200 border border-gray-700 shadow"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div />

          <button
            onClick={() => onMove('LEFT')}
            disabled={!isMyTurn || !isAlive || movementLeft <= 0 || isActionLoading}
            title="Mover Esquerda (A / ←)"
            className="h-10 bg-gray-800 hover:bg-gray-700 active:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-gray-800 rounded-lg flex items-center justify-center font-bold text-gray-200 border border-gray-700 shadow"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => onMove('DOWN')}
            disabled={!isMyTurn || !isAlive || movementLeft <= 0 || isActionLoading}
            title="Mover Baixo (S / ↓)"
            className="h-10 bg-gray-800 hover:bg-gray-700 active:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-gray-800 rounded-lg flex items-center justify-center font-bold text-gray-200 border border-gray-700 shadow"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => onMove('RIGHT')}
            disabled={!isMyTurn || !isAlive || movementLeft <= 0 || isActionLoading}
            title="Mover Direita (D / →)"
            className="h-10 bg-gray-800 hover:bg-gray-700 active:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-gray-800 rounded-lg flex items-center justify-center font-bold text-gray-200 border border-gray-700 shadow"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full mt-1">
          <button
            onClick={onPlantBomb}
            disabled={!isMyTurn || !isAlive || apCount < 1 || isActionLoading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 border border-amber-500/40"
          >
            <Bomb className="w-5 h-5 text-amber-200" />
            <span>Plantar Bomba (-1 AP)</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-amber-200">ESPAÇO</span>
          </button>

          <button
            onClick={onConfirmTurn}
            disabled={!isMyTurn || !isAlive || isActionLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none text-white font-black text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60 border border-emerald-400/50 animate-pulse"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>Confirmar Turno / Detonar</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-emerald-200">ENTER</span>
          </button>
        </div>
      </div>

      {/* 7. Last Action Log */}
      <div className="mt-1 p-2.5 bg-gray-950/80 rounded-xl border border-gray-800 text-[11px] text-gray-400 font-mono">
        <span className="text-gray-500 block mb-0.5 uppercase tracking-wider font-sans font-bold text-[9px]">Última Ação:</span>
        <span className="text-gray-300">{gameState.lastActionMessage || 'Pronto para jogar.'}</span>
      </div>
    </div>
  );
};
