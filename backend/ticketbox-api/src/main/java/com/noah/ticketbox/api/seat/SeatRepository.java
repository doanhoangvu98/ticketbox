package com.noah.ticketbox.api.seat;

import com.noah.ticketbox.core.domain.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SeatRepository extends JpaRepository<SeatEntity, Long> {

    /** Derived query: Spring generates the JPQL from the method name. */
    List<SeatEntity> findByEventIdOrderByRowLabelAscSeatNumberAsc(Long eventId);

    List<SeatEntity> findByEventIdAndStatusOrderByRowLabelAscSeatNumberAsc(Long eventId, SeatStatus status);

    /** Explicit JPQL when the method name would be unreadable or a projection is needed. */
    @Query("""
            select s.status as status, count(s) as total
            from SeatEntity s
            where s.event.id = :eventId
            group by s.status
            """)
    List<SeatStatusCount> countByStatus(@Param("eventId") Long eventId);
}
