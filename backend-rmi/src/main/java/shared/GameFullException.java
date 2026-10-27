package shared;

import java.io.Serializable;

public class GameFullException extends Exception implements Serializable {
    private static final long serialVersionUID = 1L;

    public GameFullException(String message) {
        super(message);
    }
}
