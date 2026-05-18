import type { Product, StoreLocation, AvailabilityStatus } from '../types'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const api = {
  getProducts: () => get<Product[]>('/api/products'),
  getProduct: (id: number) => get<Product>(`/api/products/${id}`),
  getAvailability: (id: number) =>
    get<{ status: AvailabilityStatus }>(`/api/products/${id}/availability`),
  getStoreLocations: () => get<StoreLocation[]>('/api/store/locations'),
  getProductsAtStore: (locationId: string) =>
    get<Product[]>(`/api/store/${locationId}/products`),
}
