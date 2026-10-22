package com.noah.ticketbox.core.exception;

/** An action is not allowed in the current state (e.g. publishing a cancelled event). */
public class InvalidStateException extends BusinessException {

    public InvalidStateException(String message) {
        super(ErrorCode.INVALID_STATE, message);
    }
}
