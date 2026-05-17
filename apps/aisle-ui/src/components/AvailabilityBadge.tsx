import type { AvailabilityStatus } from '../types'

const labels: Record<AvailabilityStatus, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
}

type Props = { status: AvailabilityStatus }

export default function AvailabilityBadge({ status }: Props) {
  return (
    <span
      className={`badge badge-${status}`}
      data-test="availability-badge"
      data-status={status}
    >
      {labels[status]}
    </span>
  )
}
