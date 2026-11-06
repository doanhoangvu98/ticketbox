package com.noah.week1.exception;

public class OrderExpiredException extends BusinessException {

    public OrderExpiredException(Object orderId) {
        super(ErrorCode.ORDER_EXPIRED, "Order expired: " + orderId);
    }
}
