package com.aislechecker.model;

public class AisleLocation {

    private int productId;
    private String aisle;

    public AisleLocation() {}

    public AisleLocation(int productId, String aisle) {
        this.productId = productId;
        this.aisle = aisle;
    }

    public int getProductId() { return productId; }
    public void setProductId(int productId) { this.productId = productId; }

    public String getAisle() { return aisle; }
    public void setAisle(String aisle) { this.aisle = aisle; }
}
