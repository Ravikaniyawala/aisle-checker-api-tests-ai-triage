package com.aislechecker.api;

import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasSize;

class StoreLocationTest {

    private static final String BASE_URL =
            System.getProperty("api.base.url", "http://localhost:8080");

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = BASE_URL;
    }

    @Test
    void getStoreLocations() {
        given()
            .when()
                .get("/api/store/locations")
            .then()
                .statusCode(200)
                .body("$", hasSize(2));
    }

    @Test
    void getProductsAtNorthStore() {
        given()
            .when()
                .get("/api/store/north/products")
            .then()
                .statusCode(200)
                .body("$", hasSize(6)); // experiment: wrong count — expected REGRESSION
    }

    @Test
    void getProductsAtUnknownStore() {
        given()
            .when()
                .get("/api/store/unknown/products")
            .then()
                .statusCode(404);
    }

    @Test
    void getStoreInventorySummary() {
        given()
            .when()
                .get("/api/store/inventory/summary") // endpoint does not exist — expected NEW_BUG
            .then()
                .statusCode(200);
    }
}
