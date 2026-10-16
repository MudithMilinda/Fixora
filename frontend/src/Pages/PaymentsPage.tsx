import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../Components/Sidebar";
import Toast from "../Components/Toast";
import CompleteSaleModal from "../Components/CompleteSaleModal";
import AddCustomSaleItemModal from "../Components/AddCustomSaleItemModal";
import SaleInvoiceModal from "../Components/SaleInvoiceModal";
import { saveCompletedSale, takeRepairPaymentDraft, type CompletedSale, type RepairPaymentDraft } from "../data/paymentHistory";
import api, { getApiError } from "../api/axios";
import type { AuthUser } from "../types/auth";

type StockItem = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  sellingPrice: number;
};
type SaleLine = StockItem & { saleQuantity: number; isCustom?: boolean };
type Payment = { id: number; method: string; amount: number };
type ToastState = { message: string; tone: "success" | "error" };

const money = (value: number) =>
  `LKR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const paymentMethods = ["Cash", "Credit card", "Debit card", "Bank transfer"];

// Inline styles so a global CSS reset can't override borders / icon positions
const fieldBorder = { border: "1px solid #e1e3e8" } as const;
const softBorder = { border: "1px solid #e0e2e7" } as const;
const noBorder = { border: 0 } as const;
const stepperStyle = {
  border: "1px solid #e0e2e7",
  borderRadius: 10,
  overflow: "hidden",
} as const;

export default function PaymentsPage(props: {
  user: AuthUser;
  onGoDashboard: () => void;
  onOpenRepairs: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
}) {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [repairDraft, setRepairDraft] = useState<RepairPaymentDraft | null>(() => takeRepairPaymentDraft());
  const [lines, setLines] = useState<SaleLine[]>(() =>
    repairDraft
      ? repairDraft.lines.map((line, index) => ({
          id: `repair-${index}-${line.name}`,
          name: line.name,
          sku: line.sku,
          quantity: line.quantity,
          sellingPrice: line.unitPrice,
          saleQuantity: line.quantity,
        }))
      : [],
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    "amount",
  );
  const [discountValue, setDiscountValue] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isCompleteSaleOpen, setIsCompleteSaleOpen] = useState(false);
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get("/stocks")
      .then(({ data }) =>
        setStockItems(
          data.items.filter((item: StockItem) => item.quantity > 0),
        ),
      )
      .catch((error) =>
        setToast({
          message: getApiError(error, "Unable to load stock items."),
          tone: "error",
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Close the dropdown on outside click / touch, or Esc
  useEffect(() => {
    if (!showItemPicker) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowItemPicker(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowItemPicker(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showItemPicker]);

  const matches = useMemo(
    () =>
      stockItems
        .filter((item) =>
          `${item.name} ${item.sku || ""}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )
        .slice(0, 7),
    [stockItems, search],
  );
  const subtotal = lines.reduce(
    (total, line) => total + line.sellingPrice * line.saleQuantity,
    0,
  );
  const enteredDiscount = Math.max(0, Number(discountValue) || 0);
  const discount = Math.min(
    subtotal,
    discountType === "percent"
      ? (subtotal * Math.min(enteredDiscount, 100)) / 100
      : enteredDiscount,
  );
  const total = subtotal - discount;
  const paid = payments.reduce((total, payment) => total + payment.amount, 0);
  const due = Math.max(0, total - paid);

  function addItem(item: StockItem) {
    setLines((current) => {
      const existing = current.find((line) => line.id === item.id);
      if (existing)
        return current.map((line) =>
          line.id === item.id
            ? {
                ...line,
                saleQuantity: Math.min(line.quantity, line.saleQuantity + 1),
              }
            : line,
        );
      return [...current, { ...item, saleQuantity: 1 }];
    });
    setSearch("");
    setShowItemPicker(false);
  }
  function setLineQuantity(id: string, saleQuantity: number) {
    setLines((current) =>
      current.flatMap((line) =>
        line.id !== id
          ? [line]
          : saleQuantity < 1
            ? []
            : [
                {
                  ...line,
                  saleQuantity: line.isCustom
                    ? saleQuantity
                    : Math.min(line.quantity, saleQuantity),
                },
              ],
      ),
    );
  }
  function addCustomItem(item: { name: string; price: number; quantity: number }) {
    setLines((current) => [...current, {
      id: `custom-${Date.now()}`,
      name: item.name,
      sku: null,
      quantity: item.quantity,
      sellingPrice: item.price,
      saleQuantity: item.quantity,
      isCustom: true,
    }]);
    setIsCustomItemOpen(false);
  }
  function addPayment(method: string) {
    if (!lines.length)
      return setToast({
        message: "Add at least one item before recording a payment.",
        tone: "error",
      });
    if (due <= 0)
      return setToast({
        message: "This sale has already been paid in full.",
        tone: "error",
      });
    const amount = paymentAmount === "" ? due : Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > due)
      return setToast({
        message: `Enter a payment amount up to ${money(due)}.`,
        tone: "error",
      });
    setPayments((current) => [...current, { id: Date.now(), method, amount }]);
    setPaymentAmount("");
  }
  function cancelSale() {
    setLines([]);
    setPayments([]);
    setSearch("");
    setShowItemPicker(false);
    setDiscountValue("");
    setPaymentAmount("");
    setRepairDraft(null);
  }
  function openCompleteSale() {
    if (!lines.length)
      return setToast({
        message: "Add at least one item to the sale.",
        tone: "error",
      });
    if (due > 0)
      return setToast({
        message: `A balance of ${money(due)} is still due.`,
        tone: "error",
      });
    setIsCompleteSaleOpen(true);
  }
  function completeSale(customer: { name: string; phone: string }) {
    setIsCompleteSaleOpen(false);
    const sale: CompletedSale = {
      id: `SALE-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(Date.now()).slice(-4)}`,
      completedAt: new Date().toISOString(),
      customerName: customer.name,
      customerPhone: customer.phone,
      subtotal,
      discount,
      total,
      payments: payments.map(({ method, amount }) => ({ method, amount })),
      lines: lines.map(({ name, sku, saleQuantity, sellingPrice }) => ({ name, sku, quantity: saleQuantity, unitPrice: sellingPrice })),
      repair: repairDraft?.repair,
    };
    saveCompletedSale(sale);
    setCompletedSale(sale);
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f5f5f7] font-sans text-[#262b3a] max-[1100px]:h-auto max-[1100px]:flex-col">
      <Sidebar {...props} activePage="payments" />
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      <main className="min-w-0 flex-1 overflow-y-auto p-7 max-sm:p-[18px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">
              Sales &amp; billing
            </p>
            <h1 className="mt-2 text-[30px] font-bold tracking-[-.03em]">
              Payments
            </h1>
            <p className="mt-1.5 text-sm text-[#747a89]">
              Create a sale, collect payment, and review the remaining balance.
            </p>
          </div>
          <button
            type="button"
            onClick={cancelSale}
            style={fieldBorder}
            className="h-10 rounded-[10px] bg-white px-4 text-xs font-semibold text-[#565d6c] transition hover:bg-[#f7f7f8]"
          >
            Cancel sale
          </button>
        </header>

        <div
          className="mt-6 grid min-h-[calc(100dvh-185px)] gap-5"
          style={{ gridTemplateColumns: "minmax(0, 1fr) 340px" }}
        >
          <section
            style={{ border: "1px solid #eceaf2" }}
            className="rounded-[18px] bg-white p-5 shadow-sm"
          >
            {/* Search + dropdown */}
            <div className="flex flex-wrap gap-3">
            <div ref={pickerRef} style={{ position: "relative", flex: "1 1 280px", minWidth: 0 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#89909d"
                strokeWidth="2"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 14,
                  top: 22,
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onFocus={() => setShowItemPicker(true)}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setShowItemPicker(true);
                }}
                aria-label="Scan or search an item"
                style={{
                  ...fieldBorder,
                  paddingLeft: 40,
                  paddingRight: 44,
                }}
                className="h-11 w-full rounded-[10px] bg-[#fcfcfd] text-sm outline-none placeholder:text-[#9ca0aa] focus:shadow-[0_0_0_1px_#ad6338]"
                placeholder="Search by item name or SKU…"
                autoComplete="off"
              />
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShowItemPicker((open) => !open)}
                aria-label="Show stock items"
                aria-expanded={showItemPicker}
                style={{
                  ...noBorder,
                  position: "absolute",
                  right: 6,
                  top: 22,
                  transform: "translateY(-50%)",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  background: "transparent",
                  borderRadius: 8,
                  color: "#737b89",
                  cursor: "pointer",
                }}
                className="transition hover:bg-[#f0f1f3]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                  style={{
                    transition: "transform .15s",
                    transform: showItemPicker ? "rotate(180deg)" : "none",
                  }}
                >
                  <path
                    d="m6 9 6 6 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {showItemPicker && (
                <div
                  style={{ ...fieldBorder, top: "calc(100% + 6px)" }}
                  className="absolute left-0 z-30 max-h-64 w-full overflow-y-auto rounded-[12px] bg-white p-1.5 shadow-xl"
                >
                  <p
                    style={{ borderBottom: "1px solid #eef0f3" }}
                    className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[.08em] text-[#7a8090]"
                  >
                    Available stock items
                  </p>
                  {loading ? (
                    <p className="px-3 py-3 text-sm text-[#747a89]">
                      Loading stock…
                    </p>
                  ) : matches.length ? (
                    matches.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => addItem(item)}
                        style={{ ...noBorder, background: "transparent" }}
                        className="flex w-full items-center justify-between gap-4 rounded-[9px] px-3 py-2.5 text-left transition hover:bg-[#f4f4f6]"
                      >
                        <span className="min-w-0">
                          <strong className="block truncate text-sm font-semibold">
                            {item.name}
                          </strong>
                          <small className="mt-0.5 block truncate text-xs text-[#7a8090]">
                            {item.sku || "No SKU"} · {item.quantity} available
                          </small>
                        </span>
                        <strong className="shrink-0 whitespace-nowrap text-sm">
                          {money(item.sellingPrice)}
                        </strong>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-3 text-sm text-[#747a89]">
                      No available stock items found.
                    </p>
                  )}
                </div>
              )}
            </div>
            <button type="button" onClick={() => setIsCustomItemOpen(true)} style={fieldBorder} className="h-11 shrink-0 rounded-[10px] bg-white px-4 text-xs font-semibold text-[#515867] transition hover:bg-[#f7f7f8]">+ Custom item</button>
            </div>

            {repairDraft && (
              <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[11px] border border-[#dce5f3] bg-[#f4f7fc] px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#58709a]">Repair payment</p>
                  <p className="mt-1 text-sm font-semibold text-[#34435b]">{repairDraft.repair.jobNumber} · {repairDraft.repair.assetName}</p>
                  <p className="mt-1 text-xs text-[#657288]">{repairDraft.customerName}{repairDraft.customerPhone ? ` · ${repairDraft.customerPhone}` : ""}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4e6386]">Auto-filled</span>
              </section>
            )}

            {lines.length ? (
              <div
                style={{ border: "1px solid #e4e6eb" }}
                className="mt-5 overflow-x-auto rounded-[12px]"
              >
                <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
                  <thead className="bg-[#f6f7f8] text-[10px] font-semibold uppercase tracking-[.06em] text-[#777e8e]">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-center">Qty.</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                      <th className="w-12 px-2 py-3">
                        <span className="sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr
                        key={line.id}
                        style={{ borderTop: "1px solid #eef0f3" }}
                      >
                        <td className="px-4 py-3.5">
                          <strong className="block font-semibold">
                            {line.name}
                          </strong>
                          <small className="mt-0.5 block text-xs text-[#7a8090]">
                            {line.isCustom ? "Custom item" : `Stock: ${line.quantity}`}
                            {line.sku ? ` · ${line.sku}` : ""}
                          </small>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          {money(line.sellingPrice)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div
                            style={stepperStyle}
                            className="mx-auto flex w-[94px] items-center justify-between bg-white"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setLineQuantity(line.id, line.saleQuantity - 1)
                              }
                              style={{ ...noBorder, background: "transparent" }}
                              className="h-8 w-8 text-[#69717f] hover:bg-[#f4f4f6]"
                            >
                              −
                            </button>
                            <span className="text-xs font-semibold tabular-nums">
                              {line.saleQuantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setLineQuantity(line.id, line.saleQuantity + 1)
                              }
                              disabled={line.saleQuantity >= line.quantity}
                              style={{ ...noBorder, background: "transparent" }}
                              className="h-8 w-8 text-[#69717f] hover:bg-[#f4f4f6] disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                          {money(line.sellingPrice * line.saleQuantity)}
                        </td>
                        <td className="px-2 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setLineQuantity(line.id, 0)}
                            style={{ ...noBorder, background: "transparent" }}
                            className="grid h-8 w-8 place-items-center rounded-[8px] text-[#b64a42] hover:bg-[#fff1f0]"
                            aria-label={`Remove ${line.name}`}
                          >
                            ⌫
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                style={{ border: "1px dashed #dfe2e7" }}
                className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-[14px] bg-[#fcfcfd] px-6 py-10 text-center"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-[13px] bg-[#f0f1f4] text-[#687181]"
                  aria-hidden="true"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="M4 6h16M7 6l1 14h8l1-14M9.5 10v6m5-6v6M9 3h6l1 3H8l1-3Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <p className="mt-4 text-[15px] font-semibold text-[#3f4654]">
                  No items added yet
                </p>
                <p className="mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-[#747a89]">
                  Search or select an available stock item to begin this sale.
                </p>
              </div>
            )}
          </section>

          <aside
            style={{ border: "1px solid #eceaf2" }}
            className="self-start rounded-[18px] bg-white shadow-sm"
          >
            <header
              style={{ borderBottom: "1px solid #eceef1" }}
              className="px-5 py-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7a8090]">
                Payment
              </p>
              <h2 className="mt-1 text-base font-semibold">Sale summary</h2>
            </header>
            <div className="p-5">
              <dl className="divide-y divide-[#edf0f3] text-[13px]">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-[#747a89]">Subtotal</dt>
                  <dd className="font-medium tabular-nums">
                    {money(subtotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-[#747a89]">Discounts</dt>
                  <dd className="font-medium tabular-nums">
                    − {money(discount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3 text-[15px]">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-bold tabular-nums">{money(total)}</dd>
                </div>
              </dl>
              <section
                style={{ border: "1px solid #e2e4e9" }}
                className="mt-4 rounded-[11px] bg-[#fafafb] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#777e8e]">
                    Discount
                  </p>
                  <div
                    style={{ border: "1px solid #dfe2e7" }}
                    className="flex rounded-[7px] bg-white p-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => setDiscountType("amount")}
                      style={noBorder}
                      className={`h-6 rounded-[5px] px-2 text-[10px] font-semibold transition ${discountType === "amount" ? "bg-[#171719] text-white" : "bg-transparent text-[#667080] hover:bg-[#f3f4f6]"}`}
                    >
                      LKR
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      style={noBorder}
                      className={`h-6 rounded-[5px] px-2 text-[10px] font-semibold transition ${discountType === "percent" ? "bg-[#171719] text-white" : "bg-transparent text-[#667080] hover:bg-[#f3f4f6]"}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <label className="mt-2 block">
                  <span className="sr-only">Discount value</span>
                  <input
                    type="number"
                    min="0"
                    max={discountType === "percent" ? 100 : subtotal}
                    step="0.01"
                    value={discountValue}
                    onChange={(event) => setDiscountValue(event.target.value)}
                    placeholder={
                      discountType === "percent"
                        ? "Enter discount percentage"
                        : "Enter discount amount"
                    }
                    style={softBorder}
                    className="h-10 w-full rounded-[8px] bg-white px-3 text-sm outline-none placeholder:text-[#9ca0aa] focus:shadow-[0_0_0_1px_#ad6338]"
                  />
                </label>
              </section>
              <div
                style={{ border: "1px solid #e2e4e9" }}
                className="mt-4 grid grid-cols-2 overflow-hidden rounded-[11px] bg-[#fafafb]"
              >
                <div className="p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#777e8e]">
                    Paid
                  </p>
                  <p className="mt-1 text-[15px] font-bold tabular-nums text-[#247545]">
                    {money(paid)}
                  </p>
                </div>
                <div
                  style={{ borderLeft: "1px solid #e2e4e9" }}
                  className="p-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#777e8e]">
                    Due
                  </p>
                  <p
                    className={`mt-1 text-[15px] font-bold tabular-nums ${due > 0 ? "text-[#b64a42]" : "text-[#247545]"}`}
                  >
                    {money(due)}
                  </p>
                </div>
              </div>
              <div
                style={{ borderTop: "1px solid #eceef1" }}
                className="mt-5 pt-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#7a8090]">
                  Add payment
                </p>
                <label className="mt-3 block text-xs font-medium text-[#596170]">
                  Amount
                  <input
                    type="number"
                    min="0"
                    max={due}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder={due ? due.toFixed(2) : "0.00"}
                    style={softBorder}
                    className="mt-1.5 h-10 w-full rounded-[9px] bg-white px-3 text-sm outline-none focus:shadow-[0_0_0_1px_#ad6338]"
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => addPayment(method)}
                      style={softBorder}
                      className="inline-flex h-10 items-center rounded-[9px] bg-white px-3 text-left text-xs font-semibold text-[#515867] transition hover:bg-[#f7f7f8]"
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
              {payments.length > 0 && (
                <div
                  style={{ borderTop: "1px solid #eceef1" }}
                  className="mt-5 space-y-2 pt-4"
                >
                  {payments.map((payment) => (
                    <div
                      className="flex justify-between text-xs"
                      key={payment.id}
                    >
                      <span className="text-[#747a89]">{payment.method}</span>
                      <strong className="tabular-nums">
                        {money(payment.amount)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={openCompleteSale}
                style={noBorder}
                className="mt-5 min-h-11 w-full rounded-[10px] bg-[#171719] px-4 text-sm font-semibold text-white transition hover:bg-[#2a2a2e]"
              >
                End sale
              </button>
            </div>
          </aside>
        </div>
      </main>
      {isCompleteSaleOpen && (
        <CompleteSaleModal
          total={money(total)}
          onClose={() => setIsCompleteSaleOpen(false)}
          onConfirm={completeSale}
          initialCustomerName={repairDraft?.customerName}
          initialCustomerPhone={repairDraft?.customerPhone}
        />
      )}
      {isCustomItemOpen && <AddCustomSaleItemModal onClose={() => setIsCustomItemOpen(false)} onAdd={addCustomItem} />}
      {completedSale && (
        <SaleInvoiceModal
          sale={completedSale}
          onClose={() => { window.location.href = "/payment-history"; }}
        />
      )}
    </div>
  );
}
