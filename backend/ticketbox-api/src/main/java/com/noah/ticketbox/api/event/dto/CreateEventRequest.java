package com.noah.ticketbox.api.event.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Bean Validation (JSR 380) on a record: rules live next to the data, checked by @Valid in the controller. */
public record CreateEventRequest(
        @Schema(example = "Noah Live Concert 2026")
        @NotBlank @Size(max = 200) String name,

        @Schema(example = "1")
        @NotNull Long venueId,

        @Schema(example = "2026-12-24T20:00:00+07:00")
        @NotNull @Future OffsetDateTime startsAt,

        @Schema(example = "500000", description = "Price of a STANDARD seat in VND. VIP = 1.5x")
        @NotNull @DecimalMin(value = "10000") BigDecimal basePrice,

        @Schema(example = "2", description = "Number of front rows that are VIP")
        @Min(0) @Max(26) int vipRows) {
}
