package com.noah.week1.common;

import java.util.concurrent.atomic.AtomicLong;

/** Stands in for a database sequence. AtomicLong keeps ids unique across threads without a lock. */
public final class IdGenerator {

    private final AtomicLong sequence = new AtomicLong(1);

    public long next() {
        return sequence.getAndIncrement();
    }
}
