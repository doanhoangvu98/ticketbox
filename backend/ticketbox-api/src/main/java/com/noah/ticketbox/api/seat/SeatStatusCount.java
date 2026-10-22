package com.noah.ticketbox.api.seat;

import com.noah.ticketbox.core.domain.SeatStatus;

/** Interface-based projection: Spring Data fills it from the aliases of a GROUP BY query. */
public interface SeatStatusCount {

    SeatStatus getStatus();

    long getTotal();
}
