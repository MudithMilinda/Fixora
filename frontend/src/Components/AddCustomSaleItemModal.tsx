import { useState } from "react";

export default function AddCustomSaleItemModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (item: { name: string; price: number; quantity: number }) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const unitPrice = Number(price);
    const itemQuantity = Number(quantity);
    if (!name.trim()) return setError("Enter an item description.");
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return setError("Enter a valid unit price.");
    if (!Number.isInteger(itemQuantity) || itemQuantity < 1) return setError("Enter a valid quantity.");
    onAdd({ name: name.trim(), price: unitPrice, quantity: itemQuantity });
  }

  return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#101012]/45 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <form className="w-full overflow-hidden rounded-[20px] border border-[#e7e7e9] bg-white shadow-[0_28px_80px_#0003]" style={{ width: "min(460px, calc(100vw - 32px))" }} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="custom-sale-item-title">
      <header className="flex items-start justify-between gap-4 border-b border-[#eceef2] px-6 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Payment</p><h2 id="custom-sale-item-title" className="mt-2 text-xl font-bold tracking-[-.02em]">Add custom item</h2><p className="mt-1 text-sm text-[#747a89]">Use this for repair service charges or non-stock items.</p></div><button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-xl leading-none text-[#747a89] hover:bg-[#f2f3f5]">×</button></header>
      <div className="grid gap-4 px-6 py-5"><label className="text-xs font-semibold text-[#596170]">Description<input autoFocus value={name} onChange={(event) => { setName(event.target.value); setError(""); }} className="mt-2 h-11 w-full rounded-[10px] border border-[#dfe2e7] px-3 text-sm font-normal outline-none placeholder:text-[#a2a7b1] focus:border-[#171719]" placeholder="e.g. Repair service charge" /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-[#596170]">Unit price (LKR)<input type="number" min="0" step="0.01" value={price} onChange={(event) => { setPrice(event.target.value); setError(""); }} className="mt-2 h-11 w-full rounded-[10px] border border-[#dfe2e7] px-3 text-sm font-normal outline-none placeholder:text-[#a2a7b1] focus:border-[#171719]" placeholder="0.00" /></label><label className="text-xs font-semibold text-[#596170]">Quantity<input type="number" min="1" step="1" value={quantity} onChange={(event) => { setQuantity(event.target.value); setError(""); }} className="mt-2 h-11 w-full rounded-[10px] border border-[#dfe2e7] px-3 text-sm font-normal outline-none placeholder:text-[#a2a7b1] focus:border-[#171719]" /></label></div>{error && <p role="alert" className="text-xs font-medium text-[#b64a42]">{error}</p>}</div>
      <footer className="flex justify-end gap-3 border-t border-[#eceef2] bg-[#fcfcfd] px-6 py-4"><button type="button" onClick={onClose} className="h-10 rounded-[10px] border border-[#dfe2e7] bg-white px-4 text-xs font-semibold text-[#565d6c] hover:bg-[#f6f7f8]">Cancel</button><button type="submit" className="h-10 rounded-[10px] bg-[#171719] px-4 text-xs font-semibold text-white hover:bg-[#2a2a2e]">Add item</button></footer>
    </form>
  </div>;
}
