package server;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import shared.*;

import java.rmi.RemoteException;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

public class BombermanGameTest {

    private BombermanServiceImpl service;

    @BeforeEach
    void setUp() throws RemoteException {
        service = new BombermanServiceImpl(new Random(12345));
    }

    @Test
    @DisplayName("1v1: Estado inicial WAITING_FOR_PLAYERS e GameNotStartedException antes do 2º jogador")
    void testWaitingForPlayersAndGameNotStarted() throws Exception {
        PlayerDTO p1 = service.conectarJogador("Jogador 1");
        GameStateDTO state = service.obterEstadoJogo();

        assertEquals(GameStatusEnum.WAITING_FOR_PLAYERS, state.getStatus());
        assertEquals(0, p1.getX());
        assertEquals(0, p1.getY());
        assertEquals("P1", p1.getId());

        assertThrows(GameNotStartedException.class, () -> service.mover(p1.getId(), DirectionEnum.RIGHT));
        assertThrows(GameNotStartedException.class, () -> service.plantarBomba(p1.getId()));
        assertThrows(GameNotStartedException.class, () -> service.confirmarTurno(p1.getId()));
    }

    @Test
    @DisplayName("Inicialização do tabuleiro aceita Random nulo")
    void testInitializeBoardWithNullRandom() throws Exception {
        service.initializeBoard(null);

        int[][] board = service.obterEstadoJogo().getBoard();
        assertEquals(GameStateDTO.BOARD_SIZE, board.length);
        assertEquals(GameStateDTO.CELL_WALL, board[1][1]);
    }

    @Test
    @DisplayName("1v1: Conexão do 2º jogador inicia automaticamente a partida IN_PROGRESS com P1 na vez")
    void testAutoStartOnSecondPlayer() throws Exception {
        PlayerDTO p1 = service.conectarJogador("Alice");
        PlayerDTO p2 = service.conectarJogador("Bob");

        GameStateDTO state = service.obterEstadoJogo();
        assertEquals(GameStatusEnum.IN_PROGRESS, state.getStatus());
        assertEquals("P1", state.getCurrentTurnPlayerId());
        assertEquals(8, p2.getX());
        assertEquals(8, p2.getY());
        assertEquals("P2", p2.getId());

        assertThrows(GameFullException.class, () -> service.conectarJogador("Intruso"));
    }

    @Test
    @DisplayName("1v1 Turno Completo: Mover -> Plantar -> Afastar -> Confirmar -> Explodir Bloco -> Toggle para P2")
    void testCompleteTurnLifecycleWithDirectToggle() throws Exception {
        PlayerDTO p1 = service.conectarJogador("P1");
        PlayerDTO p2 = service.conectarJogador("P2");

        service.setCell(0, 0, GameStateDTO.CELL_EMPTY);
        service.setCell(1, 0, GameStateDTO.CELL_EMPTY);
        service.setCell(0, 1, GameStateDTO.CELL_EMPTY);
        service.setCell(0, 2, GameStateDTO.CELL_DESTRUCTIBLE);

        service.mover(p1.getId(), DirectionEnum.RIGHT);

        service.plantarBomba(p1.getId());
        assertEquals(GameStateDTO.CELL_BOMB, service.getCell(1, 0));

        service.mover(p1.getId(), DirectionEnum.LEFT);

        service.mover(p1.getId(), DirectionEnum.DOWN);

        GameStateDTO state = service.confirmarTurno(p1.getId());

        assertEquals(GameStateDTO.CELL_FIRE, state.getBoard()[0][1]);

        assertEquals(p2.getId(), state.getCurrentTurnPlayerId(), "O turno deve ter alternado diretamente para P2");
        PlayerDTO p2State = state.getPlayers().get(1);
        assertEquals(4, p2State.getMovementLeft(), "P2 deve iniciar o turno com 4 movimentos");
        assertEquals(1, p2State.getAp(), "P2 inicia seu 1º turno com 1 bomba");
    }

    @Test
    @DisplayName("1v1: Cada turno oferece 4 passos e permite plantar apenas 1 bomba")
    void testFixedMovementAndOneBombPerTurn() throws Exception {
        PlayerDTO p1 = service.conectarJogador("P1");
        PlayerDTO p2 = service.conectarJogador("P2");

        assertEquals(1, p1.getAp());
        assertEquals(4, p1.getMovementLeft());
        assertEquals(4, p2.getMovementLeft());

        service.setCell(1, 1, GameStateDTO.CELL_EMPTY);
        GameStateDTO state = service.plantarBomba(p1.getId());
        PlayerDTO p1AfterPlant = state.getPlayers().get(0);
        assertEquals(0, p1AfterPlant.getAp());
        assertEquals(1, p1AfterPlant.getBombsPlantedThisTurn());
        assertThrows(InsufficientApException.class, () -> service.plantarBomba(p1.getId()));

        service.mover(p1.getId(), DirectionEnum.RIGHT);
        service.mover(p1.getId(), DirectionEnum.DOWN);
        state = service.confirmarTurno(p1.getId());
        PlayerDTO p2Turn = state.getPlayers().get(1);
        assertEquals(4, p2Turn.getMovementLeft());
        assertEquals(1, p2Turn.getAp());

        state = service.confirmarTurno(p2.getId());
        PlayerDTO p1NextTurn = state.getPlayers().get(0);
        assertEquals(4, p1NextTurn.getMovementLeft());
        assertEquals(4, p1NextTurn.getMaxMovement());
        assertEquals(1, p1NextTurn.getAp());
    }

    @Test
    @DisplayName("1v1: Desconexão por W.O. durante IN_PROGRESS finaliza a partida com vitória do oponente")
    void testWalkoverOnDisconnect() throws Exception {
        PlayerDTO p1 = service.conectarJogador("P1");
        PlayerDTO p2 = service.conectarJogador("P2");

        GameStateDTO state = service.obterEstadoJogo();
        assertEquals(GameStatusEnum.IN_PROGRESS, state.getStatus());

        service.desconectarJogador(p1.getId());

        GameStateDTO finishedState = service.obterEstadoJogo();
        assertEquals(GameStatusEnum.FINISHED, finishedState.getStatus());
        assertEquals(p2.getId(), finishedState.getWinnerId(), "P2 deve ser declarado vencedor por W.O.");
        assertEquals(1, finishedState.getPlayers().size(), "O jogador desconectado deve ser removido da partida.");
        assertEquals(p2.getId(), finishedState.getPlayers().get(0).getId());
        assertTrue(finishedState.getPlayers().get(0).isVivo());
        assertTrue(finishedState.getLastActionMessage().contains("Vitória por W.O."));
    }

    @Test
    @DisplayName("1v1: Reinício é recusado enquanto a partida está em andamento")
    void testRestartRejectedDuringMatch() throws Exception {
        service.conectarJogador("P1");
        service.conectarJogador("P2");

        assertThrows(InvalidTurnException.class, () -> service.reiniciarPartida());
        assertEquals(GameStatusEnum.IN_PROGRESS, service.obterEstadoJogo().getStatus());
    }

    @Test
    @DisplayName("1v1: Revanche após finalização mantém os dois jogadores")
    void testRestartAfterFinishedMatchWithBothPlayers() throws Exception {
        PlayerDTO p1 = service.conectarJogador("P1");
        service.conectarJogador("P2");
        service.plantarBomba(p1.getId());
        GameStateDTO finished = service.confirmarTurno(p1.getId());
        assertEquals(GameStatusEnum.FINISHED, finished.getStatus());

        GameStateDTO restarted = service.reiniciarPartida();

        assertEquals(GameStatusEnum.IN_PROGRESS, restarted.getStatus());
        assertEquals("P1", restarted.getCurrentTurnPlayerId());
        assertEquals(2, restarted.getPlayers().size());
        assertTrue(restarted.getPlayers().stream().allMatch(PlayerDTO::isVivo));
        assertEquals(4, restarted.getPlayers().get(0).getMovementLeft());
        assertEquals(1, restarted.getPlayers().get(0).getAp());
    }

    @Test
    @DisplayName("1v1: Após W.O., revanche aguarda um novo oponente")
    void testRestartAfterDisconnectWaitsForOpponent() throws Exception {
        PlayerDTO p1 = service.conectarJogador("P1");
        PlayerDTO p2 = service.conectarJogador("P2");
        service.desconectarJogador(p2.getId());

        GameStateDTO restarted = service.reiniciarPartida();

        assertEquals(GameStatusEnum.WAITING_FOR_PLAYERS, restarted.getStatus());
        assertEquals(1, restarted.getPlayers().size());
        assertEquals(p1.getId(), restarted.getPlayers().get(0).getId());
        assertTrue(restarted.getPlayers().get(0).isVivo());

        PlayerDTO replacement = service.conectarJogador("Novo P2");
        GameStateDTO started = service.obterEstadoJogo();
        assertEquals("P2", replacement.getId());
        assertEquals(GameStatusEnum.IN_PROGRESS, started.getStatus());
        assertEquals("P1", started.getCurrentTurnPlayerId());
        assertEquals(2, started.getPlayers().size());
    }

    @Test
    @DisplayName("1v1: Condição de Empate se ambos forem eliminados pela mesma explosão")
    void testSimultaneousDeathDraw() throws Exception {
        PlayerDTO p1 = service.conectarJogador("P1");
        PlayerDTO p2 = service.conectarJogador("P2");

        for (int x = 0; x <= 4; x++) {
            service.setCell(x, 0, GameStateDTO.CELL_EMPTY);
        }
        for (int x = 4; x <= 8; x++) {
            service.setCell(x, 8, GameStateDTO.CELL_EMPTY);
        }
        for (int y = 1; y <= 7; y++) {
            service.setCell(4, y, GameStateDTO.CELL_EMPTY);
        }

        for (int i = 0; i < 4; i++) {
            service.mover(p1.getId(), DirectionEnum.RIGHT);
        }
        service.confirmarTurno(p1.getId());

        for (int i = 0; i < 4; i++) {
            service.mover(p2.getId(), DirectionEnum.LEFT);
        }
        service.confirmarTurno(p2.getId());

        for (int i = 0; i < 3; i++) {
            service.mover(p1.getId(), DirectionEnum.DOWN);
        }
        service.confirmarTurno(p1.getId());

        for (int i = 0; i < 3; i++) {
            service.mover(p2.getId(), DirectionEnum.UP);
        }
        service.confirmarTurno(p2.getId());

        service.plantarBomba(p1.getId());
        GameStateDTO state = service.confirmarTurno(p1.getId());

        assertEquals(GameStatusEnum.FINISHED, state.getStatus());
        assertEquals("EMPATE", state.getWinnerId());
        assertTrue(state.getPlayers().stream().noneMatch(PlayerDTO::isVivo));
    }
}
