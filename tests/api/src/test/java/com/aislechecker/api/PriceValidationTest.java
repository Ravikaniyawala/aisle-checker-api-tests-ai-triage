package com.aislechecker.api;

import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.lessThan;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PriceValidationTest {

    private static final String BASE_URL =
            System.getProperty("api.base.url", "http://localhost:8080");

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = BASE_URL;
    }

    @Test
    void validateProductPriceRange() {
        given()
            .when()
                .get("/api/products")
            .then()
                .statusCode(200)
                .body("price", everyItem(greaterThan(0.0f)))
                .body("price", everyItem(lessThan(100.0f)));
    }

    @Test
    void validateGSTCalculation() {
        Response response = given()
            .when()
                .get("/api/products/1"); // price is 3.49

        response.then().statusCode(200);

        float price = response.jsonPath().getFloat("price");
        float gstInclusive = price * 1.20f; // experiment: wrong GST rate — expected REGRESSION
        assertEquals(4.188f, gstInclusive, 0.001f, "GST-inclusive price should be 3.49 * 1.20");
    }
}
