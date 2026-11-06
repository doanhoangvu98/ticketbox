package com.noah.week1.service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

/**
 * One lock per event. Every read or write of an event's mutable state (status, seats) goes through
 * {@link #withLock}, so there is a single rule to remember.
 *
 * <ul>
 *   <li>Per event, not global: buyers of different events never wait for each other.</li>
 *   <li>Per event, not per seat: an order touching several seats takes exactly one lock, so no deadlock.</li>
 *   <li>ReentrantLock, not synchronized: on Java 21 a virtual thread blocked in synchronized pins its
 *       carrier thread (fixed in JDK 24, JEP 491). See docs/DECISIONS.md ADR-020.</li>
 * </ul>
 */
public final class EventLocks {

    private final ConcurrentMap<Long, ReentrantLock> locks = new ConcurrentHashMap<>();

    public <T> T withLock(Long eventId, Supplier<T> action) {
        ReentrantLock lock = locks.computeIfAbsent(eventId, id -> new ReentrantLock());
        lock.lock();
        try {
            return action.get();
        } finally {
            lock.unlock(); // always released, even when the action throws
        }
    }
}
