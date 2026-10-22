package com.noah.ticketbox.api.common.web;

import com.noah.ticketbox.core.exception.BusinessException;
import com.noah.ticketbox.core.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mapping.PropertyReferenceException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Turns every error into an RFC 7807 "problem detail" JSON:
 *
 * <pre>{@code
 * {
 *   "type": "https://ticketbox.dev/errors/event-not-found",
 *   "title": "Not Found", "status": 404,
 *   "detail": "Event not found: 42",
 *   "errorCode": "EVENT_NOT_FOUND", "timestamp": "..."
 * }
 * }</pre>
 *
 * Extending ResponseEntityExceptionHandler means Spring MVC's own errors (bad JSON, wrong method...)
 * use the same format.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final String ERROR_TYPE_BASE = "https://ticketbox.dev/errors/";

    @ExceptionHandler(BusinessException.class)
    public ProblemDetail handleBusiness(BusinessException ex) {
        return problem(statusOf(ex.errorCode()), ex.errorCode(), ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        return problem(HttpStatus.BAD_REQUEST, ErrorCode.INVALID_ARGUMENT, ex.getMessage());
    }

    /** Unknown sort property, e.g. ?sort=hacker -> 400 instead of 500. */
    @ExceptionHandler(PropertyReferenceException.class)
    public ProblemDetail handleBadSort(PropertyReferenceException ex) {
        return problem(HttpStatus.BAD_REQUEST, ErrorCode.INVALID_ARGUMENT, ex.getMessage());
    }

    /** Two admins edited the same event at the same time (@Version mismatch). */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ProblemDetail handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        return problem(HttpStatus.CONFLICT, ErrorCode.INVALID_STATE,
                "The resource was modified by someone else. Reload and try again.");
    }

    /** @Valid failures on request bodies: list every invalid field. */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> Map.of(
                        "field", fe.getField(),
                        "message", String.valueOf(fe.getDefaultMessage())))
                .toList();
        ProblemDetail body = problem(HttpStatus.BAD_REQUEST, ErrorCode.INVALID_ARGUMENT, "Validation failed");
        body.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(body);
    }

    private static HttpStatus statusOf(ErrorCode code) {
        return switch (code) {
            case EVENT_NOT_FOUND, VENUE_NOT_FOUND, SEAT_NOT_FOUND, BOOKING_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case SEAT_NOT_AVAILABLE, INVALID_STATE -> HttpStatus.CONFLICT;
            case BOOKING_EXPIRED -> HttpStatus.GONE;
            case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
        };
    }

    private static ProblemDetail problem(HttpStatus status, ErrorCode code, String detail) {
        if (status.is5xxServerError()) {
            log.error("{}: {}", code, detail);
        } else {
            log.debug("{}: {}", code, detail);
        }
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setType(URI.create(ERROR_TYPE_BASE + code.name().toLowerCase(Locale.ROOT).replace('_', '-')));
        pd.setProperty("errorCode", code.name());
        pd.setProperty("timestamp", Instant.now());
        return pd;
    }
}
