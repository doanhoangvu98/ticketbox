package com.noah.ticketbox.core.common;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Thread-safe sequence generator, standing in for a database sequence in Week 1.
 * AtomicLong uses CAS (compare-and-swap), so no lock is needed.
 */
public final class IdGenerator {

    private final AtomicLong sequence;

    public IdGenerator() {
        this(1L);
    }

    public IdGenerator(long start) {
        this.sequence = new AtomicLong(start);
    }

    public long next() {
        return sequence.getAndIncrement();
    }
}
