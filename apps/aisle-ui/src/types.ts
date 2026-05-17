export type Product = {
  id: number
  name: string
  aisle: string
  price: number
  available: boolean
}

export type StoreLocation = {
  id: string
  name: string
}

export type AvailabilityStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export function deriveAvailability(product: Product): AvailabilityStatus {
  if (!product.available) return 'out_of_stock'
  if (product.price > 7.0) return 'low_stock'
  return 'in_stock'
}
