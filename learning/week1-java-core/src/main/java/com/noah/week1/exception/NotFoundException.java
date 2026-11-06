package com.noah.week1.exception;

public class NotFoundException extends BusinessException {

    private NotFoundException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }

    public static NotFoundException event(Object id) {
        return new NotFoundException(ErrorCode.EVENT_NOT_FOUND, "Event not found: " + id);
    }

    public static NotFoundException seat(Object position) {
        return new NotFoundException(ErrorCode.SEAT_NOT_FOUND, "Seat not found: " + position);
    }

    public static NotFoundException order(Object id) {
        return new NotFoundException(ErrorCode.ORDER_NOT_FOUND, "Order not found: " + id);
    }
}
