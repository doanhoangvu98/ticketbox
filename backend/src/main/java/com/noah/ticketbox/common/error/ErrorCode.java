package com.noah.ticketbox.common.error;

/**
 * Stable codes clients rely on (frontend reads errorCode, never the message). Add codes when a
 * feature needs them.
 */
public enum ErrorCode {
  EVENT_NOT_FOUND,
  VENUE_NOT_FOUND,
  INVALID_STATE,
  INVALID_ARGUMENT
}
