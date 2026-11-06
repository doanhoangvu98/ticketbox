package com.noah.ticketbox.common.error;

/** Expected business error. Mapped to an HTTP status in one place: GlobalExceptionHandler. */
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
