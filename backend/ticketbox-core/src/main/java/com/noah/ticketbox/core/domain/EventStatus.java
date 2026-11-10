package com.noah.ticketbox.core.domain;

/**
 * DRAFT -> PUBLISHED -> (CANCELLED | COMPLETED).
 * Reused by the API module as the persisted status column.
 */
public enum EventStatus {
    DRAFT,
    PUBLISHED,
    CANCELLED,
    COMPLETED;

    public boolean isEditable() {
        return this == DRAFT;
    }
}
