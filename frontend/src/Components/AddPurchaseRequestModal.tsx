import { useEffect, useRef, useState, type FormEvent } from "react";
import api, { getApiError } from "../api/axios";
import PurchaseItemSelect from "./PurchaseItemSelect";
import "./AddPurchaseRequestModal.css";

type Item = { id: string; name: string; sku: string | null; quantity: number };
type Line = { item: Item; quantity: string };
type LowStockResponse = {
  threshold: number;
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
  const itemSelectRef = useRef<HTMLInputElement>(null);
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
        ? `No low-stock items found in this branch (stock ${data.threshold} or less).`
        : additions.length
          ? `${additions.length} low-stock items added (stock ${data.threshold} or less). Review the suggested order quantities below.`
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
      className="purchase-request-modal"
      aria-labelledby="purchase-request-title"
      aria-describedby="purchase-request-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting.current) onClose();
      }}
    >
      <form onSubmit={addLine} aria-busy={isSaving || isLoadingLowStock}>
        <header className="purchase-modal-header">
          <div>
            <p className="purchase-modal-eyebrow">Procurement</p>
            <h2 id="purchase-request-title">Add purchase request</h2>
            <p id="purchase-request-description">Select an item and quantity, then click + to add it to the list below.</p>
          </div>
          <button type="button" className="purchase-modal-icon" aria-label="Close add purchase request" disabled={isSaving} onClick={onClose}>×</button>
        </header>

        <div className="purchase-modal-body">
          <div className="purchase-modal-low-stock">
            <div>
              <strong>Restock items</strong>
              <p>Add this branch’s low-stock items to your purchase list.</p>
            </div>
            <button type="button" disabled={isSaving || isLoadingLowStock} onClick={() => void addLowStockItems()}>
              {isLoadingLowStock ? "Loading…" : "Low quantity"}
            </button>
          </div>
          {lowStockMessage && <p className="purchase-modal-stock" role="status">{lowStockMessage}</p>}
          {!items.length && <p className="purchase-modal-error">No items are available. Add an item to the catalog first.</p>}
          <fieldset disabled={isSaving || isLoadingLowStock || !items.length}>
                <div className="purchase-modal-line">
                  <div className="purchase-modal-fields">
                    <PurchaseItemSelect
                      items={items}
                      value={itemId}
                      inputRef={itemSelectRef}
                      disabled={isSaving || isLoadingLowStock || !items.length}
                      onChange={(id) => { setItemId(id); setError(""); }}
                    />
                    <label htmlFor="purchase-quantity">
                      Quantity
                      <input
                        id="purchase-quantity"
                        type="number" min="1" max="4294967295" step="1" placeholder="Enter qty"
                        value={quantity}
                        onChange={(event) => { setQuantity(event.target.value); setError(""); }}
                        required
                      />
                    </label>
                    <div className="purchase-modal-row-actions">
                      <button className="purchase-modal-icon purchase-modal-plus" type="submit" aria-label="Add item to purchase list" title="Add item to purchase list">+</button>
                    </div>
                  </div>
                  <p className="purchase-modal-stock">{selectedItem ? `${selectedItem.sku || "No SKU"} · Current stock: ${selectedItem.quantity}` : "Choose an item to see current stock."}</p>
                </div>
          </fieldset>
          <section className="purchase-modal-list" aria-labelledby="purchase-list-title">
            <div className="purchase-modal-list-heading">
              <h3 id="purchase-list-title">Purchase list</h3>
              <span role="status">{lines.length} {lines.length === 1 ? "item" : "items"}</span>
            </div>
            {lines.length ? (
              <div className="purchase-modal-table-wrap" role="region" aria-labelledby="purchase-list-title" tabIndex={0}>
                <table className="purchase-modal-table" aria-labelledby="purchase-list-title">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">SKU</th>
                      <th scope="col" className="purchase-modal-table-quantity">Quantity</th>
                      <th scope="col" className="purchase-modal-table-action">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.item.id}>
                        <th scope="row">{line.item.name}</th>
                        <td className="purchase-modal-table-sku">{line.item.sku || "No SKU"}</td>
                        <td className="purchase-modal-table-quantity">
                          <input
                            className="purchase-modal-quantity-input"
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
                        <td className="purchase-modal-table-action">
                          <button
                            type="button" className="purchase-modal-icon"
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
            ) : <p className="purchase-modal-list-empty">No items added yet. Use + above to build your purchase list.</p>}
          </section>
          {error && <p className="purchase-modal-error" role="alert">{error}</p>}
        </div>

        <footer className="purchase-modal-footer">
          <p>{lines.length} {lines.length === 1 ? "item" : "items"} · Total quantity: {totalQuantity}</p>
          <div className="purchase-modal-footer-actions">
            <button type="button" className="purchase-modal-cancel" disabled={isSaving} onClick={onClose}>Cancel</button>
            <button type="button" className="purchase-modal-submit" disabled={isSaving || isLoadingLowStock || !lines.length} onClick={() => void submit()}>
              {isSaving ? "Adding requests…" : "Add purchase requests"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
