package com.noah.week1.domain;

/** PENDING (seats held) -> PAID | CANCELLED (by the buyer) | EXPIRED (hold timed out). */
public enum OrderStatus {
    PENDING,
    PAID,
    CANCELLED,
    EXPIRED
}
