package com.noah.week1.common;

/** Anything stored in a {@code Repository} must expose its id. */
public interface Identifiable<ID> {

    ID id();
}
