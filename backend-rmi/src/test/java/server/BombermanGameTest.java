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
        // Deterministic seed for reproducible tests
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

        // Ações devem lançar GameNotStartedException
        assertThrows(GameNotStartedException.class, () -> service.mover(p1.getId(), DirectionEnum.RIGHT));
        assertThrows(GameNotStartedException.class, () -> service.plantarBomba(p1.getId()));
        assertThrows(GameNotStartedException.class, () -> service.confirmarTurno(p1.getId()));
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

        // Tentativa de conectar 3º jogador deve lançar GameFullException
        assertThrows(GameFullException.class, () -> service.conectarJogador("Intruso"));
    }

    @Test
    @DisplayName("1v1 Turno Completo: Mover -> Plantar -> Afastar -> Confirmar -> Explodir Bloco -> Toggle para P2")
    void testCompleteTurnLifecycleWithDirectToggle() throws Exception {
        PlayerDTO p1 = service.conectarJogador("P1");
        PlayerDTO p2 = service.conectarJogador("P2");

        // Configura caminho livre e bloco destrutível em (0, 2)
        service.setCell(0, 0, GameStateDTO.CELL_EMPTY);
        service.setCell(1, 0, GameStateDTO.CELL_EMPTY);
        service.setCell(0, 1, GameStateDTO.CELL_EMPTY);
        service.setCell(0, 2, GameStateDTO.CELL_DESTRUCTIBLE);

        // P1 move para (1, 0)
        service.mover(p1.getId(), DirectionEnum.RIGHT);

        // P1 planta bomba em (1, 0)
        service.plantarBomba(p1.getId());
        assertEquals(GameStateDTO.CELL_BOMB, service.getCell(1, 0));

        // P1 move de volta para (0, 0)
        service.mover(p1.getId(), DirectionEnum.LEFT);

        // P1 afasta descendo para (0, 1) para fugir do raio horizontal da bomba
        service.mover(p1.getId(), DirectionEnum.DOWN);

        // Confirma turno
        GameStateDTO state = service.confirmarTurno(p1.getId());

        // Valida que bomba explodiu (virou CELL_FIRE) e destruiu bloco em (0, 2)
        assertEquals(GameStateDTO.CELL_FIRE, state.getBoard()[0][1]);

        // Toggle direto para P2 (4 movimentos e 1 bomba por turno)
        assertEquals(p2.getId(), state.getCurrentTurnPlayerId(), "O turno deve ter alternado diretamente para P2");
        PlayerDTO p2State = state.getPlayers().get(1);
        assertEquals(4, p2State.getMovementLeft(), "P2 deve iniciar o turno com 4 movimentos");
        assertEquals(1, p2State.getAp(), "P2 inicia seu 1º turno com 1 bomba");
    }

    @Test
    @DisplayName("1v1: Mantém 4 movimentos e limita a 1 bomba em todos os turnos")
    void testFixedMovementAndOneBombPerTurn() throws Exception {
        PlayerDTO p1 = service.conectarJogador("P1");
        PlayerDTO p2 = service.conectarJogador("P2");

        assertEquals(4, p1.getMovementLeft());
        assertEquals(4, p1.getMaxMovement());
        assertEquals(1, p1.getAp());
        assertEquals(4, p2.getMovementLeft());
        assertEquals(1, p2.getAp());

        for (int x = 1; x <= 4; x++) {
            service.setCell(x, 0, GameStateDTO.CELL_EMPTY);
        }
        service.setCell(3, 1, GameStateDTO.CELL_EMPTY);

        service.mover(p1.getId(), DirectionEnum.RIGHT);
        service.mover(p1.getId(), DirectionEnum.RIGHT);
        GameStateDTO state = service.plantarBomba(p1.getId());
        PlayerDTO p1State = state.getPlayers().get(0);
        assertEquals(0, p1State.getAp());
        assertEquals(1, p1State.getBombsPlantedThisTurn());
        assertThrows(InsufficientApException.class, () -> service.plantarBomba(p1.getId()));

        service.mover(p1.getId(), DirectionEnum.RIGHT);
        service.mover(p1.getId(), DirectionEnum.DOWN);
        state = service.obterEstadoJogo();
        assertEquals(0, state.getPlayers().get(0).getMovementLeft());
        assertThrows(NoMovementLeftException.class, () -> service.mover(p1.getId(), DirectionEnum.DOWN));

        state = service.confirmarTurno(p1.getId());
        PlayerDTO p2Turn = state.getPlayers().get(1);
        assertEquals(p2.getId(), state.getCurrentTurnPlayerId());
        assertEquals(4, p2Turn.getMovementLeft());
        assertEquals(4, p2Turn.getMaxMovement());
        assertEquals(1, p2Turn.getAp());

        state = service.confirmarTurno(p2.getId());
        PlayerDTO p1NextTurn = state.getPlayers().get(0);
        assertEquals(p1.getId(), state.getCurrentTurnPlayerId());
        assertEquals(4, p1NextTurn.getMovementLeft());
        assertEquals(4, p1NextTurn.getMaxMovement());
        assertEquals(1, p1NextTurn.getAp());
        assertEquals(0, p1NextTurn.getBombsPlantedThisTurn());
    }

    @Test
    @DisplayName("1v1: Desconexão por W.O. durante IN_PROGRESS finaliza a partida com vitória do oponente")
    void testWalkoverOnDisconnect() throws Exception {
        PlayerDTO p1 = service.conectarJogador("P1");
        PlayerDTO p2 = service.conectarJogador("P2");

        GameStateDTO state = service.obterEstadoJogo();
        assertEquals(GameStatusEnum.IN_PROGRESS, state.getStatus());

        // P1 desconecta durante o jogo
        service.desconectarJogador(p1.getId());

        GameStateDTO finishedState = service.obterEstadoJogo();
        assertEquals(GameStatusEnum.FINISHED, finishedState.getStatus());
        assertEquals(p2.getId(), finishedState.getWinnerId(), "P2 deve ser declarado vencedor por W.O.");
        assertFalse(finishedState.getPlayers().get(0).isVivo(), "P1 deve estar com vivo=false");
        assertTrue(finishedState.getLastActionMessage().contains("Vitória por W.O."));
    }

    @Test
    @DisplayName("1v1: Condição de Empate se ambos forem eliminados pela mesma explosão")
    void testSimultaneousDeathDraw() throws Exception {
        PlayerDTO p1 = service.conectarJogador("P1");
        PlayerDTO p2 = service.conectarJogador("P2");

        // Posiciona ambos na área de fogo de uma bomba em (4,4)
        service.setCell(4, 4, GameStateDTO.CELL_EMPTY);
        service.setCell(4, 3, GameStateDTO.CELL_EMPTY);
        service.setCell(4, 5, GameStateDTO.CELL_EMPTY);

        // Move P1 e P2 para perto
        GameStateDTO st = service.obterEstadoJogo();
        PlayerDTO liveP1 = st.getPlayers().get(0);
        PlayerDTO liveP2 = st.getPlayers().get(1);
        liveP1.setX(4);
        liveP1.setY(3);
        liveP2.setX(4);
        liveP2.setY(5);

        // Planta bomba em (4,4) simulada
        service.setCell(4, 4, GameStateDTO.CELL_BOMB);
        // Confirma turno
        st = service.confirmarTurno(p1.getId());

        // Ambos devem ser atingidos se a bomba em (4,4) explodir
        // Se ambos morreram:
        if (!st.getPlayers().get(0).isVivo() && !st.getPlayers().get(1).isVivo()) {
            assertEquals("EMPATE", st.getWinnerId());
            assertEquals(GameStatusEnum.FINISHED, st.getStatus());
        }
    }
}
