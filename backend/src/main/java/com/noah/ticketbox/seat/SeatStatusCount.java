package com.noah.ticketbox.seat;

/** Interface projection filled from the aliases of a GROUP BY query. */
public interface SeatStatusCount {

  SeatStatus getStatus();

  long getTotal();
}
