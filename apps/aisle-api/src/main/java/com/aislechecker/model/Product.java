package com.aislechecker.model;

public class Product {

    private int id;
    private String name;
    private String aisle;
    private double price;
    private boolean available;

    public Product() {}

    public Product(int id, String name, String aisle, double price, boolean available) {
        this.id = id;
        this.name = name;
        this.aisle = aisle;
        this.price = price;
        this.available = available;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAisle() { return aisle; }
    public void setAisle(String aisle) { this.aisle = aisle; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
