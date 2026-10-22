package com.noah.ticketbox.api.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.Nullable;

import java.util.Optional;

public interface EventRepository extends JpaRepository<EventEntity, Long>, JpaSpecificationExecutor<EventEntity> {

    /**
     * N+1 fix. Without {@code @EntityGraph}, listing 20 events runs 1 query for the page
     * + 1 query PER event to load its venue (when the mapper reads venue.getName()).
     * The entity graph turns it into a single JOIN.
     *
     * <p>To reproduce the problem for the demo: comment out the annotation, run with profile "dev",
     * call GET /api/v1/events and count the SQL lines in the log. See docs/BENCHMARK.md.
     */
    @Override
    @EntityGraph(attributePaths = "venue")
    Page<EventEntity> findAll(@Nullable Specification<EventEntity> spec, Pageable pageable);

    /** Detail view also needs the venue, load it in the same query. */
    @EntityGraph(attributePaths = "venue")
    Optional<EventEntity> findWithVenueById(Long id);
}
