package com.noah.week1.service;

import com.noah.week1.domain.Event;
import com.noah.week1.domain.Order;
import com.noah.week1.domain.SeatStatus;
import com.noah.week1.support.TestApp;
import org.junit.jupiter.api.Test;

import static com.noah.week1.support.TestApp.seats;
import static org.assertj.core.api.Assertions.assertThat;

class ReportServiceTest {

    @Test
    void countsSeatsByStatusAndSoldValue() {
        TestApp app = new TestApp();
        Event event = app.publishedEvent();
        Order paid = app.orderService.hold(event.id(), "alice", seats("A1", "B1"));
        app.orderService.pay(paid.id(), "alice");
        app.orderService.hold(event.id(), "bob", seats("C1"));

        EventStats stats = app.reportService.statsOf(event.id());

        assertThat(stats.capacity()).isEqualTo(12);
        assertThat(stats.count(SeatStatus.SOLD)).isEqualTo(2);
        assertThat(stats.count(SeatStatus.HELD)).isEqualTo(1);
        assertThat(stats.count(SeatStatus.AVAILABLE)).isEqualTo(9);
        assertThat(stats.soldValue()).isEqualByComparingTo("250000");
        assertThat(stats.occupancyPercent()).isEqualByComparingTo("16.7");
    }
}
