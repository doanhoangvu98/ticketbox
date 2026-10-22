package com.noah.ticketbox.api.event.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/** Only DRAFT events can be updated. Venue/price changes would require regenerating seats (out of scope). */
public record UpdateEventRequest(
        @NotBlank @Size(max = 200) String name,
        @NotNull @Future OffsetDateTime startsAt) {
}
