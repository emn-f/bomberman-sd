import React, { useEffect, useRef } from 'react';
import { CELL, GameStateDTO, PlayerDTO } from '../types';

interface GameBoardCanvasProps {
  gameState: GameStateDTO | null;
  localPlayer: PlayerDTO | null;
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const ROWS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const GameBoardCanvas: React.FC<GameBoardCanvasProps> = ({ gameState, localPlayer }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      const boardSize = gameState?.board?.length || 9;
      const cellSize = canvas.width / boardSize;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!gameState || !gameState.board) {
        ctx.fillStyle = '#0b0e15';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00f5ff';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[ AGUARDANDO SINCRONIZAÇÃO DE MATRIZ... ]', canvas.width / 2, canvas.height / 2);
        return;
      }

      const board = gameState.board;

      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          const px = x * cellSize;
          const py = y * cellSize;

          ctx.fillStyle = (x + y) % 2 === 0 ? '#121620' : '#0b0e15';
          ctx.fillRect(px, py, cellSize, cellSize);

          ctx.strokeStyle = 'rgba(58, 73, 74, 0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, cellSize, cellSize);

          if (board[y][x] === CELL.EMPTY) {
            ctx.fillStyle = 'rgba(132, 148, 149, 0.22)';
            ctx.beginPath();
            ctx.arc(px + cellSize / 2, py + cellSize / 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      const dangerCells = new Set<string>();
      const bombPositions: { x: number; y: number }[] = [];

      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          if (board[y][x] === CELL.BOMB) {
            bombPositions.push({ x, y });
          }
        }
      }

      const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ];

      for (const bomb of bombPositions) {
        dangerCells.add(`${bomb.x},${bomb.y}`);
        for (const dir of dirs) {
          for (let r = 1; r <= 2; r++) {
            const nx = bomb.x + dir.dx * r;
            const ny = bomb.y + dir.dy * r;

            if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize) break;
            const cellType = board[ny][nx];

            if (cellType === CELL.WALL) {
              break;
            }
            if (cellType === CELL.DESTRUCTIBLE) {
              dangerCells.add(`${nx},${ny}`);
              break;
            }
            dangerCells.add(`${nx},${ny}`);
          }
        }
      }

      const dangerPulse = 0.28 + 0.16 * Math.sin(time * 7);
      dangerCells.forEach((coord) => {
        const [dx, dy] = coord.split(',').map(Number);
        const px = dx * cellSize;
        const py = dy * cellSize;

        ctx.fillStyle = `rgba(244, 63, 94, ${dangerPulse})`;
        ctx.fillRect(px, py, cellSize, cellSize);

        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, cellSize, cellSize);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255, 178, 183, 0.25)';
        ctx.lineWidth = 2;
        for (let s = -cellSize; s < cellSize * 2; s += 10) {
          ctx.beginPath();
          ctx.moveTo(px + s, py + cellSize);
          ctx.lineTo(px + s + cellSize, py);
          ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
      });

      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          const px = x * cellSize;
          const py = y * cellSize;
          const cell = board[y][x];

          if (cell === CELL.WALL) {
            const grad = ctx.createRadialGradient(
              px + cellSize * 0.3,
              py + cellSize * 0.3,
              2,
              px + cellSize * 0.5,
              py + cellSize * 0.5,
              cellSize * 0.65
            );
            grad.addColorStop(0, '#3a494a');
            grad.addColorStop(1, '#191b23');
            ctx.fillStyle = grad;
            ctx.fillRect(px + 3, py + 3, cellSize - 6, cellSize - 6);

            ctx.strokeStyle = '#849495';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 4, py + 4, cellSize - 8, cellSize - 8);

            ctx.strokeStyle = 'rgba(132, 148, 149, 0.45)';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 10, py + 10, cellSize - 20, cellSize - 20);

            ctx.fillStyle = '#0b0e15';
            const rOff = 7;
            [
              [px + rOff, py + rOff],
              [px + cellSize - rOff, py + rOff],
              [px + rOff, py + cellSize - rOff],
              [px + cellSize - rOff, py + cellSize - rOff]
            ].forEach(([rx, ry]) => {
              ctx.beginPath();
              ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
              ctx.fill();
            });
          } else if (cell === CELL.DESTRUCTIBLE) {
            const crateGrad = ctx.createLinearGradient(px, py, px + cellSize, py + cellSize);
            crateGrad.addColorStop(0, '#5b3800');
            crateGrad.addColorStop(1, '#2a1700');
            ctx.fillStyle = crateGrad;
            ctx.fillRect(px + 5, py + 5, cellSize - 10, cellSize - 10);

            ctx.save();
            ctx.strokeStyle = '#ee9800';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 2]);
            ctx.strokeRect(px + 5, py + 5, cellSize - 10, cellSize - 10);
            ctx.restore();

            ctx.strokeStyle = 'rgba(255, 185, 95, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + 8, py + 8);
            ctx.lineTo(px + cellSize - 8, py + cellSize - 8);
            ctx.moveTo(px + cellSize - 8, py + 8);
            ctx.lineTo(px + 8, py + cellSize - 8);
            ctx.stroke();

            ctx.fillStyle = '#ffb95f';
            ctx.font = 'bold 8px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('CRATE', px + cellSize / 2, py + cellSize / 2);
          } else if (cell === CELL.BOMB) {
            const cx = px + cellSize / 2;
            const cy = py + cellSize / 2;
            const radius = (cellSize / 2) * 0.68;
            const bombScale = 1 + 0.06 * Math.sin(time * 9);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(bombScale, bombScale);

            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 14;

            const bombGrad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 2, 0, 0, radius);
            bombGrad.addColorStop(0, '#475569');
            bombGrad.addColorStop(0.65, '#191b23');
            bombGrad.addColorStop(1, '#0b0e15');
            ctx.fillStyle = bombGrad;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = time % 0.3 > 0.15 ? '#00f5ff' : '#f43f5e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
            ctx.stroke();

            const sparkY = -radius * 1.1;
            ctx.fillStyle = time % 0.2 > 0.1 ? '#ffb95f' : '#ff4d6d';
            ctx.beginPath();
            ctx.arc(0, sparkY, radius * 0.25, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          } else if (cell === CELL.FIRE) {
            const cx = px + cellSize / 2;
            const cy = py + cellSize / 2;
            const fireRadius = (cellSize / 2) * (0.88 + 0.14 * Math.sin(time * 14 + (x + y)));

            const fireGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, fireRadius);
            fireGrad.addColorStop(0, '#ffffff');
            fireGrad.addColorStop(0.25, '#00f5ff');
            fireGrad.addColorStop(0.55, '#ee9800');
            fireGrad.addColorStop(0.85, '#c0113d');
            fireGrad.addColorStop(1, 'rgba(192, 17, 61, 0)');

            ctx.fillStyle = fireGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, fireRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      const players = gameState.players || [];
      players.forEach((p) => {
        const px = p.x * cellSize;
        const py = p.y * cellSize;
        const cx = px + cellSize / 2;
        const cy = py + cellSize / 2;
        const isCurrentTurn = gameState.currentTurnPlayerId === p.id;
        const isLocal = localPlayer?.id === p.id;
        const isP1 = p.id === 'P1';

        const primaryColor = isP1 ? '#00f5ff' : '#f43f5e';
        const darkColor = isP1 ? '#004f53' : '#92002a';

        ctx.save();

        if (!p.vivo) {
          ctx.globalAlpha = 0.65;
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 8, py + 8, cellSize - 16, cellSize - 16);

          ctx.fillStyle = '#ffb4ab';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✖ KIA', cx, cy);
          ctx.restore();
          return;
        }

        if (isCurrentTurn) {
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 12 + 4 * Math.sin(time * 6);
        }

        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(cx, cy + 2, cellSize * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e1e2ec';
        ctx.beginPath();
        ctx.arc(cx, cy - 4, cellSize * 0.21, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.roundRect(cx - cellSize * 0.16, cy - cellSize * 0.14, cellSize * 0.32, cellSize * 0.17, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 7.5, 2.2, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 7.5, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.save();
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';

        const labelText = isLocal ? `${p.id} [VOCÊ]` : `${p.id} [${p.nome.slice(0, 8)}]`;
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillStyle = isP1 ? '#00f5ff' : '#c0113d';
        ctx.fillRect(cx - textWidth / 2 - 4, py + cellSize - 13, textWidth + 8, 12);

        ctx.fillStyle = isP1 ? '#0b0e15' : '#fff9f8';
        ctx.fillText(labelText, cx, py + cellSize - 4);

        if (isCurrentTurn) {
          const bounce = Math.sin(time * 8) * 2.5;
          ctx.fillStyle = '#ffb95f';
          ctx.beginPath();
          ctx.moveTo(cx, py + 4 + bounce);
          ctx.lineTo(cx - 5, py - 3 + bounce);
          ctx.lineTo(cx + 5, py - 3 + bounce);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, localPlayer]);

  const hasActiveBomb = gameState?.board?.some(row => row.some(cell => cell === CELL.BOMB)) ?? false;

  return (
    <div className="relative bg-surface-container-lowest p-3 border-2 border-outline-variant shadow-2xl scanline-overlay">
      <span className="absolute -top-2 -left-1.5 font-badge-code text-badge-code text-primary-container font-bold bg-surface-container-lowest px-0.5">[+]</span>
      <span className="absolute -top-2 -right-1.5 font-badge-code text-badge-code text-primary-container font-bold bg-surface-container-lowest px-0.5">[+]</span>
      <span className="absolute -bottom-2 -left-1.5 font-badge-code text-badge-code text-primary-container font-bold bg-surface-container-lowest px-0.5">[+]</span>
      <span className="absolute -bottom-2 -right-1.5 font-badge-code text-badge-code text-primary-container font-bold bg-surface-container-lowest px-0.5">[+]</span>

      <div className="flex ml-6 mb-1 w-[504px] justify-between text-center font-telemetry-sm text-telemetry-sm text-on-surface-variant font-bold">
        {COLS.map(col => (
          <span key={col} className="w-14">{col}</span>
        ))}
      </div>

      <div className="flex items-center">
        <div className="flex flex-col mr-1.5 h-[504px] justify-between text-center font-telemetry-sm text-telemetry-sm text-on-surface-variant font-bold">
          {ROWS.map(row => (
            <span key={row} className="h-14 flex items-center justify-center w-4">{row}</span>
          ))}
        </div>

        <canvas
          ref={canvasRef}
          width={504}
          height={504}
          className="border border-outline-variant bg-surface-container-lowest block"
        />
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-outline-variant text-[10px] font-telemetry-sm text-on-surface-variant flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-primary-container inline-block"></span> P1 (AZUL)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-on-tertiary-container inline-block"></span> P2 (CARMESIM)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 steel-pylon inline-block border border-outline"></span> PILAR FIXO
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 destructible-crate inline-block"></span> CAIXA (CRATE)
          </span>
        </div>
        {hasActiveBomb ? (
          <span className="text-tertiary-fixed-dim font-bold flex items-center gap-1 animate-pulse">
            <span className="material-symbols-outlined text-[13px]">warning</span>
            ZONA DE IMPACTO ATIVA (RAIO 2)
          </span>
        ) : (
          <span className="text-outline font-mono">
            [SETOR LIMPO // SEM DETONAÇÃO]
          </span>
        )}
      </div>
    </div>
  );
};
