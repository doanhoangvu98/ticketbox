package com.noah.ticketbox.core.repository;

import com.noah.ticketbox.core.common.Identifiable;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Thread-safe in-memory storage backed by {@link ConcurrentHashMap}.
 *
 * <p>Why not HashMap? Concurrent writes to a HashMap can lose entries or corrupt its internal
 * structure. ConcurrentHashMap makes each single operation (get/put/remove) safe.
 * It does NOT make a sequence of operations atomic: see BookingConcurrencyTest
 * ("check-then-act" race).
 */
public class InMemoryRepository<T extends Identifiable<ID>, ID> implements Repository<T, ID> {

    private final ConcurrentMap<ID, T> store = new ConcurrentHashMap<>();

    @Override
    public T save(T entity) {
        Objects.requireNonNull(entity, "entity");
        store.put(Objects.requireNonNull(entity.id(), "entity.id"), entity);
        return entity;
    }

    @Override
    public Optional<T> findById(ID id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<T> findAll() {
        return List.copyOf(store.values());
    }

    @Override
    public boolean deleteById(ID id) {
        return store.remove(id) != null;
    }

    @Override
    public long count() {
        return store.size();
    }
}
