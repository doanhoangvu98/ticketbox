package com.noah.ticketbox.common.error;

public class NotFoundException extends BusinessException {

  private NotFoundException(ErrorCode errorCode, String message) {
    super(errorCode, message);
  }

  public static NotFoundException event(Object id) {
    return new NotFoundException(ErrorCode.EVENT_NOT_FOUND, "Event not found: " + id);
  }

  public static NotFoundException venue(Object id) {
    return new NotFoundException(ErrorCode.VENUE_NOT_FOUND, "Venue not found: " + id);
  }
}
