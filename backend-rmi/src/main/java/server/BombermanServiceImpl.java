package server;

import shared.*;

import java.rmi.RemoteException;
import java.rmi.server.UnicastRemoteObject;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

public class BombermanServiceImpl extends UnicastRemoteObject implements IBombermanService {
    private static final long serialVersionUID = 1L;

    public static final int BOARD_SIZE = GameStateDTO.BOARD_SIZE; // 9
    public static final int REQUIRED_PLAYERS = 2;

    // Concurrency control: Fair ReentrantLock to avoid race conditions
    private final ReentrantLock lock = new ReentrantLock(true);

    private final int[][] board = new int[BOARD_SIZE][BOARD_SIZE];
    private final List<PlayerDTO> players = new ArrayList<>();
    private final Set<String> activeBombCoords = new HashSet<>(); // "x,y"
    private boolean fireOnBoard = false;

    private String currentTurnPlayerId;
    private GameStatusEnum status = GameStatusEnum.WAITING_FOR_PLAYERS;
    private String winnerId;
    private String winnerName;
    private int turnNumber = 0;
    private String lastActionMessage = "Aguardando 2 jogadores conectarem...";

    // 1v1 Spawns: P1 top-left [0,0], P2 bottom-right [8,8]
    private static final int[][] SPAWN_COORDS = {
            {0, 0}, // P1
            {8, 8}  // P2
    };

    public BombermanServiceImpl() throws RemoteException {
        super();
        initializeBoard(new Random(42));
    }

    public BombermanServiceImpl(Random random) throws RemoteException {
        super();
        initializeBoard(random);
    }

    public void initializeBoard(Random random) {
        for (int y = 0; y < BOARD_SIZE; y++) {
            for (int x = 0; x < BOARD_SIZE; x++) {
                board[y][x] = GameStateDTO.CELL_EMPTY;
            }
        }

        // Fixed pillars: row and column are both odd
        for (int y = 0; y < BOARD_SIZE; y++) {
            for (int x = 0; x < BOARD_SIZE; x++) {
                if (y % 2 == 1 && x % 2 == 1) {
                    board[y][x] = GameStateDTO.CELL_WALL;
                }
            }
        }

        // Protected cells around P1 [0,0] and P2 [8,8]
        Set<String> protectedCells = new HashSet<>();
        // P1: [0,0], [0,1], [1,0]
        protectedCells.add("0,0");
        protectedCells.add("0,1");
        protectedCells.add("1,0");

        // P2: [8,8], [8,7], [7,8]
        protectedCells.add("8,8");
        protectedCells.add("8,7");
        protectedCells.add("7,8");

        // Populate destructible blocks
        for (int y = 0; y < BOARD_SIZE; y++) {
            for (int x = 0; x < BOARD_SIZE; x++) {
                if (board[y][x] == GameStateDTO.CELL_WALL) continue;
                if (protectedCells.contains(x + "," + y)) continue;

                if (random.nextDouble() < 0.70) {
                    board[y][x] = GameStateDTO.CELL_DESTRUCTIBLE;
                }
            }
        }
    }

    @Override
    public PlayerDTO conectarJogador(String nome) throws RemoteException, GameFullException {
        lock.lock();
        try {
            if (players.size() >= REQUIRED_PLAYERS) {
                throw new GameFullException("Partida lotada. Limite estrito de " + REQUIRED_PLAYERS + " jogadores (1v1).");
            }
            if (status == GameStatusEnum.FINISHED) {
                throw new GameFullException("Partida já finalizada.");
            }

            int index = players.size();
            int spawnX = SPAWN_COORDS[index][0];
            int spawnY = SPAWN_COORDS[index][1];

            String id = "P" + (index + 1);
            String finalNome = (nome != null && !nome.isBlank()) ? nome.trim() : "Jogador " + (index + 1);
            PlayerDTO newPlayer = new PlayerDTO(id, finalNome, spawnX, spawnY);
            players.add(newPlayer);

            if (players.size() == 1) {
                status = GameStatusEnum.WAITING_FOR_PLAYERS;
                currentTurnPlayerId = null;
                lastActionMessage = newPlayer.getNome() + " conectou-se como P1 (" + spawnX + "," + spawnY + "). Aguardando P2...";
            } else if (players.size() == 2) {
                // Auto-start 1v1 match
                status = GameStatusEnum.IN_PROGRESS;
                currentTurnPlayerId = players.get(0).getId(); // P1 starts
                turnNumber = 1;
                lastActionMessage = newPlayer.getNome() + " conectou-se como P2 (" + spawnX + "," + spawnY + "). Partida 1v1 iniciada! Vez de " + players.get(0).getNome() + ".";
            }

            return clonePlayer(newPlayer);
        } finally {
            lock.unlock();
        }
    }

    @Override
    public GameStateDTO mover(String playerId, DirectionEnum direcao) throws RemoteException, GameNotStartedException, InvalidTurnException, NoMovementLeftException, CollisionException {
        lock.lock();
        try {
            validateTurn(playerId);
            clearFireIfAny();

            PlayerDTO player = getPlayerById(playerId);
            if (player == null || !player.isVivo()) {
                throw new InvalidTurnException("Jogador não encontrado ou eliminado.");
            }

            if (player.getMovementLeft() <= 0) {
                throw new NoMovementLeftException("Sem passos restantes neste turno.");
            }

            int newX = player.getX() + direcao.getDeltaX();
            int newY = player.getY() + direcao.getDeltaY();

            // Boundary validation
            if (newX < 0 || newX >= BOARD_SIZE || newY < 0 || newY >= BOARD_SIZE) {
                throw new CollisionException("Movimento inválido: fora dos limites do tabuleiro 9x9.");
            }

            // Cell contents validation
            int cell = board[newY][newX];
            if (cell == GameStateDTO.CELL_WALL) {
                throw new CollisionException("Colisão com parede indestrutível.");
            }
            if (cell == GameStateDTO.CELL_DESTRUCTIBLE) {
                throw new CollisionException("Colisão com bloco destrutível.");
            }
            if (cell == GameStateDTO.CELL_BOMB) {
                throw new CollisionException("Colisão com bomba ativa.");
            }

            // Opponent collision
            for (PlayerDTO other : players) {
                if (other.isVivo() && !other.getId().equals(playerId) && other.getX() == newX && other.getY() == newY) {
                    throw new CollisionException("Célula ocupada pelo oponente " + other.getNome() + ".");
                }
            }

            player.setX(newX);
            player.setY(newY);
            player.setMovementLeft(player.getMovementLeft() - 1);
            lastActionMessage = player.getNome() + " moveu para " + direcao + " (" + newX + "," + newY + "). Restam " + player.getMovementLeft() + " passos.";

            return snapshot();
        } finally {
            lock.unlock();
        }
    }

    @Override
    public GameStateDTO plantarBomba(String playerId) throws RemoteException, GameNotStartedException, InvalidTurnException, InsufficientApException {
        lock.lock();
        try {
            validateTurn(playerId);
            clearFireIfAny();

            PlayerDTO player = getPlayerById(playerId);
            if (player == null || !player.isVivo()) {
                throw new InvalidTurnException("Jogador não encontrado ou eliminado.");
            }

            if (player.getAp() < 1) {
                throw new InsufficientApException("Pontos de Ação (AP) insuficientes para plantar bomba.");
            }

            int px = player.getX();
            int py = player.getY();

            if (board[py][px] == GameStateDTO.CELL_BOMB) {
                throw new InsufficientApException("Já existe uma bomba plantada nesta célula.");
            }

            player.setAp(player.getAp() - 1);
            player.setBombsPlantedThisTurn(player.getBombsPlantedThisTurn() + 1);
            board[py][px] = GameStateDTO.CELL_BOMB;
            activeBombCoords.add(px + "," + py);

            lastActionMessage = player.getNome() + " plantou uma bomba em (" + px + "," + py + "). AP restante: " + player.getAp() + ".";

            return snapshot();
        } finally {
            lock.unlock();
        }
    }

    @Override
    public GameStateDTO confirmarTurno(String playerId) throws RemoteException, GameNotStartedException, InvalidTurnException {
        lock.lock();
        try {
            validateTurn(playerId);
            clearFireIfAny();

            PlayerDTO p1 = players.get(0);
            PlayerDTO p2 = players.get(1);
            PlayerDTO current = playerId.equals(p1.getId()) ? p1 : p2;
            PlayerDTO opponent = playerId.equals(p1.getId()) ? p2 : p1;

            StringBuilder report = new StringBuilder();
            report.append(current.getNome()).append(" confirmou o turno. ");

            // --- 1. EXPLOSÃO DAS BOMBAS ---
            List<String> bombsToExplode = new ArrayList<>(activeBombCoords);
            activeBombCoords.clear();

            if (!bombsToExplode.isEmpty()) {
                fireOnBoard = true;
                int[][] directions = {{0, -1}, {0, 1}, {-1, 0}, {1, 0}};

                for (String coord : bombsToExplode) {
                    String[] parts = coord.split(",");
                    int bx = Integer.parseInt(parts[0]);
                    int by = Integer.parseInt(parts[1]);

                    board[by][bx] = GameStateDTO.CELL_FIRE;

                    for (int[] dir : directions) {
                        int dx = dir[0];
                        int dy = dir[1];
                        for (int r = 1; r <= 2; r++) {
                            int fx = bx + dx * r;
                            int fy = by + dy * r;

                            if (fx < 0 || fx >= BOARD_SIZE || fy < 0 || fy >= BOARD_SIZE) {
                                break;
                            }
                            if (board[fy][fx] == GameStateDTO.CELL_WALL) {
                                break;
                            }
                            if (board[fy][fx] == GameStateDTO.CELL_DESTRUCTIBLE) {
                                board[fy][fx] = GameStateDTO.CELL_FIRE;
                                break;
                            }
                            board[fy][fx] = GameStateDTO.CELL_FIRE;
                        }
                    }
                }

                // Check casualties
                if (p1.isVivo() && board[p1.getY()][p1.getX()] == GameStateDTO.CELL_FIRE) {
                    p1.setVivo(false);
                    report.append(p1.getNome()).append(" foi eliminado pela explosão! ");
                }
                if (p2.isVivo() && board[p2.getY()][p2.getX()] == GameStateDTO.CELL_FIRE) {
                    p2.setVivo(false);
                    report.append(p2.getNome()).append(" foi eliminado pela explosão! ");
                }
            }

            // --- 2. AP BÔNUS DO JOGADOR ATUAL ---
            if (current.getBombsPlantedThisTurn() == 0) {
                current.setAp(Math.min(current.getAp() + 1, PlayerDTO.MAX_AP));
                report.append(current.getNome()).append(" economizou bomba e ganhou +1 AP de bônus! ");
            }
            current.setBombsPlantedThisTurn(0);

            // --- 3. CONDIÇÃO DE VITÓRIA / TOGGLE DIRETO ---
            if (!p1.isVivo() && !p2.isVivo()) {
                status = GameStatusEnum.FINISHED;
                winnerId = "EMPATE";
                winnerName = "Empate";
                report.append("Fim de partida: Ambos os jogadores foram eliminados! EMPATE.");
            } else if (!p1.isVivo()) {
                status = GameStatusEnum.FINISHED;
                winnerId = p2.getId();
                winnerName = p2.getNome();
                report.append("Fim de partida: Vitória de ").append(winnerName).append("!");
            } else if (!p2.isVivo()) {
                status = GameStatusEnum.FINISHED;
                winnerId = p1.getId();
                winnerName = p1.getNome();
                report.append("Fim de partida: Vitória de ").append(winnerName).append("!");
            } else {
                // Ambos vivos: Toggle direto entre P1 e P2
                currentTurnPlayerId = opponent.getId();
                opponent.setMovementLeft(PlayerDTO.INITIAL_MOVEMENT);
                opponent.setAp(Math.min(opponent.getAp() + 1, PlayerDTO.MAX_AP)); // +1 AP base
                opponent.setBombsPlantedThisTurn(0);
                turnNumber++;
                report.append("Novo turno: vez de ").append(opponent.getNome()).append(".");
            }

            lastActionMessage = report.toString().trim();
            return snapshot();
        } finally {
            lock.unlock();
        }
    }

    @Override
    public GameStateDTO obterEstadoJogo() throws RemoteException {
        lock.lock();
        try {
            return snapshot();
        } finally {
            lock.unlock();
        }
    }

    @Override
    public void desconectarJogador(String playerId) throws RemoteException {
        lock.lock();
        try {
            PlayerDTO disconnected = getPlayerById(playerId);
            if (disconnected == null) return;

            if (status == GameStatusEnum.IN_PROGRESS) {
                disconnected.setVivo(false);
                status = GameStatusEnum.FINISHED;

                PlayerDTO p1 = players.get(0);
                PlayerDTO p2 = players.get(1);
                PlayerDTO remaining = playerId.equals(p1.getId()) ? p2 : p1;

                winnerId = remaining.getId();
                winnerName = remaining.getNome();
                lastActionMessage = disconnected.getNome() + " desconectou-se. Vitória por W.O. de " + remaining.getNome() + "!";
            } else if (status == GameStatusEnum.WAITING_FOR_PLAYERS) {
                players.remove(disconnected);
                currentTurnPlayerId = null;
                lastActionMessage = disconnected.getNome() + " desconectou-se antes do início. Aguardando jogadores...";
            }
        } finally {
            lock.unlock();
        }
    }

    private void clearFireIfAny() {
        if (!fireOnBoard) return;
        for (int y = 0; y < BOARD_SIZE; y++) {
            for (int x = 0; x < BOARD_SIZE; x++) {
                if (board[y][x] == GameStateDTO.CELL_FIRE) {
                    board[y][x] = GameStateDTO.CELL_EMPTY;
                }
            }
        }
        fireOnBoard = false;
    }

    private void validateTurn(String playerId) throws GameNotStartedException, InvalidTurnException {
        if (status == GameStatusEnum.WAITING_FOR_PLAYERS) {
            throw new GameNotStartedException("A partida ainda está aguardando o 2º jogador conectar.");
        }
        if (status == GameStatusEnum.FINISHED) {
            throw new InvalidTurnException("A partida já foi encerrada.");
        }
        if (currentTurnPlayerId == null || !currentTurnPlayerId.equals(playerId)) {
            throw new InvalidTurnException("Não é o seu turno de jogar. Aguarde sua vez.");
        }
    }

    private PlayerDTO getPlayerById(String id) {
        if (id == null) return null;
        for (PlayerDTO p : players) {
            if (id.equals(p.getId())) return p;
        }
        return null;
    }

    private GameStateDTO snapshot() {
        List<PlayerDTO> copiedPlayers = new ArrayList<>();
        for (PlayerDTO p : players) {
            copiedPlayers.add(clonePlayer(p));
        }
        return new GameStateDTO(board, copiedPlayers, currentTurnPlayerId, status, winnerId, winnerName, turnNumber, lastActionMessage);
    }

    private PlayerDTO clonePlayer(PlayerDTO src) {
        PlayerDTO copy = new PlayerDTO();
        copy.setId(src.getId());
        copy.setNome(src.getNome());
        copy.setX(src.getX());
        copy.setY(src.getY());
        copy.setVivo(src.isVivo());
        copy.setAp(src.getAp());
        copy.setMovementLeft(src.getMovementLeft());
        copy.setBombsPlantedThisTurn(src.getBombsPlantedThisTurn());
        return copy;
    }

    public void setCell(int x, int y, int cellType) {
        board[y][x] = cellType;
    }

    public int getCell(int x, int y) {
        return board[y][x];
    }
}
