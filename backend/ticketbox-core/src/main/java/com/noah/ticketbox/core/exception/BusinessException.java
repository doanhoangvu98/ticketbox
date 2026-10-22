package com.noah.ticketbox.core.exception;

/**
 * Root of all expected business errors.
 *
 * <p>Unchecked on purpose: callers cannot "recover" from most business rules at
 * the call site, and the API layer handles them centrally.
 */
public abstract class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    protected BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public ErrorCode errorCode() {
        return errorCode;
    }
}
