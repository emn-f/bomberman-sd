package shared;

import java.io.Serializable;

public class InsufficientApException extends Exception implements Serializable {
    private static final long serialVersionUID = 1L;

    public InsufficientApException(String message) {
        super(message);
    }
}
