package com.noah.ticketbox.api.venue;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Venues")
@RestController
@RequestMapping("/api/v1/venues")
@RequiredArgsConstructor
public class VenueController {

    private final VenueRepository venueRepository;

    /** Tiny read-only endpoint; a dedicated service layer would add no value here (YAGNI). */
    @Operation(summary = "List venues (used when creating an event)")
    @GetMapping
    @Transactional(readOnly = true)
    public List<VenueResponse> list() {
        return venueRepository.findAll(Sort.by("name")).stream().map(VenueResponse::from).toList();
    }
}
