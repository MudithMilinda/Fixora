import type { CSSProperties } from "react";

type OrderItem = {
  requestId: string;
  itemName: string;
  sku: string | null;
  quantity: number;
  unitPriceCents: number;
};
type PurchaseOrder = {
  orderNumber: string;
  currency: string;
  items: OrderItem[];
};

const money = (cents: number, currency: string) =>
  `${currency} ${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Inline spacing so a global `* { padding: 0 }` reset can't flatten the layout.
const PAD_X = "clamp(20px, 4vw, 32px)";
const headerStyle: CSSProperties = {
  padding: `24px ${PAD_X}`,
};
const bodyStyle: CSSProperties = {
  padding: `20px ${PAD_X}`,
};
const footerStyle: CSSProperties = {
  padding: `16px ${PAD_X}`,
};
const th = (align: "left" | "right", first = false): CSSProperties => ({
  padding: `0 0 12px ${first ? 0 : 20}px`,
  textAlign: align,
});
const td = (align: "left" | "right", first = false): CSSProperties => ({
  padding: `20px 0 20px ${first ? 0 : 20}px`,
  textAlign: align,
  verticalAlign: "middle",
});

export default function ReceivePurchaseOrderModal({
  order,
  prices,
  previousPrices,
  saving,
  onPrice,
  onClose,
  onConfirm,
}: {
  order: PurchaseOrder;
  prices: Record<string, string>;
  previousPrices: Record<string, { costPrice: number | undefined; sellingPrice: number | undefined }>;
  saving: boolean;
  onPrice: (id: string, value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const totalProfit = order.items.reduce((sum, item) => {
    const selling = Number(prices[item.requestId]) || 0;
    return sum + (Math.round(selling * 100) - item.unitPriceCents) * item.quantity;
  }, 0);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[#101012]/45"
      style={{ padding: 16 }}
    >
      <section
        className="flex max-h-[min(720px,calc(100dvh-32px))] w-[min(960px,calc(100vw-32px))] flex-col overflow-hidden rounded-[22px] border border-[#e7e7e9] bg-white shadow-[0_28px_80px_#0003]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receive-order-title"
      >
        <header
          className="flex shrink-0 items-start justify-between border-b border-[#eceef2]"
          style={{ ...headerStyle, gap: 20 }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">
              Purchase order
            </p>
            <h2
              id="receive-order-title"
              className="text-[24px] font-bold tracking-[-.02em]"
              style={{ marginTop: 8 }}
            >
              Receive {order.orderNumber}
            </h2>
            <p className="text-sm text-[#747a89]" style={{ marginTop: 4 }}>
              Review costs, set selling prices and see profit before receiving
              stock.
            </p>
          </div>
          <span
            className="shrink-0 rounded-full bg-[#f1f1f3] text-xs font-semibold text-[#626875]"
            style={{ padding: "6px 12px" }}
          >
            {order.items.length} {order.items.length === 1 ? "item" : "items"}
          </span>
        </header>

        <div className="min-h-0 overflow-auto" style={bodyStyle}>
          <table className="w-full min-w-[790px] border-collapse text-left text-[13px]">
            <thead className="text-[10px] font-semibold uppercase tracking-[.05em] text-[#777e8e]">
              <tr>
                <th style={th("left", true)}>Item</th>
                <th style={th("right")}>Qty</th>
                <th style={th("right")}>Unit cost</th>
                <th style={th("right")}>Selling price</th>
                <th style={th("right")}>Profit / unit</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const selling = Number(prices[item.requestId]) || 0;
                const profit = Math.round(selling * 100) - item.unitPriceCents;
                return (
                  <tr
                    key={item.requestId}
                    className="border-t border-[#f0f1f4]"
                  >
                    <td className="font-semibold" style={td("left", true)}>
                      {item.itemName}
                      <small className="block font-normal text-[#7a8090]" style={{ marginTop: 4 }}>
                        {item.sku || "No SKU"}
                      </small>
                    </td>
                    <td className="tabular-nums" style={td("right")}>
                      {item.quantity}
                    </td>
                    <td className="tabular-nums whitespace-nowrap" style={td("right")}>
                      {money(item.unitPriceCents, order.currency)}
                    </td>
                    <td style={td("right")}>
                      <label className="block text-left text-[10px] font-semibold uppercase tracking-[.05em] text-[#777e8e]">
                        New price
                        <input
                          className="mt-1.5 h-11 w-[140px] rounded-[11px] border border-[#e2e3e8] bg-white text-right text-[13px] font-normal normal-case tracking-normal text-[#262b3a] outline-none focus:border-[#ad6338] focus:ring-2 focus:ring-[#ad6338]/10"
                          style={{ padding: "0 12px" }}
                          type="number"
                          min="0"
                          step="0.01"
                          value={prices[item.requestId] || ""}
                          onChange={(event) =>
                            onPrice(item.requestId, event.target.value)
                          }
                          aria-label={`New selling price for ${item.itemName}`}
                        />
                      </label>
                    </td>
                    <td
                      className={`font-semibold tabular-nums whitespace-nowrap ${profit < 0 ? "text-[#b64a42]" : "text-[#247545]"}`}
                      style={td("right")}
                    >
                      {money(profit, order.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <section className="mt-6 overflow-hidden rounded-[12px] border border-[#e5e7ec] bg-[#fafafb]">
            <div className="border-b border-[#e5e7ec] px-4 py-3">
              <h3 className="text-[13px] font-semibold text-[#303646]">Previous stock prices</h3>
              <p className="mt-0.5 text-xs text-[#747a89]">Latest saved prices before receiving this order.</p>
            </div>
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="text-[10px] font-semibold uppercase tracking-[.05em] text-[#777e8e]">
                <tr>
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5 text-right">Previous unit cost</th>
                  <th className="px-4 py-2.5 text-right">Previous selling price</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => {
                  const previous = previousPrices[item.requestId];
                  return (
                    <tr key={item.requestId} className="border-t border-[#e5e7ec]">
                      <td className="px-4 py-3 font-medium">{item.itemName}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#555d6e]">
                        {previous?.costPrice === undefined ? "Not set" : money(Math.round(previous.costPrice * 100), order.currency)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#555d6e]">
                        {previous?.sellingPrice === undefined ? "Not set" : money(Math.round(previous.sellingPrice * 100), order.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        <footer
          className="flex shrink-0 items-center justify-between border-t border-[#eceef2] bg-[#fafafb]"
          style={{ ...footerStyle, gap: 12 }}
        >
          <p className="text-xs text-[#747a89]">
            Total profit{" "}
            <span
              className={`text-[13px] font-semibold tabular-nums ${totalProfit < 0 ? "text-[#b64a42]" : "text-[#247545]"}`}
            >
              {money(totalProfit, order.currency)}
            </span>
          </p>
          <div className="flex" style={{ gap: 12 }}>
            <button
              className="inline-flex items-center justify-center whitespace-nowrap border border-[#e2e3e8] bg-white text-[13px] font-semibold text-[#515867] transition hover:bg-[#f6f6f8] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                height: 44,
                minWidth: 96,
                padding: "0 22px",
                borderRadius: 11,
                borderWidth: 1,
                borderStyle: "solid",
                cursor: saving ? "not-allowed" : "pointer",
              }}
              type="button"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center justify-center whitespace-nowrap bg-[#171719] text-[13px] font-semibold text-white transition hover:bg-[#2a2a2e] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                height: 44,
                minWidth: 150,
                padding: "0 26px",
                borderRadius: 11,
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
              }}
              type="button"
              disabled={saving}
              onClick={onConfirm}
            >
              {saving ? "Receiving…" : "Confirm received"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
