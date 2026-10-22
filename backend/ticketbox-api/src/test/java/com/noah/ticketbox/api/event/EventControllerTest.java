package com.noah.ticketbox.api.event;

import com.noah.ticketbox.core.exception.InvalidStateException;
import com.noah.ticketbox.core.exception.NotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web slice test: only the MVC layer (controller + exception handler + JSON) is started.
 * Checks the HTTP contract: status codes and error body format.
 */
@WebMvcTest(EventController.class)
class EventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EventService eventService;

    @Test
    void create_withInvalidBody_returns400WithFieldErrors() throws Exception {
        String body = """
                { "name": "", "startsAt": "2020-01-01T00:00:00Z", "basePrice": 5, "vipRows": 0 }
                """;

        mockMvc.perform(post("/api/v1/events").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_ARGUMENT"))
                // name blank, venueId null, startsAt in the past, basePrice too small
                .andExpect(jsonPath("$.errors", hasSize(4)));

        verifyNoInteractions(eventService);
    }

    @Test
    void get_unknownEvent_returns404ProblemDetail() throws Exception {
        when(eventService.get(99L)).thenThrow(NotFoundException.event(99L));

        mockMvc.perform(get("/api/v1/events/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("EVENT_NOT_FOUND"))
                .andExpect(jsonPath("$.type").value("https://ticketbox.dev/errors/event-not-found"));
    }

    @Test
    void publish_invalidState_returns409() throws Exception {
        when(eventService.publish(1L)).thenThrow(new InvalidStateException("Only DRAFT events can be published"));

        mockMvc.perform(post("/api/v1/events/1/publish"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
    }
}
