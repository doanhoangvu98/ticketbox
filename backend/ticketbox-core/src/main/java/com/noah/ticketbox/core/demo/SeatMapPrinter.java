package com.noah.ticketbox.core.demo;

import com.noah.ticketbox.core.domain.Event;
import com.noah.ticketbox.core.domain.Seat;
import com.noah.ticketbox.core.domain.SeatType;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/** Renders a seat map in the console. [ ] free, [V] free VIP, [H] held, [X] sold. */
final class SeatMapPrinter {

    private SeatMapPrinter() {
    }

    static String render(Event event, Instant now) {
        Map<Character, List<Seat>> rows = event.seats().stream()
                .collect(Collectors.groupingBy(s -> s.position().row(), TreeMap::new, Collectors.toList()));

        StringBuilder sb = new StringBuilder("            ----- STAGE -----\n");
        rows.forEach((row, seats) -> {
            sb.append(row).append("  ");
            seats.forEach(seat -> sb.append(symbol(seat, now)));
            sb.append('\n');
        });
        sb.append("Legend: [ ] free  [V] free VIP  [H] held  [X] sold");
        return sb.toString();
    }

    private static String symbol(Seat seat, Instant now) {
        if (seat.isAvailableAt(now)) {
            return seat.type() == SeatType.VIP ? "[V]" : "[ ]";
        }
        return switch (seat.status()) {
            case HELD -> "[H]";
            case SOLD -> "[X]";
            case AVAILABLE -> "[ ]";
        };
    }
}
