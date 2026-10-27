package shared;

import java.io.Serializable;

public enum GameStatusEnum implements Serializable {
    WAITING_FOR_PLAYERS,
    IN_PROGRESS,
    FINISHED
}
