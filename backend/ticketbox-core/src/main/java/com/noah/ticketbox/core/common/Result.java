package com.noah.ticketbox.core.common;

import java.util.Objects;
import java.util.function.Function;

/**
 * A value that is either a success or a failure, without throwing.
 *
 * <p>Knowledge shown: generics, sealed interface (Java 17), records,
 * higher-order functions ({@link #map}, {@link #fold}).
 *
 * @param <T> type of the success value
 */
public sealed interface Result<T> permits Result.Success, Result.Failure {

    static <T> Result<T> success(T value) {
        return new Success<>(value);
    }

    static <T> Result<T> failure(String errorCode, String message) {
        return new Failure<>(errorCode, message);
    }

    default boolean isSuccess() {
        return this instanceof Success<T>;
    }
    
    /**
     * Collapses both branches into a single value.
     */
    default <R> R fold(Function<? super T, ? extends R> onSuccess, Function<? super Failure<T>, ? extends R> onFailure) {
        if (this instanceof Success<T>(T value)) {
            return onSuccess.apply(value);
        }
        return onFailure.apply((Failure<T>) this);
    }

    /**
     * Transforms the success value; a failure passes through unchanged.
     */
    default <R> Result<R> map(Function<? super T, ? extends R> mapper) {
        Objects.requireNonNull(mapper); // if null throw NullPointerException
        if (this instanceof Success<T>(T value)) {
            return new Success<>(mapper.apply(value));
        }
        Failure<T> f = (Failure<T>) this;
        return new Failure<>(f.errorCode(), f.message());
    }

    record Success<T>(T value) implements Result<T> {
    }

    record Failure<T>(String errorCode, String message) implements Result<T> {
    }
}
