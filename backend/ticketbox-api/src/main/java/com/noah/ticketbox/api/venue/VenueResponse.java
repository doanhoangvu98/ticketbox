package com.noah.ticketbox.api.venue;

public record VenueResponse(Long id, String name, String address, int totalRows, int seatsPerRow, int capacity) {

    public static VenueResponse from(VenueEntity v) {
        return new VenueResponse(v.getId(), v.getName(), v.getAddress(), v.getTotalRows(), v.getSeatsPerRow(),
                v.capacity());
    }
}
