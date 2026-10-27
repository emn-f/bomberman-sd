package shared;

import java.io.Serializable;

public class GameNotStartedException extends Exception implements Serializable {
    private static final long serialVersionUID = 1L;

    public GameNotStartedException(String message) {
        super(message);
    }
}
