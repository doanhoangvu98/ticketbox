package com.noah.week1.exception;

public class InvalidStateException extends BusinessException {

    public InvalidStateException(String message) {
        super(ErrorCode.INVALID_STATE, message);
    }
}
