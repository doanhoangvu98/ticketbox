package com.noah.ticketbox.core.common;

/**
 * Anything that has an identity. Used as an upper bound for the generic repository:
 * {@code Repository<T extends Identifiable<ID>, ID>}.
 *
 * @param <ID> type of the identifier (Long, UUID, ...)
 */
public interface Identifiable<ID> {

    ID id();
}
