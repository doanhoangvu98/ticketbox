package com.noah.ticketbox.event;

import com.noah.ticketbox.common.error.InvalidStateException;
import com.noah.ticketbox.common.error.NotFoundException;
import com.noah.ticketbox.event.dto.CreateEventRequest;
import com.noah.ticketbox.event.dto.EventResponse;
import com.noah.ticketbox.event.dto.UpdateEventRequest;
import com.noah.ticketbox.seat.SeatEntity;
import com.noah.ticketbox.seat.SeatMapGenerator;
import com.noah.ticketbox.seat.SeatRepository;
import com.noah.ticketbox.seat.SeatType;
import com.noah.ticketbox.venue.VenueEntity;
import com.noah.ticketbox.venue.VenueRepository;
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

/** Unit test: no Spring context, no database. Repositories are mocks; generator and mapper are real. */
@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    private static final OffsetDateTime START = OffsetDateTime.now().plusMonths(1);
    private static final OffsetDateTime END = START.plusHours(2);

    @Mock
    private EventRepository eventRepository;
    @Mock
    private VenueRepository venueRepository;
    @Mock
    private SeatRepository seatRepository;
    @Captor
    private ArgumentCaptor<List<SeatEntity>> seatsCaptor;

    private EventService eventService;
    private final VenueEntity venue = new VenueEntity("Test Hall", "1 Test Street", 5, 10); // 50 seats

    @BeforeEach
    void setUp() {
        eventService = new EventService(eventRepository, venueRepository, seatRepository,
                new SeatMapGenerator(), new EventMapper());
    }

    @Test
    void create_generatesSeatMapFromVenueLayout() {
        when(venueRepository.findById(1L)).thenReturn(Optional.of(venue));
        when(eventRepository.save(any(EventEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        EventResponse response = eventService.create(request(START, END, 2));

        verify(seatRepository).saveAll(seatsCaptor.capture());
        assertThat(seatsCaptor.getValue()).hasSize(50)
                .filteredOn(s -> s.getType() == SeatType.VIP)
                .hasSize(20)
                .allSatisfy(s -> assertThat(s.getPrice()).isEqualByComparingTo("300000"));
        assertThat(response.status()).isEqualTo(EventStatus.DRAFT);
        assertThat(response.endsAt()).isEqualTo(END);
    }

    @Test
    void create_rejectsEndBeforeStart() {
        when(venueRepository.findById(1L)).thenReturn(Optional.of(venue));

        assertThatThrownBy(() -> eventService.create(request(START, START.minusMinutes(1), 0)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("endsAt");
        verify(eventRepository, never()).save(any());
    }

    @Test
    void create_failsWhenVenueMissing() {
        when(venueRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.create(request(START, END, 0))).isInstanceOf(NotFoundException.class);
    }

    @Test
    void create_rejectsMoreVipRowsThanVenueRows() {
        when(venueRepository.findById(1L)).thenReturn(Optional.of(venue));

        assertThatThrownBy(() -> eventService.create(request(START, END, 6))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void update_isRejectedOncePublished() {
        EventEntity event = new EventEntity("Show", venue, START, END, new BigDecimal("200000"), 0);
        event.publish();
        when(eventRepository.findWithVenueById(1L)).thenReturn(Optional.of(event));

        assertThatThrownBy(() -> eventService.update(1L, new UpdateEventRequest("New", START, END)))
                .isInstanceOf(InvalidStateException.class);
        assertThat(event.getName()).isEqualTo("Show");
    }

    private static CreateEventRequest request(OffsetDateTime start, OffsetDateTime end, int vipRows) {
        return new CreateEventRequest("Show", 1L, start, end, new BigDecimal("200000"), vipRows);
    }
}
