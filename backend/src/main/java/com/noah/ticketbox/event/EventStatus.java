package com.noah.ticketbox.event;

/** DRAFT -> PUBLISHED -> (CANCELLED | COMPLETED). Week 3 adds PENDING_REVIEW and REJECTED. */
public enum EventStatus {
  DRAFT,
  PUBLISHED,
  CANCELLED,
  COMPLETED
}
