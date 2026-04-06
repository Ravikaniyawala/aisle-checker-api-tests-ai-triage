package com.aislechecker.api;

import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.lessThan;

class AisleAvailabilityTest {

    private static final String BASE_URL =
            System.getProperty("api.base.url", "http://localhost:8080");

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = BASE_URL;
    }

    @Test
    void checkProductInStock() {
        given()
            .when()
                .get("/api/products/1/availability")
            .then()
                .statusCode(200)
                .body("status", equalTo("in_stock"));
    }

    @Test
    void checkProductOutOfStock() {
        given()
            .when()
                .get("/api/products/3/availability")
            .then()
                .statusCode(200)
                .body("status", equalTo("out_of_stock"));
    }

    @Test
    void checkAvailabilityWithDelayedResponse() throws InterruptedException {
        Thread.sleep(50);
        given()
            .when()
                .get("/api/products/1/availability")
            .then()
                .statusCode(200)
                .time(lessThan(5000L));
    }

    @Test
    void checkBulkAvailabilityEndpoint() {
        given()
            .when()
                .get("/api/products/availability/bulk") // endpoint does not exist
            .then()
                .statusCode(200); // experiment: endpoint does not exist — expected NEW_BUG
    }
}
