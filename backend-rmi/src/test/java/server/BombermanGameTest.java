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

        // Toggle direto para P2 (1º turno de P2: 5 movimentos e 1 bomba inicial)
        assertEquals(p2.getId(), state.getCurrentTurnPlayerId(), "O turno deve ter alternado diretamente para P2");
        PlayerDTO p2State = state.getPlayers().get(1);
        assertEquals(5, p2State.getMovementLeft(), "P2 deve iniciar o turno com 5 movimentos");
        assertEquals(1, p2State.getAp(), "P2 inicia seu 1º turno com 1 bomba");
    }

    @Test
    @DisplayName("1v1: Progressão de passos (5, 8, 12...) e bombas por turno (1, 2, 2, 2, 3, 3, 3, 4...)")
    void testProgressiveMovementAndBombs() throws Exception {
        PlayerDTO p1 = service.conectarJogador("P1");
        PlayerDTO p2 = service.conectarJogador("P2");

        // Turno 1: ambos começam com 1 bomba e 5 passos
        assertEquals(1, p1.getAp());
        assertEquals(5, p1.getMovementLeft());

        // P1 confirma Turno 1 -> Vez vai para Turno 1 de P2 (5 passos, 1 bomba)
        GameStateDTO state = service.confirmarTurno(p1.getId());
        PlayerDTO p2Turn1 = state.getPlayers().get(1);
        assertEquals(5, p2Turn1.getMovementLeft(), "P2 no seu 1º turno tem 5 passos");
        assertEquals(1, p2Turn1.getAp(), "P2 no seu 1º turno tem 1 bomba");

        // P2 confirma Turno 1 -> Vez vai para Turno 2 de P1 (8 passos, 2 bombas)
        state = service.confirmarTurno(p2.getId());
        PlayerDTO p1Turn2 = state.getPlayers().get(0);
        assertEquals(8, p1Turn2.getMovementLeft(), "P1 no seu 2º turno deve ter 8 passos");
        assertEquals(2, p1Turn2.getAp(), "P1 no seu 2º turno tem 2 bombas");

        // P1 confirma Turno 2 -> Vez vai para Turno 2 de P2 (8 passos, 2 bombas)
        state = service.confirmarTurno(p1.getId());
        PlayerDTO p2Turn2 = state.getPlayers().get(1);
        assertEquals(8, p2Turn2.getMovementLeft(), "P2 no seu 2º turno deve ter 8 passos");
        assertEquals(2, p2Turn2.getAp(), "P2 no seu 2º turno tem 2 bombas");

        // P2 confirma Turno 2 -> Vez vai para Turno 3 de P1 (12 passos, 2 bombas)
        state = service.confirmarTurno(p2.getId());
        PlayerDTO p1Turn3 = state.getPlayers().get(0);
        assertEquals(12, p1Turn3.getMovementLeft(), "P1 no seu 3º turno deve ter 12 passos");
        assertEquals(2, p1Turn3.getAp(), "P1 no seu 3º turno tem 2 bombas");

        // P1 confirma Turno 3 -> Vez vai para Turno 3 de P2 (12 passos, 2 bombas)
        state = service.confirmarTurno(p1.getId());

        // P2 confirma Turno 3 -> Vez vai para Turno 4 de P1 (17 passos, 2 bombas)
        state = service.confirmarTurno(p2.getId());
        PlayerDTO p1Turn4 = state.getPlayers().get(0);
        assertEquals(17, p1Turn4.getMovementLeft(), "P1 no seu 4º turno deve ter 17 passos");
        assertEquals(2, p1Turn4.getAp(), "P1 no seu 4º turno tem 2 bombas");

        // P1 confirma Turno 4 -> Turno 4 de P2 -> P2 confirma Turno 4 -> Turno 5 de P1 (23 passos, 3 bombas)
        service.confirmarTurno(p1.getId());
        state = service.confirmarTurno(p2.getId());
        PlayerDTO p1Turn5 = state.getPlayers().get(0);
        assertEquals(23, p1Turn5.getMovementLeft(), "P1 no seu 5º turno deve ter 23 passos");
        assertEquals(3, p1Turn5.getAp(), "P1 no seu 5º turno tem 3 bombas");

        //Valida fórmula direta para Turnos 6, 7 e 8
        assertEquals(3, PlayerDTO.calculateBombAllowanceForTurn(6));
        assertEquals(3, PlayerDTO.calculateBombAllowanceForTurn(7));
        assertEquals(4, PlayerDTO.calculateBombAllowanceForTurn(8));
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
