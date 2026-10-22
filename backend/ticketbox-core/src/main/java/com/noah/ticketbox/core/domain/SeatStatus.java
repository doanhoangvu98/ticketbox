package com.noah.ticketbox.core.domain;

import java.util.*;

/**
 * Seat lifecycle as a small state machine:
 *
 * <pre>
 * AVAILABLE --hold--> HELD --sell--> SOLD
 *     ^                 |
 *     +----release------+
 * </pre>
 * <p>
 * Keeping the allowed transitions in one place avoids scattered if/else checks.
 */
public enum SeatStatus {
    AVAILABLE, HELD, SOLD;

    private static final Map<SeatStatus, Set<SeatStatus>> TRANSITIONS = new EnumMap<>(SeatStatus.class);

    // Setup data for transitions
    static {
        TRANSITIONS.put(AVAILABLE, EnumSet.of(HELD));
        TRANSITIONS.put(HELD, EnumSet.of(SOLD, AVAILABLE));
        TRANSITIONS.put(SOLD, EnumSet.noneOf(SeatStatus.class));
    }

    // Ex: SeatStatus.AVAILABLE.canTransitionTo(SeatStatus.HELD);
    public boolean canTransitionTo(SeatStatus target) {
        return TRANSITIONS.getOrDefault(this, Collections.emptySet()).contains(target);
    }
}
