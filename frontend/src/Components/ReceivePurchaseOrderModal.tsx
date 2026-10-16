type OrderItem = { requestId:string; itemName:string; sku:string|null; quantity:number; unitPriceCents:number };
type PurchaseOrder = { orderNumber:string; currency:string; items:OrderItem[] };
const money = (cents:number, currency:string) => `${currency} ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;

export default function ReceivePurchaseOrderModal({ order, prices, saving, onPrice, onClose, onConfirm }: { order:PurchaseOrder; prices:Record<string,string>; saving:boolean; onPrice:(id:string,value:string)=>void; onClose:()=>void; onConfirm:()=>void }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#101012]/45 p-4">
    <section className="flex max-h-[min(720px,calc(100dvh-32px))] w-[min(960px,calc(100vw-32px))] flex-col overflow-hidden rounded-[22px] border border-[#e7e7e9] bg-white shadow-[0_28px_80px_#0003]" role="dialog" aria-modal="true" aria-labelledby="receive-order-title">
      <header className="flex shrink-0 items-start justify-between gap-5 border-b border-[#eceef2] px-8 py-6 max-sm:px-5 max-sm:py-5">
        <div>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Purchase order</p>
        <h2 id="receive-order-title" className="mt-2 text-[24px] font-bold tracking-[-.02em]">Receive {order.orderNumber}</h2>
        <p className="mt-1 text-sm text-[#747a89]">Review costs, set selling prices and see profit before receiving stock.</p>
        </div><span className="shrink-0 rounded-full bg-[#f1f1f3] px-3 py-1.5 text-xs font-semibold text-[#626875]">{order.items.length} items</span>
      </header>
      <div className="min-h-0 overflow-auto px-8 py-5 max-sm:px-5"><table className="w-full min-w-[790px] border-collapse text-left text-[13px]"><thead className="text-[10px] font-semibold uppercase tracking-[.05em] text-[#777e8e]"><tr><th className="pb-3">Item</th><th className="pb-3 text-right">Qty</th><th className="pb-3 text-right">Unit cost</th><th className="pb-3 text-right">Selling price</th><th className="pb-3 text-right">Profit / unit</th></tr></thead><tbody>{order.items.map(item=>{const selling=Number(prices[item.requestId])||0;const profit=selling*100-item.unitPriceCents;return <tr key={item.requestId} className="border-t border-[#f0f1f4]"><td className="py-5 font-semibold">{item.itemName}<small className="mt-1 block font-normal text-[#7a8090]">{item.sku||'No SKU'}</small></td><td className="py-5 text-right tabular-nums">{item.quantity}</td><td className="py-5 text-right tabular-nums">{money(item.unitPriceCents,order.currency)}</td><td className="py-5 text-right"><input className="h-11 w-[140px] rounded-[11px] border border-[#e2e3e8] bg-white px-3 text-right text-[13px] outline-none focus:border-[#ad6338] focus:ring-2 focus:ring-[#ad6338]/10" type="number" min="0" step="0.01" value={prices[item.requestId]||''} onChange={event=>onPrice(item.requestId,event.target.value)} aria-label={`Selling price for ${item.itemName}`}/></td><td className={`py-5 text-right font-semibold tabular-nums ${profit<0?'text-[#b64a42]':'text-[#247545]'}`}>{money(profit,order.currency)}</td></tr>})}</tbody></table></div>
      <footer className="flex shrink-0 justify-end gap-3 border-t border-[#eceef2] bg-[#fafafb] px-8 py-5 max-sm:px-5"><button className="min-h-[44px] rounded-[11px] border border-[#e2e3e8] bg-white px-4 text-xs font-semibold text-[#515867]" type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="min-h-[44px] rounded-[11px] bg-[#171719] px-5 text-xs font-semibold text-white disabled:opacity-50" type="button" disabled={saving} onClick={onConfirm}>{saving?'Receiving…':'Confirm received'}</button></footer>
    </section>
  </div>;
}
