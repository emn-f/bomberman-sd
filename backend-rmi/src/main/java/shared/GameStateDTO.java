package shared;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class GameStateDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    public static final int BOARD_SIZE = 9;
    public static final int CELL_EMPTY = 0;
    public static final int CELL_WALL = 1;
    public static final int CELL_DESTRUCTIBLE = 2;
    public static final int CELL_BOMB = 3;
    public static final int CELL_FIRE = 4;

    private int[][] board;
    private List<PlayerDTO> players;
    private String currentTurnPlayerId;
    private GameStatusEnum status;
    private String winnerId;
    private String winnerName;
    private int turnNumber;
    private String lastActionMessage;

    public GameStateDTO() {
        this.board = new int[BOARD_SIZE][BOARD_SIZE];
        this.players = new ArrayList<>();
        this.status = GameStatusEnum.WAITING_FOR_PLAYERS;
        this.turnNumber = 0;
        this.lastActionMessage = "Aguardando jogadores...";
    }

    public GameStateDTO(int[][] board, List<PlayerDTO> players, String currentTurnPlayerId,
                        GameStatusEnum status, String winnerId, String winnerName,
                        int turnNumber, String lastActionMessage) {
        this.board = copyBoard(board);
        this.players = new ArrayList<>(players);
        this.currentTurnPlayerId = currentTurnPlayerId;
        this.status = status;
        this.winnerId = winnerId;
        this.winnerName = winnerName;
        this.turnNumber = turnNumber;
        this.lastActionMessage = lastActionMessage;
    }

    public static int[][] copyBoard(int[][] source) {
        if (source == null) return new int[BOARD_SIZE][BOARD_SIZE];
        int[][] copy = new int[source.length][];
        for (int i = 0; i < source.length; i++) {
            copy[i] = source[i].clone();
        }
        return copy;
    }

    public int[][] getBoard() {
        return board;
    }

    public void setBoard(int[][] board) {
        this.board = copyBoard(board);
    }

    public List<PlayerDTO> getPlayers() {
        return players;
    }

    public void setPlayers(List<PlayerDTO> players) {
        this.players = players;
    }

    public String getCurrentTurnPlayerId() {
        return currentTurnPlayerId;
    }

    public void setCurrentTurnPlayerId(String currentTurnPlayerId) {
        this.currentTurnPlayerId = currentTurnPlayerId;
    }

    public GameStatusEnum getStatus() {
        return status;
    }

    public void setStatus(GameStatusEnum status) {
        this.status = status;
    }

    public String getWinnerId() {
        return winnerId;
    }

    public void setWinnerId(String winnerId) {
        this.winnerId = winnerId;
    }

    public String getWinnerName() {
        return winnerName;
    }

    public void setWinnerName(String winnerName) {
        this.winnerName = winnerName;
    }

    public int getTurnNumber() {
        return turnNumber;
    }

    public void setTurnNumber(int turnNumber) {
        this.turnNumber = turnNumber;
    }

    public String getLastActionMessage() {
        return lastActionMessage;
    }

    public void setLastActionMessage(String lastActionMessage) {
        this.lastActionMessage = lastActionMessage;
    }

}
