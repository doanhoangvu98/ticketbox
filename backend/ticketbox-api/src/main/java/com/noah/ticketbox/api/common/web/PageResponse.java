package com.noah.ticketbox.api.common.web;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Stable JSON shape for paged results.
 *
 * <p>Serialising Spring's PageImpl directly is discouraged (its JSON structure is not a stable contract).
 * Generic record: works for any item type T.
 */
public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalItems,
        int totalPages,
        boolean hasNext) {

    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.hasNext());
    }
}
