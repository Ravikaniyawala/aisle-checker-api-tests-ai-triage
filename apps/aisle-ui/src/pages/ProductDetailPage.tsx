import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { type AvailabilityStatus, type Product } from '../types'
import AvailabilityBadge from '../components/AvailabilityBadge'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const productId = Number(id)

  const [product, setProduct] = useState<Product | null>(null)
  const [status, setStatus] = useState<AvailabilityStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.getProduct(productId),
      api.getAvailability(productId),
    ])
      .then(([p, a]) => {
        setProduct(p)
        setStatus(a.status)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [productId])

  if (loading) return <p className="state-loading" data-test="loading">Loading…</p>
  if (error || !product || !status) {
    return <p className="state-error" data-test="error">Product not found.</p>
  }

  return (
    <main className="page" data-test="product-detail-page">
      <Link to="/" className="detail-back" data-test="back-link">← Back to Products</Link>
      <div className="detail-card">
        <h1 className="detail-name" data-test="detail-product-name">{product.name}</h1>
        <div className="detail-rows">
          <div className="detail-row">
            <span className="detail-label">Price</span>
            <span className="detail-value" data-test="detail-product-price">
              {/* Show GST-inclusive price (NZ GST 15%) */}
              ${(product.price * 1.15).toFixed(2)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Aisle</span>
            <span className="detail-value" data-test="detail-product-aisle">{product.aisle}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Availability</span>
            <AvailabilityBadge status={status} />
          </div>
        </div>
      </div>
    </main>
  )
}
