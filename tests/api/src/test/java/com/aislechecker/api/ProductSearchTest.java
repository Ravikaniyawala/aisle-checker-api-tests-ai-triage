package com.aislechecker.api;

import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

class ProductSearchTest {

    private static final String BASE_URL =
            System.getProperty("api.base.url", "http://localhost:8080");

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = BASE_URL;
    }

    @Test
    void searchProductById() {
        given()
            .when()
                .get("/api/products/1")
            .then()
                .statusCode(200)
                .body("name", equalTo("Full Cream Milk 2L"));
    }

    @Test
    void searchNonExistentProduct() {
        given()
            .when()
                .get("/api/products/999")
            .then()
                .statusCode(404);
    }

    // Simulates a price change regression
    @Test
    void searchProductWithWrongPriceAssertion() {
        given()
            .when()
                .get("/api/products/2")
            .then()
                .statusCode(200)
                .body("price", equalTo(4.99f)); // wrong — real price is 5.99; EXPECTED: REGRESSION
    }
}
