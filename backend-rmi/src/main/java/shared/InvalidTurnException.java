package shared;

import java.io.Serializable;

public class InvalidTurnException extends Exception implements Serializable {
    private static final long serialVersionUID = 1L;

    public InvalidTurnException(String message) {
        super(message);
    }
}
