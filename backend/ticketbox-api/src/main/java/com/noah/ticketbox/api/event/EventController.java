package com.noah.ticketbox.api.event;

import com.noah.ticketbox.api.common.web.PageResponse;
import com.noah.ticketbox.api.event.dto.CreateEventRequest;
import com.noah.ticketbox.api.event.dto.EventResponse;
import com.noah.ticketbox.api.event.dto.EventSearchCriteria;
import com.noah.ticketbox.api.event.dto.EventSummaryResponse;
import com.noah.ticketbox.api.event.dto.UpdateEventRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

/**
 * Thin controller: HTTP in/out only. No business rules, no entities in responses.
 * State changes that are not plain field updates are modelled as actions (POST /{id}/publish),
 * which is clearer than PATCH {"status": "PUBLISHED"}.
 */
@Tag(name = "Events")
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @Operation(summary = "Create a DRAFT event and generate its seat map from the venue layout")
    @PostMapping
    public ResponseEntity<EventResponse> create(@Valid @RequestBody CreateEventRequest request) {
        EventResponse created = eventService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created); // 201 + Location header
    }

    @Operation(summary = "Search events (paged). Example: ?status=PUBLISHED&keyword=live&sort=startsAt,asc")
    @GetMapping
    public PageResponse<EventSummaryResponse> search(
            @ParameterObject EventSearchCriteria criteria,
            @ParameterObject @PageableDefault(size = 20, sort = "startsAt", direction = Sort.Direction.ASC)
            Pageable pageable) {
        return PageResponse.from(eventService.search(criteria, pageable));
    }

    @Operation(summary = "Event detail with seat counts")
    @GetMapping("/{id}")
    public EventResponse get(@PathVariable Long id) {
        return eventService.get(id);
    }

    @Operation(summary = "Update name/start time (DRAFT only)")
    @PutMapping("/{id}")
    public EventResponse update(@PathVariable Long id, @Valid @RequestBody UpdateEventRequest request) {
        return eventService.update(id, request);
    }

    @Operation(summary = "DRAFT -> PUBLISHED (open for booking)")
    @PostMapping("/{id}/publish")
    public EventResponse publish(@PathVariable Long id) {
        return eventService.publish(id);
    }

    @Operation(summary = "Cancel an event")
    @PostMapping("/{id}/cancel")
    public EventResponse cancel(@PathVariable Long id) {
        return eventService.cancel(id);
    }
}
