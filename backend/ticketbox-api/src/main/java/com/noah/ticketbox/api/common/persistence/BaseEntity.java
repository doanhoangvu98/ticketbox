package com.noah.ticketbox.api.common.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.Getter;
import org.hibernate.Hibernate;

import java.time.Instant;
import java.util.Objects;

/**
 * Common audit columns + a JPA-safe equals/hashCode.
 *
 * <p>Why not Lombok {@code @Data}/{@code @EqualsAndHashCode} on entities?
 * <ul>
 *   <li>They include lazy associations, which can trigger extra queries or LazyInitializationException.</li>
 *   <li>A hashCode based on a generated id changes after persist, breaking HashSet membership.</li>
 * </ul>
 * Pattern used here: equal only if same (unproxied) class and same non-null id;
 * hashCode is constant per class. See docs/DECISIONS.md ADR-007.
 */
@Getter
@MappedSuperclass
public abstract class BaseEntity {

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public abstract Long getId();

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    @Override
    public final boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) {
            return false;
        }
        BaseEntity other = (BaseEntity) o;
        return getId() != null && Objects.equals(getId(), other.getId());
    }

    @Override
    public final int hashCode() {
        return Hibernate.getClass(this).hashCode();
    }
}
