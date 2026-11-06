package com.noah.week1.repository;

import com.noah.week1.common.Identifiable;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.Predicate;

/**
 * ConcurrentHashMap: each single get/put is thread-safe. A sequence of calls is not atomic,
 * which is why booking still needs EventLocks.
 */
public class InMemoryRepository<T extends Identifiable<ID>, ID> implements Repository<T, ID> {

    private final ConcurrentMap<ID, T> store = new ConcurrentHashMap<>();

    @Override
    public T save(T entity) {
        store.put(entity.id(), entity);
        return entity;
    }

    @Override
    public Optional<T> findById(ID id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<T> findAll(Predicate<? super T> filter) {
        return store.values().stream().filter(filter).toList();
    }
}
