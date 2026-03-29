package com.aislechecker.controller;

import com.aislechecker.model.AisleLocation;
import com.aislechecker.model.Product;
import com.aislechecker.service.AisleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class AisleController {

    private final AisleService aisleService;

    public AisleController(AisleService aisleService) {
        this.aisleService = aisleService;
    }

    @GetMapping("/api/products")
    public List<Product> getAllProducts() {
        return aisleService.getAllProducts();
    }

    @GetMapping("/api/products/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable int id) {
        return aisleService.getProductById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/api/products/{id}/aisle")
    public ResponseEntity<AisleLocation> getAisleLocation(@PathVariable int id) {
        return aisleService.getAisleLocation(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/api/products/{id}/availability")
    public ResponseEntity<Map<String, String>> getAvailability(@PathVariable int id) {
        return aisleService.getAvailability(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/api/store/locations")
    public List<Map<String, String>> getStoreLocations() {
        return aisleService.getStoreLocations();
    }

    @GetMapping("/api/store/{locationId}/products")
    public ResponseEntity<List<Product>> getProductsAtStore(@PathVariable String locationId) {
        return aisleService.getProductsAtStore(locationId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
