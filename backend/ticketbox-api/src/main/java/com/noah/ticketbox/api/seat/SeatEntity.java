package com.noah.ticketbox.api.seat;

import com.noah.ticketbox.api.common.persistence.BaseEntity;
import com.noah.ticketbox.api.event.EventEntity;
import com.noah.ticketbox.core.domain.Seat;
import com.noah.ticketbox.core.domain.SeatStatus;
import com.noah.ticketbox.core.domain.SeatType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * One seat of one event (a 500-seat event = 500 rows).
 *
 * <p>Id strategy is SEQUENCE with allocationSize 50 (not IDENTITY): Hibernate reserves 50 ids per
 * round-trip and can batch the 500 INSERTs. IDENTITY would force one INSERT per round-trip.
 * See ADR-005.
 *
 * <p>Week 3 will add hold/sell methods + use {@link #version} for optimistic locking.
 */
@Getter
@Entity
@Table(name = "seat")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SeatEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seat_seq")
    @SequenceGenerator(name = "seat_seq", sequenceName = "seat_seq", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private EventEntity event;

    @Column(name = "row_label", nullable = false, length = 1)
    private String rowLabel;

    @Column(name = "seat_number", nullable = false)
    private int seatNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SeatType type;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SeatStatus status = SeatStatus.AVAILABLE;

    @Column(name = "held_by", length = 100)
    private String heldBy;

    @Column(name = "hold_expires_at")
    private Instant holdExpiresAt;

    @Version
    private long version;

    /** Converts a Week 1 domain seat into a persistent row. Price is computed by the domain (polymorphism). */
    public static SeatEntity of(EventEntity event, Seat seat) {
        SeatEntity entity = new SeatEntity();
        entity.event = event;
        entity.rowLabel = String.valueOf(seat.position().row());
        entity.seatNumber = seat.position().number();
        entity.type = seat.type();
        entity.price = seat.price();
        return entity;
    }

    public String code() {
        return rowLabel + seatNumber;
    }
}
