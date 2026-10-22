package com.noah.ticketbox.api.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Swagger UI: http://localhost:8080/swagger-ui.html */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI ticketboxOpenApi() {
        return new OpenAPI().info(new Info()
                .title("TicketBox API")
                .version("v1")
                .description("Event ticketing platform: events, seat maps, bookings."));
    }
}
