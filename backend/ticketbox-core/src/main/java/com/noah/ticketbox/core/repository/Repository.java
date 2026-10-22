package com.noah.ticketbox.core.repository;

import com.noah.ticketbox.core.common.Identifiable;

import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;

/**
 * Generic repository contract.
 *
 * <p>Bounded type parameter {@code T extends Identifiable<ID>} guarantees every stored object
 * exposes {@code id()}, so one implementation works for Event, Booking, ...
 *
 * <p>Week 2 note: Spring Data's {@code JpaRepository<T, ID>} follows the same idea.
 * Services depend on this interface, not on the in-memory implementation (Dependency Inversion).
 */
public interface Repository<T extends Identifiable<ID>, ID> {

    T save(T entity);

    Optional<T> findById(ID id);

    List<T> findAll();

    /**
     * Filtering with a Predicate: callers pass behaviour, not just data.
     */
    default List<T> findAll(Predicate<? super T> filter) {
        return findAll().stream().filter(filter).toList();
    }

    boolean deleteById(ID id);

    long count();
}
