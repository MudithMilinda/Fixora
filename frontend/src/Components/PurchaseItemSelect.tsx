import type { RefObject } from 'react'
import AppSelect from './AppSelect'

type Item = { id: string; name: string; sku: string | null; quantity: number }

export default function PurchaseItemSelect({ items, value, onChange, inputRef, disabled }: {
  items: Item[]
  value: string
  onChange: (id: string) => void
  inputRef: RefObject<HTMLButtonElement | null>
  disabled: boolean
}) {
  return <div className="purchase-item-picker">
    <label htmlFor="purchase-item">Select item</label>
    <AppSelect id="purchase-item" aria-label="Purchase item" searchable searchPlaceholder="Search by name or SKU…" triggerRef={inputRef} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Choose an item</option>
      {items.map((item) => <option key={item.id} value={item.id}>{item.name}{item.sku ? ` · ${item.sku}` : ''} · Stock {item.quantity}</option>)}
    </AppSelect>
  </div>
}
