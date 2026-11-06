package com.noah.week1.repository;

import com.noah.week1.common.Identifiable;

import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;

/**
 * Storage contract. {@code T extends Identifiable<ID>} guarantees every entity has {@code id()}.
 * Services depend on this interface, not on the in-memory implementation.
 */
public interface Repository<T extends Identifiable<ID>, ID> {

    T save(T entity);

    Optional<T> findById(ID id);

    List<T> findAll(Predicate<? super T> filter);
}
