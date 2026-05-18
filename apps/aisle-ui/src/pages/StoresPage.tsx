import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { deriveAvailability, type Product, type StoreLocation } from '../types'
import AvailabilityBadge from '../components/AvailabilityBadge'

export default function StoresPage() {
  const [stores, setStores] = useState<StoreLocation[]>([])
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [storeProducts, setStoreProducts] = useState<Product[]>([])
  const [loadingStores, setLoadingStores] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getStoreLocations()
      .then(setStores)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingStores(false))
  }, [])

  function selectStore(storeId: string) {
    setSelectedStore(storeId)
    setLoadingProducts(true)
    api.getProductsAtStore(storeId)
      .then(setStoreProducts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingProducts(false))
  }

  if (loadingStores) return <p className="state-loading" data-test="loading">Loading stores…</p>
  if (error) return <p className="state-error" data-test="error">Error: {error}</p>

  const selectedStoreName = stores.find(s => s.id === selectedStore)?.name

  return (
    <main className="page" data-test="stores-page">
      <h1 className="page-title">Store Locations</h1>
      <div className="store-grid" data-test="store-list">
        {stores.map(store => (
          <div
            key={store.id}
            className={`store-card${selectedStore === store.id ? ' selected' : ''}`}
            data-test="store-card"
            data-store-id={store.id}
            onClick={() => selectStore(store.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && selectStore(store.id)}
          >
            <p className="store-card-name" data-test="store-name">{store.name}</p>
            <p className="store-card-id">ID: {store.id}</p>
          </div>
        ))}
      </div>

      {selectedStore && (
        <section className="store-products" data-test="store-products-section">
          <h2 className="store-products-title" data-test="store-products-title">
            Products at {selectedStoreName}
          </h2>
          {loadingProducts ? (
            <p className="state-loading" data-test="store-products-loading">Loading products…</p>
          ) : (
            <div className="product-grid" data-test="store-products-list">
              {storeProducts.map(product => (
                <div
                  key={product.id}
                  className="card"
                  data-test="store-product-card"
                  data-product-id={product.id}
                >
                  <p className="card-name" data-test="product-name">{product.name}</p>
                  <div className="card-meta">
                    <div className="card-meta-row">
                      <span className="meta-label">Price</span>
                      <span data-test="product-price">${product.price.toFixed(2)}</span>
                    </div>
                    <div className="card-meta-row">
                      <span className="meta-label">Aisle</span>
                      <span data-test="product-aisle">{product.aisle}</span>
                    </div>
                    <div className="card-meta-row">
                      <span className="meta-label">Status</span>
                      <AvailabilityBadge status={deriveAvailability(product)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
