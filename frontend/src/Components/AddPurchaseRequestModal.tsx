import { useEffect, useRef, useState, type FormEvent } from "react";
import api, { getApiError } from "../api/axios";
import PurchaseItemSelect from "./PurchaseItemSelect";

type Item = { id: string; name: string; sku: string | null; quantity: number };
type Line = { item: Item; quantity: string };
type LowStockResponse = {
  items: { itemId: string; name: string; sku: string | null; currentStock: number; suggestedOrderQty: number }[];
};

function isValidQuantity(value: string) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 1 && amount <= 4294967295;
}

export default function AddPurchaseRequestModal({
  items,
  onClose,
  onCreated,
}: {
  items: Item[];
  onClose: () => void;
  onCreated: (count: number) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const itemSelectRef = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const lowStockRequest = useRef<AbortController | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLowStock, setIsLoadingLowStock] = useState(false);
  const [lowStockMessage, setLowStockMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      lowStockRequest.current?.abort();
      dialog?.close();
    };
  }, []);

  const selectedItem = items.find((item) => item.id === itemId);
  const hasInvalidQuantity = lines.some((line) => !isValidQuantity(line.quantity));
  const totalQuantity = hasInvalidQuantity ? "—" : lines.reduce((total, line) => total + Number(line.quantity), 0);

  async function addLowStockItems() {
    if (submitting.current || lowStockRequest.current) return;
    const controller = new AbortController();
    lowStockRequest.current = controller;
    setIsLoadingLowStock(true);
    setError("");
    setLowStockMessage("");
    try {
      const { data } = await api.get<LowStockResponse>("/stock-requests/low-stock", { signal: controller.signal });
      if (controller.signal.aborted) return;
      const existingIds = new Set(lines.map((line) => line.item.id));
      const additions: Line[] = [];
      for (const stock of data.items) {
        if (existingIds.has(stock.itemId)) continue;
        existingIds.add(stock.itemId);
        additions.push({
          item: { id: stock.itemId, name: stock.name, sku: stock.sku, quantity: stock.currentStock },
          quantity: String(stock.suggestedOrderQty),
        });
      }
      setLines((current) => [...current, ...additions]);
      setLowStockMessage(!data.items.length
        ? "No low-stock items found in this branch."
        : additions.length
          ? `${additions.length} low-stock items added. Review the suggested order quantities below.`
          : "All low-stock items are already in your list. Your quantities have been kept.");
    } catch (err) {
      if (!controller.signal.aborted) setError(getApiError(err, "Unable to load low-stock items. Please try again."));
    } finally {
      if (!controller.signal.aborted) setIsLoadingLowStock(false);
      if (lowStockRequest.current === controller) lowStockRequest.current = null;
    }
  }

  function addLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || lowStockRequest.current) return;
    const amount = Number(quantity);
    if (!selectedItem || !Number.isSafeInteger(amount) || amount < 1) {
      setError("Select an item and enter a whole quantity of at least 1.");
      return;
    }
    const existing = lines.find((line) => line.item.id === itemId);
    if (existing && !isValidQuantity(existing.quantity)) {
      setError("Enter a valid quantity for this item in the purchase list first.");
      return;
    }
    if (Number(existing?.quantity || 0) + amount > 4294967295) {
      setError("The requested quantity is too large. Enter a smaller quantity.");
      return;
    }
    if (!existing && lines.length >= 100) {
      setError("You can add up to 100 different items per submission.");
      return;
    }
    setLines((current) => existing
      ? current.map((line) => line.item.id === itemId ? { ...line, quantity: String(Number(line.quantity) + amount) } : line)
      : [...current, { item: selectedItem, quantity: String(amount) }]);
    setItemId("");
    setQuantity("");
    setError("");
    itemSelectRef.current?.focus();
  }

  async function submit() {
    if (submitting.current || lowStockRequest.current || !lines.length) return;
    if (lines.length > 100) {
      setError("You can save up to 100 different items at once. Remove some items before saving this list.");
      return;
    }
    if (hasInvalidQuantity) {
      setError("Enter a whole quantity between 1 and 4,294,967,295 for every item in the list.");
      return;
    }
    if (itemId || quantity) {
      setError("Click + to add the current item to the list before saving, or clear the fields.");
      return;
    }
    submitting.current = true;
    setIsSaving(true);
    setError("");
    try {
      await api.post("/stock-requests/bulk", {
        items: lines.map((line) => ({ itemId: line.item.id, quantity: Number(line.quantity) })),
      });
    } catch (err) {
      setError(getApiError(err, "Unable to add purchase requests. Your items are still here; please try again."));
      return;
    } finally {
      submitting.current = false;
      setIsSaving(false);
    }
    onCreated(lines.length);
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(780px,calc(100vw-32px))] max-h-[calc(100dvh-48px)] overflow-hidden rounded-[22px] border border-[#e4e6eb] bg-white p-0 text-[#262b3a] shadow-[0_24px_80px_#10101240] backdrop:bg-[#10101280] backdrop:backdrop-blur-[3px]"
      aria-labelledby="purchase-request-title"
      aria-describedby="purchase-request-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting.current) onClose();
      }}
    >
      <form className="flex max-h-[calc(100dvh-50px)] flex-col" onSubmit={addLine} aria-busy={isSaving || isLoadingLowStock}>
        <header className="flex shrink-0 items-start justify-between gap-5 border-b border-[#eceef2] px-7 py-[26px] pb-[22px] max-sm:p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Procurement</p>
            <h2 id="purchase-request-title" className="my-2 text-[22px] font-bold">Add purchase request</h2>
            <p id="purchase-request-description" className="text-[13px] leading-relaxed text-[#747a89]">Select an item and quantity, then click + to add it to the list below.</p>
          </div>
          <button type="button" className="inline-flex h-[46px] w-10 shrink-0 items-center justify-center rounded-[11px] border border-[#e2e4e9] bg-[#f7f7f9] text-2xl text-[#626875] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Close add purchase request" disabled={isSaving} onClick={onClose}>×</button>
        </header>

        <div className="min-h-0 overflow-y-auto px-7 pb-6 pt-2 max-sm:px-5 max-sm:pb-5">
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#f1dfbd] bg-[#fffaf1] px-4 py-3.5">
            <div>
              <strong className="text-[13px] font-semibold">Restock items</strong>
              <p className="mt-1 text-xs text-[#7a7469]">Add this branch’s low-stock items to your purchase list.</p>
            </div>
            <button type="button" className="min-h-[38px] whitespace-nowrap rounded-[9px] border border-[#e7ca99] bg-white px-3.5 text-xs font-semibold text-[#95600b] hover:bg-[#fff1d6] disabled:cursor-not-allowed disabled:opacity-50" disabled={isSaving || isLoadingLowStock} onClick={() => void addLowStockItems()}>
              {isLoadingLowStock ? "Loading…" : "Low quantity"}
            </button>
          </div>
          {lowStockMessage && <p className="mt-2.5 text-xs text-[#7a8090]" role="status">{lowStockMessage}</p>}
          {!items.length && <p className="mt-4 rounded-[10px] bg-[#fff0ef] p-3 text-[13px] text-[#a03b34]">No items are available. Add an item to the catalog first.</p>}
          <fieldset className="m-0 min-w-0 border-0 p-0 disabled:opacity-65" disabled={isSaving || isLoadingLowStock || !items.length}>
                <div className="border-b border-[#eef0f2] py-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_132px_auto] items-start gap-3 max-sm:grid-cols-[minmax(0,1fr)_auto]">
                    <PurchaseItemSelect
                      items={items}
                      value={itemId}
                      inputRef={itemSelectRef}
                      disabled={isSaving || isLoadingLowStock || !items.length}
                      onChange={(id) => { setItemId(id); setError(""); }}
                    />
                    <label htmlFor="purchase-quantity" className="min-w-0 text-xs font-semibold text-[#4b5260]">
                      Quantity
                      <input
                        id="purchase-quantity"
                        className="mt-2 block h-[46px] w-full rounded-[11px] border border-[#dfe2e8] bg-white px-3 text-sm font-normal"
                        type="number" min="1" max="4294967295" step="1" placeholder="Enter qty"
                        value={quantity}
                        onChange={(event) => { setQuantity(event.target.value); setError(""); }}
                        required
                      />
                    </label>
                    <div className="mt-[27px] flex gap-1.5">
                      <button className="inline-flex h-[46px] w-10 shrink-0 items-center justify-center rounded-[11px] border border-[#171719] bg-[#171719] text-2xl text-white disabled:cursor-not-allowed disabled:opacity-50" type="submit" aria-label="Add item to purchase list" title="Add item to purchase list">+</button>
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs text-[#7a8090]">{selectedItem ? `${selectedItem.sku || "No SKU"} · Current stock: ${selectedItem.quantity}` : "Choose an item to see current stock."}</p>
                </div>
          </fieldset>
          <section className="mt-[22px]" aria-labelledby="purchase-list-title">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <h3 id="purchase-list-title" className="text-sm font-bold">Purchase list</h3>
              <span role="status" className="rounded-[20px] bg-[#f1f2f5] px-2.5 py-[5px] text-xs text-[#626875]">{lines.length} {lines.length === 1 ? "item" : "items"}</span>
            </div>
            {lines.length ? (
              <div className="overflow-x-auto rounded-xl border border-[#e6e8ed]" role="region" aria-labelledby="purchase-list-title" tabIndex={0}>
                <table className="w-full min-w-[480px] border-collapse text-left text-[13px] [&_th]:px-3.5 [&_th]:py-3 [&_th]:align-middle [&_td]:px-3.5 [&_td]:py-3 [&_td]:align-middle [&_thead]:bg-[#f5f6f8] [&_thead]:text-[10px] [&_thead]:font-semibold [&_thead]:uppercase [&_thead]:tracking-[.06em] [&_thead]:text-[#747a89] [&_tbody_tr]:border-t [&_tbody_tr]:border-[#eceef2] [&_tbody_tr:nth-child(even)]:bg-[#fafafb]" aria-labelledby="purchase-list-title">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">SKU</th>
                      <th scope="col" className="w-[90px] text-right font-semibold tabular-nums">Quantity</th>
                      <th scope="col" className="w-[72px] text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.item.id}>
                        <th scope="row" className="break-words font-semibold">{line.item.name}</th>
                        <td className="break-words text-[#7a8090]">{line.item.sku || "No SKU"}</td>
                        <td className="w-[90px] text-right font-semibold tabular-nums">
                          <input
                            className="h-9 w-28 rounded-lg border border-[#dfe2e8] bg-white px-2 text-right text-inherit text-[#262b3a] aria-[invalid=true]:border-[#bd4940] aria-[invalid=true]:bg-[#fff5f4] disabled:cursor-not-allowed disabled:opacity-60"
                            type="number" min="1" max="4294967295" step="1"
                            aria-label={`Quantity for ${line.item.name}`}
                            aria-invalid={!isValidQuantity(line.quantity)}
                            value={line.quantity}
                            disabled={isSaving || isLoadingLowStock}
                            required
                            onChange={(event) => {
                              const value = event.target.value;
                              setLines((current) => current.map((entry) => entry.item.id === line.item.id ? { ...entry, quantity: value } : entry));
                              setError("");
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.preventDefault();
                            }}
                          />
                        </td>
                        <td className="w-[72px] text-center">
                          <button
                            type="button" className="inline-flex h-[46px] w-10 shrink-0 items-center justify-center rounded-[11px] border border-[#e2e4e9] bg-[#f7f7f9] text-2xl text-[#626875] disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Remove ${line.item.name} from purchase list`}
                            title="Remove item" disabled={isSaving || isLoadingLowStock}
                            onClick={() => { setLines((current) => current.filter((entry) => entry.item.id !== line.item.id)); setError(""); }}
                          >×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="rounded-xl border border-dashed border-[#dfe2e8] px-4 py-6 text-center text-[13px] leading-relaxed text-[#7a8090]">No items added yet. Use + above to build your purchase list.</p>}
          </section>
          {error && <p className="mt-4 rounded-[10px] bg-[#fff0ef] p-3 text-[13px] text-[#a03b34]" role="alert">{error}</p>}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-[#eceef2] bg-[#fafafb] px-7 py-5 max-sm:flex-col max-sm:items-stretch max-sm:px-5 max-sm:py-4">
          <p className="text-xs text-[#747a89]">{lines.length} {lines.length === 1 ? "item" : "items"} · Total quantity: {totalQuantity}</p>
          <div className="flex gap-3 max-sm:justify-end">
            <button type="button" className="min-h-[46px] rounded-[11px] border border-[#dfe2e8] bg-white px-[18px] text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50" disabled={isSaving} onClick={onClose}>Cancel</button>
            <button type="button" className="min-h-[46px] rounded-[11px] bg-[#171719] px-[18px] text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={isSaving || isLoadingLowStock || !lines.length} onClick={() => void submit()}>
              {isSaving ? "Adding requests…" : "Add purchase requests"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
