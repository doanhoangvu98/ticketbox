package com.noah.ticketbox.core.service;

import com.noah.ticketbox.core.domain.SeatLayout;

import java.time.LocalDateTime;
import java.util.Objects;

/** Input DTO for creating an event. Records are ideal for immutable data carriers. */
public record CreateEventCommand(String name, String venueName, LocalDateTime startsAt, SeatLayout layout) {

    public CreateEventCommand {
        Objects.requireNonNull(startsAt, "startsAt");
        Objects.requireNonNull(layout, "layout");
    }
}
