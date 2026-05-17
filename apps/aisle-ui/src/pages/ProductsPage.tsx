import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { deriveAvailability, type Product } from '../types'
import AvailabilityBadge from '../components/AvailabilityBadge'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getProducts()
      .then(setProducts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="state-loading" data-test="loading">Loading products…</p>
  if (error) return <p className="state-error" data-test="error">Error: {error}</p>

  return (
    <main className="page" data-test="products-page">
      <h1 className="page-title">Products</h1>
      <div className="product-grid" data-test="product-list">
        {products.map(product => (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            className="card"
            data-test="product-card"
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
          </Link>
        ))}
      </div>
    </main>
  )
}
