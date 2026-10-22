package com.noah.ticketbox.api.event;

import com.noah.ticketbox.api.common.persistence.BaseEntity;
import com.noah.ticketbox.api.venue.VenueEntity;
import com.noah.ticketbox.core.domain.EventStatus;
import com.noah.ticketbox.core.exception.InvalidStateException;
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
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Objects;

/**
 * Persistence model of an event.
 *
 * <p>Rich entity: state changes go through methods ({@link #publish()}, {@link #cancel()}, {@link #rename})
 * which enforce the rules, instead of public setters that let any caller break them.
 * Status rules are shared with the Week 1 domain via {@link EventStatus}.
 */
@Getter
@Entity
@Table(name = "event")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    /** LAZY: loading a list of events must not load every venue. See N+1 notes in EventRepository. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private VenueEntity venue;

    @Column(name = "starts_at", nullable = false)
    private OffsetDateTime startsAt;

    @Column(name = "base_price", nullable = false, precision = 12, scale = 0)
    private BigDecimal basePrice;

    @Column(name = "vip_rows", nullable = false)
    private int vipRows;

    @Enumerated(EnumType.STRING) // never ORDINAL: reordering the enum would silently corrupt data
    @Column(nullable = false, length = 20)
    private EventStatus status = EventStatus.DRAFT;

    /** Optimistic locking: UPDATE ... WHERE id = ? AND version = ? */
    @Version
    private long version;

    public EventEntity(String name, VenueEntity venue, OffsetDateTime startsAt, BigDecimal basePrice, int vipRows) {
        this.name = Objects.requireNonNull(name);
        this.venue = Objects.requireNonNull(venue);
        this.startsAt = Objects.requireNonNull(startsAt);
        this.basePrice = Objects.requireNonNull(basePrice);
        this.vipRows = vipRows;
    }

    public void rename(String newName, OffsetDateTime newStartsAt) {
        requireEditable();
        this.name = Objects.requireNonNull(newName);
        this.startsAt = Objects.requireNonNull(newStartsAt);
    }

    public void publish() {
        if (status != EventStatus.DRAFT) {
            throw new InvalidStateException("Only DRAFT events can be published, current: " + status);
        }
        this.status = EventStatus.PUBLISHED;
    }

    public void cancel() {
        if (status == EventStatus.CANCELLED || status == EventStatus.COMPLETED) {
            throw new InvalidStateException("Event already " + status);
        }
        this.status = EventStatus.CANCELLED;
    }

    private void requireEditable() {
        if (!status.isEditable()) {
            throw new InvalidStateException("Only DRAFT events can be edited, current: " + status);
        }
    }
}
