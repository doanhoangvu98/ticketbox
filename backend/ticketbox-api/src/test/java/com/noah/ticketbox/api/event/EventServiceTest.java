package com.noah.ticketbox.api.event;

import com.noah.ticketbox.api.event.dto.CreateEventRequest;
import com.noah.ticketbox.api.event.dto.EventResponse;
import com.noah.ticketbox.api.event.dto.UpdateEventRequest;
import com.noah.ticketbox.api.seat.SeatEntity;
import com.noah.ticketbox.api.seat.SeatRepository;
import com.noah.ticketbox.api.venue.VenueEntity;
import com.noah.ticketbox.api.venue.VenueRepository;
import com.noah.ticketbox.core.domain.EventStatus;
import com.noah.ticketbox.core.domain.SeatMapFactory;
import com.noah.ticketbox.core.domain.SeatType;
import com.noah.ticketbox.core.exception.InvalidStateException;
import com.noah.ticketbox.core.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test: no Spring context, no database. Repositories are Mockito mocks,
 * SeatMapFactory and EventMapper are real (pure logic, nothing to isolate).
 */
@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    private static final OffsetDateTime NEXT_MONTH = OffsetDateTime.now().plusMonths(1);

    @Mock
    private EventRepository eventRepository;
    @Mock
    private VenueRepository venueRepository;
    @Mock
    private SeatRepository seatRepository;
    @Captor
    private ArgumentCaptor<List<SeatEntity>> seatsCaptor;

    private EventService eventService;
    private VenueEntity venue;

    @BeforeEach
    void setUp() {
        eventService = new EventService(eventRepository, venueRepository, seatRepository,
                new SeatMapFactory(), new EventMapper());
        venue = new VenueEntity("Test Hall", "1 Test Street", 5, 10); // 50 seats
    }

    @Test
    void create_generatesSeatMapFromVenueLayout() {
        when(venueRepository.findById(1L)).thenReturn(Optional.of(venue));
        when(eventRepository.save(any(EventEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(seatRepository.countByStatus(any())).thenReturn(List.of());

        EventResponse response = eventService.create(
                new CreateEventRequest("Show", 1L, NEXT_MONTH, new BigDecimal("200000"), 2));

        verify(seatRepository).saveAll(seatsCaptor.capture());
        List<SeatEntity> seats = seatsCaptor.getValue();
        assertThat(seats).hasSize(50);
        assertThat(seats).filteredOn(s -> s.getType() == SeatType.VIP)
                .hasSize(20)                                            // rows A, B
                .allSatisfy(s -> assertThat(s.getPrice()).isEqualByComparingTo("300000"));
        assertThat(response.status()).isEqualTo(EventStatus.DRAFT);
        assertThat(response.capacity()).isEqualTo(50);
    }

    @Test
    void create_failsWhenVenueMissing() {
        when(venueRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.create(
                new CreateEventRequest("Show", 99L, NEXT_MONTH, new BigDecimal("200000"), 0)))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("99");
        verify(eventRepository, never()).save(any());
    }

    @Test
    void create_rejectsMoreVipRowsThanVenueRows() {
        when(venueRepository.findById(1L)).thenReturn(Optional.of(venue));

        assertThatThrownBy(() -> eventService.create(
                new CreateEventRequest("Show", 1L, NEXT_MONTH, new BigDecimal("200000"), 6)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void publish_movesDraftToPublished() {
        EventEntity event = new EventEntity("Show", venue, NEXT_MONTH, new BigDecimal("200000"), 0);
        when(eventRepository.findWithVenueById(1L)).thenReturn(Optional.of(event));
        when(seatRepository.countByStatus(1L)).thenReturn(List.of());

        EventResponse response = eventService.publish(1L);

        assertThat(response.status()).isEqualTo(EventStatus.PUBLISHED);
    }

    @Test
    void update_isRejectedOncePublished() {
        EventEntity event = new EventEntity("Show", venue, NEXT_MONTH, new BigDecimal("200000"), 0);
        event.publish();
        when(eventRepository.findWithVenueById(1L)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> eventService.update(1L, new UpdateEventRequest("New name", NEXT_MONTH)))
                .isInstanceOf(InvalidStateException.class);
        assertThat(event.getName()).isEqualTo("Show");
    }
}
