package shared;

import java.io.Serializable;

public class NoMovementLeftException extends Exception implements Serializable {
    private static final long serialVersionUID = 1L;

    public NoMovementLeftException(String message) {
        super(message);
    }
}
