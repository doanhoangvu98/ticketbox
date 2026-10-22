package com.noah.ticketbox.core.domain;

/**
 * DRAFT -> PUBLISHED -> (CANCELLED | COMPLETED). Only PUBLISHED events can be booked.
 * Also reused by the API module as the persisted status column.
 */
public enum EventStatus {
    DRAFT,
    PUBLISHED,
    CANCELLED,
    COMPLETED;

    public boolean isBookable() {
        return this == PUBLISHED;
    }

    public boolean isEditable() {
        return this == DRAFT;
    }
}
