package com.aislechecker.service;

import com.aislechecker.model.AisleLocation;
import com.aislechecker.model.Product;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AisleService {

    private final Map<Integer, Product> products = new LinkedHashMap<>();
    private final Map<String, StoreLocation> storeLocations = new LinkedHashMap<>();

    public AisleService() {
        products.put(1, new Product(1, "Full Cream Milk 2L",   "A3", 3.49, true));
        products.put(2, new Product(2, "Sourdough Bread",      "B1", 5.99, true));
        products.put(3, new Product(3, "Free Range Eggs 12pk", "A5", 7.49, false));
        products.put(4, new Product(4, "Cheddar Cheese 500g",  "A3", 8.99, true));
        products.put(5, new Product(5, "Organic Pasta 500g",   "C2", 4.29, true));
        products.put(6, new Product(6, "Orange Juice 1L",      "A3", 4.99, false));

        storeLocations.put("north", new StoreLocation("north", "North Store", List.of(1, 2, 3, 4)));
        storeLocations.put("south", new StoreLocation("south", "South Store", List.of(1, 4, 5, 6)));
    }

    public List<Product> getAllProducts() {
        return new ArrayList<>(products.values());
    }

    public Optional<Product> getProductById(int id) {
        return Optional.ofNullable(products.get(id));
    }

    public Optional<AisleLocation> getAisleLocation(int productId) {
        return getProductById(productId)
                .map(p -> new AisleLocation(p.getId(), p.getAisle()));
    }

    public Optional<Map<String, String>> getAvailability(int productId) {
        return getProductById(productId).map(p -> {
            String status;
            if (!p.isAvailable()) {
                status = "out_of_stock";
            } else if (p.getPrice() > 7.0) {
                status = "low_stock";
            } else {
                status = "in_stock";
            }
            return Map.of("status", status);
        });
    }

    public List<Map<String, String>> getStoreLocations() {
        return storeLocations.values().stream()
                .map(sl -> Map.of("id", sl.id, "name", sl.name))
                .collect(Collectors.toList());
    }

    public Optional<List<Product>> getProductsAtStore(String locationId) {
        StoreLocation sl = storeLocations.get(locationId);
        if (sl == null) return Optional.empty();
        List<Product> result = sl.productIds.stream()
                .map(products::get)
                .collect(Collectors.toList());
        return Optional.of(result);
    }

    private record StoreLocation(String id, String name, List<Integer> productIds) {}
}
