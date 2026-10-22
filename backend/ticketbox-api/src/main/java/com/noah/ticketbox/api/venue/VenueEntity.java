package com.noah.ticketbox.api.venue;

import com.noah.ticketbox.api.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A physical place with a fixed rectangular seat layout. Managed by seed data in Week 2. */
@Getter
@Entity
@Table(name = "venue")
@NoArgsConstructor(access = AccessLevel.PROTECTED) // required by JPA, hidden from application code
public class VenueEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(name = "total_rows", nullable = false)
    private int totalRows;

    @Column(name = "seats_per_row", nullable = false)
    private int seatsPerRow;

    public VenueEntity(String name, String address, int totalRows, int seatsPerRow) {
        this.name = name;
        this.address = address;
        this.totalRows = totalRows;
        this.seatsPerRow = seatsPerRow;
    }

    public int capacity() {
        return totalRows * seatsPerRow;
    }
}
