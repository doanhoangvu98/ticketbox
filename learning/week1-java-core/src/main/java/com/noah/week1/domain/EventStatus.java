package com.noah.week1.domain;

public enum EventStatus {
    DRAFT,
    PUBLISHED,
    CANCELLED;

    public boolean isBookable() {
        return this == PUBLISHED;
    }
}
