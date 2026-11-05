package shared;

import java.rmi.Remote;
import java.rmi.RemoteException;

public interface IBombermanService extends Remote {
    PlayerDTO conectarJogador(String nome) throws RemoteException, GameFullException;
    GameStateDTO mover(String playerId, DirectionEnum direcao) throws RemoteException, GameNotStartedException, InvalidTurnException, NoMovementLeftException, CollisionException;
    GameStateDTO plantarBomba(String playerId) throws RemoteException, GameNotStartedException, InvalidTurnException, InsufficientApException;
    GameStateDTO confirmarTurno(String playerId) throws RemoteException, GameNotStartedException, InvalidTurnException;
    GameStateDTO obterEstadoJogo() throws RemoteException;
    void desconectarJogador(String playerId) throws RemoteException;
    GameStateDTO reiniciarPartida() throws RemoteException;
}
