package shared;

import java.io.Serializable;

public class PlayerDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    public static final int INITIAL_AP = 1;
    public static final int BASE_BOMBS_PER_TURN = 1;
    public static final int INITIAL_MOVEMENT = 4;

    private String id;
    private String nome;
    private int x;
    private int y;
    private boolean vivo;
    private int ap;
    private int movementLeft;
    private int maxMovement;
    private int bombsPlantedThisTurn;

    public PlayerDTO() {
    }

    public PlayerDTO(String id, String nome, int x, int y) {
        this.id = id;
        this.nome = nome;
        this.x = x;
        this.y = y;
        this.vivo = true;
        this.ap = INITIAL_AP;
        this.movementLeft = INITIAL_MOVEMENT;
        this.maxMovement = INITIAL_MOVEMENT;
        this.bombsPlantedThisTurn = 0;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public int getX() {
        return x;
    }

    public void setX(int x) {
        this.x = x;
    }

    public int getY() {
        return y;
    }

    public void setY(int y) {
        this.y = y;
    }

    public boolean isVivo() {
        return vivo;
    }

    public void setVivo(boolean vivo) {
        this.vivo = vivo;
    }

    public int getAp() {
        return ap;
    }

    public void setAp(int ap) {
        this.ap = ap;
    }

    public int getMovementLeft() {
        return movementLeft;
    }

    public void setMovementLeft(int movementLeft) {
        this.movementLeft = movementLeft;
    }

    public int getMaxMovement() {
        return maxMovement;
    }

    public void setMaxMovement(int maxMovement) {
        this.maxMovement = maxMovement;
    }

    public int getBombsPlantedThisTurn() {
        return bombsPlantedThisTurn;
    }

    public void setBombsPlantedThisTurn(int bombsPlantedThisTurn) {
        this.bombsPlantedThisTurn = bombsPlantedThisTurn;
    }

    @Override
    public String toString() {
        return "PlayerDTO{" +
                "id='" + id + '\'' +
                ", nome='" + nome + '\'' +
                ", x=" + x +
                ", y=" + y +
                ", vivo=" + vivo +
                ", ap=" + ap +
                ", movementLeft=" + movementLeft +
                ", bombsPlantedThisTurn=" + bombsPlantedThisTurn +
                '}';
    }
}
