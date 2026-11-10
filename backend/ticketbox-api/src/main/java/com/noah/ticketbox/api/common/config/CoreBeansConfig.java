package com.noah.ticketbox.api.common.config;

import com.noah.ticketbox.core.domain.SeatMapFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers framework-free classes from ticketbox-core as Spring beans.
 * ticketbox-core has no @Component annotations on purpose: it must stay usable
 * without Spring.
 */
@Configuration
public class CoreBeansConfig {

    @Bean
    public SeatMapFactory seatMapFactory() {
        return new SeatMapFactory();
    }

}
