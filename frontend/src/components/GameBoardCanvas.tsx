import React, { useEffect, useRef } from 'react';
import { CELL, GameStateDTO, PlayerDTO } from '../types';

interface GameBoardCanvasProps {
  gameState: GameStateDTO | null;
  localPlayer: PlayerDTO | null;
}

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
        // Draw empty lobby canvas
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6b7280';
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AGUARDANDO CONEXÃO...', canvas.width / 2, canvas.height / 2);
        return;
      }

      const board = gameState.board;

      // 1. Draw floor and base grid
      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          const px = x * cellSize;
          const py = y * cellSize;

          // Subtle checkerboard pattern for walkable floor
          ctx.fillStyle = (x + y) % 2 === 0 ? '#1f2937' : '#111827';
          ctx.fillRect(px, py, cellSize, cellSize);

          // Grid border
          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, cellSize, cellSize);
        }
      }

      // 2. Calculate Danger Zone for active bombs (cross range = 2)
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
              // Indestructible wall completely stops explosion
              break;
            }
            if (cellType === CELL.DESTRUCTIBLE) {
              // Destructible block gets blasted and stops explosion behind it
              dangerCells.add(`${nx},${ny}`);
              break;
            }
            dangerCells.add(`${nx},${ny}`);
          }
        }
      }

      // 3. Draw danger zone overlay with pulsing warning effect
      const dangerPulse = 0.25 + 0.15 * Math.sin(time * 6);
      dangerCells.forEach((coord) => {
        const [dx, dy] = coord.split(',').map(Number);
        const px = dx * cellSize;
        const py = dy * cellSize;

        ctx.fillStyle = `rgba(239, 68, 68, ${dangerPulse})`;
        ctx.fillRect(px, py, cellSize, cellSize);

        // Warning diagonal stripes
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py + cellSize);
        ctx.lineTo(px + cellSize, py);
        ctx.stroke();
        ctx.restore();
      });

      // 4. Draw Board Objects (Walls, Destructible blocks, Bombs, Fire)
      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          const px = x * cellSize;
          const py = y * cellSize;
          const cell = board[y][x];

          if (cell === CELL.WALL) {
            // Indestructible Pillar (Metallic 3D)
            const grad = ctx.createLinearGradient(px, py, px + cellSize, py + cellSize);
            grad.addColorStop(0, '#64748b');
            grad.addColorStop(0.5, '#475569');
            grad.addColorStop(1, '#334155');
            ctx.fillStyle = grad;
            ctx.fillRect(px + 4, py + 4, cellSize - 8, cellSize - 8);

            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 4, py + 4, cellSize - 8, cellSize - 8);

            // Center rivet
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize / 8, 0, Math.PI * 2);
            ctx.fill();
          } else if (cell === CELL.DESTRUCTIBLE) {
            // Destructible Brick Block (Warm Terracotta / Clay)
            ctx.fillStyle = '#b45309';
            ctx.fillRect(px + 3, py + 3, cellSize - 6, cellSize - 6);

            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 3, py + 3, cellSize - 6, cellSize - 6);

            // Brick horizontal and vertical seams
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1.5;
            // Mid horizontal line
            ctx.beginPath();
            ctx.moveTo(px + 3, py + cellSize / 2);
            ctx.lineTo(px + cellSize - 3, py + cellSize / 2);
            ctx.stroke();

            // Vertical seams
            ctx.beginPath();
            ctx.moveTo(px + cellSize / 2, py + 3);
            ctx.lineTo(px + cellSize / 2, py + cellSize / 2);
            ctx.moveTo(px + cellSize * 0.25, py + cellSize / 2);
            ctx.lineTo(px + cellSize * 0.25, py + cellSize - 3);
            ctx.moveTo(px + cellSize * 0.75, py + cellSize / 2);
            ctx.lineTo(px + cellSize * 0.75, py + cellSize - 3);
            ctx.stroke();
          } else if (cell === CELL.BOMB) {
            // Active Bomb: Pulsing dark sphere with animated fuse spark
            const cx = px + cellSize / 2;
            const cy = py + cellSize / 2;
            const radius = (cellSize / 2) * 0.75;
            const bombScale = 1 + 0.05 * Math.sin(time * 8);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(bombScale, bombScale);

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(0, radius * 0.9, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();

            // Bomb Body Gradient
            const bombGrad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
            bombGrad.addColorStop(0, '#4b5563');
            bombGrad.addColorStop(0.6, '#1f2937');
            bombGrad.addColorStop(1, '#030712');
            ctx.fillStyle = bombGrad;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();

            // Fuse cap
            ctx.fillStyle = '#d97706';
            ctx.fillRect(-radius * 0.2, -radius * 1.15, radius * 0.4, radius * 0.25);

            // Fuse spark
            const sparkY = -radius * 1.25;
            ctx.fillStyle = time % 0.2 > 0.1 ? '#f59e0b' : '#ef4444';
            ctx.beginPath();
            ctx.arc(0, sparkY, radius * 0.25, 0, Math.PI * 2);
            ctx.fill();

            // White highlight
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(-radius * 0.35, -radius * 0.35, radius * 0.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          } else if (cell === CELL.FIRE) {
            // Blast Fire Animation
            const cx = px + cellSize / 2;
            const cy = py + cellSize / 2;
            const fireRadius = (cellSize / 2) * (0.85 + 0.15 * Math.sin(time * 12 + (x + y)));

            const fireGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, fireRadius);
            fireGrad.addColorStop(0, '#ffffff');
            fireGrad.addColorStop(0.2, '#fef08a');
            fireGrad.addColorStop(0.5, '#f97316');
            fireGrad.addColorStop(0.85, '#dc2626');
            fireGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');

            ctx.fillStyle = fireGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, fireRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 5. Draw Players
      const players = gameState.players || [];
      players.forEach((p) => {
        const px = p.x * cellSize;
        const py = p.y * cellSize;
        const cx = px + cellSize / 2;
        const cy = py + cellSize / 2;
        const isCurrentTurn = gameState.currentTurnPlayerId === p.id;
        const isLocal = localPlayer?.id === p.id;
        const isP1 = p.id === 'P1';

        const primaryColor = isP1 ? '#38bdf8' : '#f43f5e'; // Blue for P1, Rose/Red for P2
        const darkColor = isP1 ? '#0284c7' : '#e11d48';

        ctx.save();

        if (!p.vivo) {
          // Dead Player / Ghost representation
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 0.3, Math.PI, 0, false);
          ctx.lineTo(cx + cellSize * 0.3, cy + cellSize * 0.3);
          ctx.lineTo(cx - cellSize * 0.3, cy + cellSize * 0.3);
          ctx.closePath();
          ctx.fill();

          // Skull eye markers "X"
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✖ ✖', cx, cy);

          ctx.restore();
          return;
        }

        // Active Player Glow if it's their turn
        if (isCurrentTurn) {
          const glow = 6 + 4 * Math.sin(time * 6);
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = glow;
        }

        // Body
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(cx, cy + 2, cellSize * 0.32, 0, Math.PI * 2);
        ctx.fill();

        // Hat / Helmet Band
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy - 4, cellSize * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Visor / Face
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.roundRect(cx - cellSize * 0.16, cy - cellSize * 0.14, cellSize * 0.32, cellSize * 0.18, 4);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 8, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 8, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Player Tag: Name and "VOCÊ" indicator
        ctx.save();
        ctx.font = 'bold 10px "Rajdhani", sans-serif';
        ctx.textAlign = 'center';

        // Background pill for readability
        const labelText = isLocal ? `VOCÊ (${p.id})` : `${p.nome} (${p.id})`;
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(cx - textWidth / 2 - 4, py - 12, textWidth + 8, 14, 4);
        ctx.fill();

        ctx.fillStyle = isLocal ? '#38bdf8' : '#f87171';
        ctx.fillText(labelText, cx, py - 2);

        // Turn indicator arrow above current player
        if (isCurrentTurn) {
          const bounce = Math.sin(time * 8) * 3;
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.moveTo(cx, py - 16 + bounce);
          ctx.lineTo(cx - 5, py - 22 + bounce);
          ctx.lineTo(cx + 5, py - 22 + bounce);
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

  return (
    <div className="canvas-container relative flex items-center justify-center p-3 bg-gray-950 rounded-2xl border-2 border-indigo-500/40 shadow-2xl shadow-indigo-950/50">
      <canvas
        ref={canvasRef}
        width={504}
        height={504}
        className="rounded-xl border border-gray-800 bg-gray-900 shadow-inner"
      />
    </div>
  );
};
