export type ProductTestData = {
  id: number
  name: string
  price: string
  aisle: string
  availability: 'in_stock' | 'low_stock' | 'out_of_stock'
}

export const products: ProductTestData[] = [
  { id: 1, name: 'Full Cream Milk 2L',   price: '$3.49', aisle: 'A3', availability: 'in_stock' },
  { id: 2, name: 'Sourdough Bread',      price: '$5.99', aisle: 'B1', availability: 'in_stock' },
  { id: 3, name: 'Free Range Eggs 12pk', price: '$7.49', aisle: 'A5', availability: 'out_of_stock' },
  { id: 4, name: 'Cheddar Cheese 500g',  price: '$8.99', aisle: 'A3', availability: 'low_stock' },
  { id: 5, name: 'Organic Pasta 500g',   price: '$4.29', aisle: 'C2', availability: 'in_stock' },
  { id: 6, name: 'Orange Juice 1L',      price: '$4.99', aisle: 'A3', availability: 'out_of_stock' },
]

export const stores = [
  { id: 'north', name: 'North Store', productCount: 4 },
  { id: 'south', name: 'South Store', productCount: 4 },
]

export const northStoreProducts = products.filter(p => [1, 2, 3, 4].includes(p.id))
export const southStoreProducts = products.filter(p => [1, 4, 5, 6].includes(p.id))

export const inStockProduct   = products[0]  // Full Cream Milk 2L
export const outOfStockProduct = products[2] // Free Range Eggs 12pk
export const lowStockProduct  = products[3]  // Cheddar Cheese 500g
