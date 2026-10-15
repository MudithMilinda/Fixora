import AppSelect from "../Components/AppSelect";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Sidebar from "../Components/Sidebar";
import Toast from "../Components/Toast";
import api, { getApiError } from "../api/axios";
import type { AuthUser } from "../types/auth";
import type { CompanyProfile } from "../types/company";
import { waitForDocumentImages } from "../utils/documentBranding";
import { quotationPrintHtml } from "../utils/quotationPrint";

type RequestItem = {
  id: string;
  itemId: string;
  itemName: string;
  sku: string | null;
  quantity: number;
  createdAt?: string;
};
type Supplier = { id: string; name: string; isActive?: boolean };
type QuoteItem = {
  requestId: string;
  itemId: string;
  itemName: string;
  sku: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};
type Quotation = {
  id: string;
  supplierId: string;
  supplierName: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string | null;
  currency: string;
  items: QuoteItem[];
  totalCents: number;
  notes: string | null;
  attachmentName: string | null;
};
type Props = {
  user: AuthUser;
  onGoDashboard: () => void;
  onOpenRepairs: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
};
type DraftLine = RequestItem & { unitPrice: string };
type Attachment = { name: string; data: string };
const currencies = ["LKR", "USD", "EUR", "GBP", "INR", "AED"];
const money = (cents: number, currency: string) =>
  `${currency} ${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const dateLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-GB");

export default function QuotationsPage(props: Props) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [mode, setMode] = useState<"list" | "compare">("list");
  const [compareId, setCompareId] = useState("");
  const [editor, setEditor] = useState<Quotation | "new" | null>(null);
  const [deletingId, setDeletingId] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const printRequestRef = useRef<AbortController | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get("/quotations", { signal: controller.signal }),
      api.get("/suppliers", { signal: controller.signal }),
      api.get("/stock-requests", { signal: controller.signal }),
    ])
      .then(([quotes, vendors, items]) => {
        setQuotations(quotes.data.quotations);
        setSuppliers(vendors.data.suppliers);
        setRequests(items.data.requests);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            getApiError(reason, "Unable to load quotations. Please try again."),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => () => {
    printRequestRef.current?.abort();
    printFrameRef.current?.remove();
  }, []);

  const quotedSuppliers = [...new Map(
    quotations.map((quote) => [quote.supplierId, quote.supplierName]),
  ).entries()].sort(([, first], [, second]) => first.localeCompare(second));
  const filtered = quotations.filter((quote) =>
    (!supplierFilter || quote.supplierId === supplierFilter) &&
    `${quote.supplierName} ${quote.quotationNumber} ${quote.items.map((item) => item.itemName).join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const totalItems = filtered.reduce((total, quote) => total + quote.items.length, 0);
  const totalQuantity = filtered.reduce(
    (total, quote) => total + quote.items.reduce((quantity, item) => quantity + item.quantity, 0),
    0,
  );
  const totalAmounts = [...filtered.reduce((totals, quote) => {
    totals.set(quote.currency, (totals.get(quote.currency) || 0) + quote.totalCents);
    return totals;
  }, new Map<string, number>()).entries()]
    .sort(([first], [second]) => first.localeCompare(second));
  const comparisonItems = [
    ...new Map(
      quotations.flatMap((quote) =>
        quote.items.map((item) => [item.requestId, item] as const),
      ),
    ).values(),
  ];
  const compared = quotations
    .flatMap((quote) =>
      quote.items
        .filter((item) => item.requestId === compareId)
        .map((item) => ({ quote, item })),
    )
    .sort(
      (a, b) =>
        a.quote.currency.localeCompare(b.quote.currency) ||
        a.item.unitPriceCents - b.item.unitPriceCents,
    );

  async function deleteQuotation(quote: Quotation) {
    if (
      !window.confirm(
        `Delete quotation ${quote.quotationNumber}? This cannot be undone.`,
      )
    )
      return;
    setDeletingId(quote.id);
    setToast(null);
    try {
      await api.delete(`/quotations/${quote.id}`);
      setQuotations((current) =>
        current.filter((currentQuote) => currentQuote.id !== quote.id),
      );
      setEditor((current) =>
        current !== "new" && current?.id === quote.id ? null : current,
      );
      setToast({ message: "Supplier quotation deleted.", tone: "success" });
    } catch (reason) {
      setToast({
        message: getApiError(reason, "Unable to delete quotation."),
        tone: "error",
      });
    } finally {
      setDeletingId("");
    }
  }

  async function printQuotations() {
    if (!filtered.length || printRequestRef.current) return;
    const controller = new AbortController();
    printRequestRef.current = controller;
    setIsPrinting(true);
    try {
      const { data } = await api.get<{ company: CompanyProfile }>("/company-settings", {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const supplierName = quotedSuppliers.find(([id]) => id === supplierFilter)?.[1];
      const filters = [
        supplierName ? `Supplier: ${supplierName}` : "All suppliers",
        search.trim() ? `Search: ${search.trim()}` : "",
      ].filter(Boolean).join(" · ");
      printFrameRef.current?.remove();
      const frame = document.createElement("iframe");
      frame.title = "Supplier quotations print document";
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1024px;height:768px;border:0;pointer-events:none";
      document.body.append(frame);
      printFrameRef.current = frame;
      const reportWindow = frame.contentWindow;
      if (!reportWindow) throw new Error("Unable to prepare print document.");
      reportWindow.document.write(quotationPrintHtml({
        company: data.company,
        quotations: filtered,
        preparedBy: props.user.fullName,
        filterLabel: filters,
      }));
      reportWindow.document.close();
      await waitForDocumentImages(reportWindow.document);
      if (!controller.signal.aborted && frame.isConnected) {
        reportWindow.addEventListener("afterprint", () => {
          window.setTimeout(() => {
            frame.remove();
            if (printFrameRef.current === frame) printFrameRef.current = null;
          }, 0);
        }, { once: true });
        reportWindow.focus();
        reportWindow.print();
      }
    } catch (reason) {
      printFrameRef.current?.remove();
      printFrameRef.current = null;
      if (!controller.signal.aborted) {
        setToast({
          message: getApiError(reason, "Unable to prepare quotations for printing. Please try again."),
          tone: "error",
        });
      }
    } finally {
      if (printRequestRef.current === controller) printRequestRef.current = null;
      if (!controller.signal.aborted) setIsPrinting(false);
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f5f5f7] font-sans text-[#262b3a] max-[1100px]:h-auto max-[1100px]:flex-col max-[1100px]:overflow-y-auto">
      <Sidebar {...props} activePage="quotations" />
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      <main className="min-w-0 flex-1 overflow-y-auto p-7 max-[1100px]:overflow-visible max-sm:p-[18px]">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="m-0 text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Procurement</p>
            <h1 className="my-2 mb-1 text-[30px] font-bold max-sm:text-[26px]">Quotations</h1>
            <p className="mt-1.5 text-sm text-[#747a89]">
              Record supplier prices and compare quotations for your purchase
              requests.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-[11px] border border-[#e2e3e8] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#414754] transition hover:bg-[#f7f7f8] disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={loading || !!error || !filtered.length || isPrinting}
              onClick={() => void printQuotations()}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6zM18 12h.01" /></svg>
              {isPrinting ? "Preparing print…" : "Print"}
            </button>
            <button
              className="inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-[11px] border border-[#171719] bg-[#171719] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading || !!error}
              onClick={() => setEditor("new")}
            >
              + Add quotation
            </button>
          </div>
        </header>
        {error ? (
          <div className="my-4 rounded-[10px] border border-[#f2d4cf] bg-[#fff2f0] p-3.5 text-[13px] text-[#a13a32]" role="alert">
            {error}{" "}
            <button
              className="ml-2 inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-[11px] border border-[#e2e3e8] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#414754] hover:brightness-95"
              onClick={() => {
                setLoading(true);
                setError("");
                setReload((value) => value + 1);
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="my-6 grid grid-cols-3 gap-4 max-sm:gap-2">
              <div className="rounded-2xl border border-[#eceaf2] bg-white p-5 max-sm:p-3">
                <span className="block text-xs text-[#747a89]">Saved quotations</span>
                <strong className="mt-2 block text-[26px]">{quotations.length}</strong>
              </div>
              <div className="rounded-2xl border border-[#eceaf2] bg-white p-5 max-sm:p-3">
                <span className="block text-xs text-[#747a89]">Suppliers quoted</span>
                <strong className="mt-2 block text-[26px]">
                  {new Set(quotations.map((quote) => quote.supplierId)).size}
                </strong>
              </div>
              <div className="rounded-2xl border border-[#eceaf2] bg-white p-5 max-sm:p-3">
                <span className="block text-xs text-[#747a89]">Requests with prices</span>
                <strong className="mt-2 block text-[26px]">{comparisonItems.length}</strong>
              </div>
            </div>
            <section className="rounded-[18px] border border-[#eceaf2] bg-white p-[22px] shadow-sm max-sm:p-4">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-1 rounded-[11px] bg-[#f4f4f6] p-1" aria-label="Quotation views">
                  <button
                    aria-pressed={mode === "list"}
                    className={mode === "list" ? "rounded-lg bg-white px-3 py-[9px] text-[13px] font-semibold text-[#262b3a] shadow-sm" : "rounded-lg px-3 py-[9px] text-[13px] text-[#747a89]"}
                    onClick={() => setMode("list")}
                  >
                    All quotations
                  </button>
                  <button
                    aria-pressed={mode === "compare"}
                    className={mode === "compare" ? "rounded-lg bg-white px-3 py-[9px] text-[13px] font-semibold text-[#262b3a] shadow-sm" : "rounded-lg px-3 py-[9px] text-[13px] text-[#747a89]"}
                    onClick={() => setMode("compare")}
                  >
                    Compare prices
                  </button>
                </div>
                {mode === "list" && (
                  <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto sm:flex-nowrap">
                    <AppSelect
                      className="min-w-[210px] flex-1 sm:w-[230px] sm:flex-none"
                      searchable={quotedSuppliers.length > 6}
                      aria-label="Filter quotations by supplier"
                      value={supplierFilter}
                      onChange={(event) => setSupplierFilter(event.target.value)}
                    >
                      <option value="">All suppliers</option>
                      {quotedSuppliers.map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </AppSelect>
                    <input
                      className="min-h-[42px] min-w-[220px] flex-1 rounded-[10px] border border-[#e2e3e8] bg-white px-3 py-2.5 text-[13px] text-[#414754] outline-none focus:border-[#ad6338] focus:ring-2 focus:ring-[#ad6338]/10 sm:w-[310px] sm:flex-none"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search supplier, quotation or item…"
                      aria-label="Search quotations"
                    />
                    {(supplierFilter || search) && (
                      <button
                        className="min-h-[42px] rounded-[10px] border border-[#e2e3e8] bg-white px-3 py-2 text-xs font-semibold text-[#515867] hover:bg-[#f7f7f8]"
                        type="button"
                        onClick={() => { setSupplierFilter(""); setSearch(""); }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
              {mode === "list" ? (
                <div
                  className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad6338]"
                  tabIndex={0}
                  role="region"
                  aria-label="Supplier quotations"
                >
                  <table className="w-full min-w-[740px] border-collapse text-left text-[13px] [&_th]:px-3 [&_th]:pb-3.5 [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[.05em] [&_th]:text-[#777e8e] [&_th:first-child]:pl-0 [&_th:last-child]:pr-0">
                    <thead>
                      <tr>
                        <th>Quotation</th>
                        <th>Supplier</th>
                        <th>Date</th>
                        <th>Valid until</th>
                        <th>Items</th>
                        <th className="px-3 pb-3.5 text-right text-[10px] font-semibold uppercase tracking-[.05em] text-[#777e8e]">Total</th>
                        <th className="px-3 pb-3.5 text-right text-[10px] font-semibold uppercase tracking-[.05em] text-[#777e8e]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-12 text-center text-[#747a89]">
                            Loading quotations…
                          </td>
                        </tr>
                      ) : filtered.length ? (
                        filtered.map((quote) => (
                          <tr key={quote.id} className="border-t border-[#f0f1f4] [&>td]:px-3 [&>td]:py-[17px] [&>td]:break-words [&>td:first-child]:pl-0 [&>td:last-child]:pr-0">
                            <td>
                              <strong>{quote.quotationNumber}</strong>
                              <small className="mt-1 block text-[11px] text-[#7a8090]">
                                {quote.attachmentName
                                  ? "Attachment included"
                                  : "No attachment"}
                              </small>
                            </td>
                            <td>{quote.supplierName}</td>
                            <td className="whitespace-nowrap">
                              {dateLabel(quote.quotationDate)}
                            </td>
                            <td className="whitespace-nowrap">
                              {quote.validUntil ? (
                                <>
                                  {dateLabel(quote.validUntil)}
                                  {quote.validUntil < today() && (
                                    <small className="mt-1 block text-[11px] text-[#b4582c]">
                                      Expired
                                    </small>
                                  )}
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>{quote.items.length}</td>
                            <td className="whitespace-nowrap text-right tabular-nums">
                              <strong>
                                {money(quote.totalCents, quote.currency)}
                              </strong>
                            </td>
                            <td className="text-right tabular-nums">
                              <div className="flex justify-end gap-2 whitespace-nowrap">
                              <button
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#dfe1e6] bg-white text-[#646b7a] transition hover:border-[#bfc4cd] hover:bg-[#f7f7f8] hover:text-[#262b3a]"
                                type="button"
                                aria-label={`Edit ${quote.quotationNumber}`}
                                title="Edit quotation"
                                onClick={() => setEditor(quote)}
                              >
                                <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                                  <path d="m15.5 5.5 3 3M4 20l4.5-1L19.3 8.2a2.12 2.12 0 0 0-3-3L5.5 16z" />
                                </svg>
                              </button>
                              <button
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#dfe1e6] bg-white text-[#646b7a] transition hover:border-[#d7aaa6] hover:bg-[#fff5f4] hover:text-[#b64a42] disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                                aria-label={`Delete ${quote.quotationNumber}`}
                                title="Delete quotation"
                                disabled={deletingId === quote.id}
                                onClick={() => void deleteQuotation(quote)}
                              >
                                {deletingId === quote.id ? (
                                  <span className="text-xs" aria-hidden="true">…</span>
                                ) : (
                                  <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                                    <path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" />
                                  </svg>
                                )}
                              </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-3 py-12 text-center text-[#747a89]">
                            <strong>
                              {search
                                ? "No matching quotations"
                                : "No supplier quotations yet"}
                            </strong>
                            <p className="mt-2 text-xs">
                              {search
                                ? "Try a different supplier, item or quotation number."
                                : "Add a quotation when a supplier responds to your request."}
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {!loading && filtered.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-[#e3e5ea] bg-[#fafafb]">
                          <td colSpan={7} className="px-0 py-4">
                            <div className="flex flex-wrap justify-end gap-x-8 gap-y-2 text-[12px] text-[#747a89]">
                              <span>Total items <strong className="ml-2 text-[#262b3a]">{totalItems}</strong></span>
                              <span>Total quantity <strong className="ml-2 text-[#262b3a]">{totalQuantity}</strong></span>
                              <span>Total amount <strong className="ml-2 whitespace-nowrap text-[#262b3a]">{totalAmounts.map(([currency, amount]) => money(amount, currency)).join(" · ")}</strong></span>
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              ) : (
                <div>
                  <label className="flex max-w-[480px] flex-col gap-2 text-xs font-semibold text-[#515867]">
                    Purchase request item
                    <AppSelect
                      searchable
                      aria-label="Purchase request item to compare"
                      value={compareId}
                      onChange={(event) => setCompareId(event.target.value)}
                    >
                      <option value="">Choose an item to compare</option>
                      {comparisonItems.map((item) => (
                        <option key={item.requestId} value={item.requestId}>
                          {item.itemName} · Qty {item.quantity} ·{" "}
                          {item.requestId.slice(0, 8)}
                        </option>
                      ))}
                    </AppSelect>
                  </label>
                  <p className="my-3 mb-6 text-xs font-normal leading-relaxed text-[#7a8090]">
                    Prices are sorted lowest first within each currency. Expired
                    quotations are marked; totals exclude additional tax,
                    delivery and discounts.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[740px] border-collapse text-left text-[13px] [&_th]:px-3 [&_th]:pb-3.5 [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[.05em] [&_th]:text-[#777e8e] [&_th:first-child]:pl-0 [&_th:last-child]:pr-0">
                      <thead>
                        <tr>
                          <th>Supplier / quotation</th>
                          <th>Valid until</th>
                          <th className="px-3 pb-3.5 text-right text-[10px] font-semibold uppercase tracking-[.05em] text-[#777e8e]">Quantity</th>
                          <th className="px-3 pb-3.5 text-right text-[10px] font-semibold uppercase tracking-[.05em] text-[#777e8e]">Unit price</th>
                          <th className="px-3 pb-3.5 text-right text-[10px] font-semibold uppercase tracking-[.05em] text-[#777e8e]">Line total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compared.length ? (
                          compared.map(({ quote, item }) => (
                            <tr key={quote.id} className="border-t border-[#f0f1f4] [&>td]:px-3 [&>td]:py-[17px] [&>td]:break-words [&>td:first-child]:pl-0 [&>td:last-child]:pr-0">
                              <td>
                                <button
                                  className="text-xs text-[#414754] underline decoration-current underline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => setEditor(quote)}
                                >
                                  {quote.supplierName}
                                </button>
                                <small className="mt-1 block text-[11px] text-[#7a8090]">{quote.quotationNumber}</small>
                              </td>
                              <td>
                                {quote.validUntil
                                  ? dateLabel(quote.validUntil)
                                  : "—"}
                                {quote.validUntil &&
                                  quote.validUntil < today() && (
                                    <small className="mt-1 block text-[11px] text-[#b4582c]">
                                      Expired
                                    </small>
                                  )}
                              </td>
                              <td className="text-right tabular-nums">{item.quantity}</td>
                              <td className="text-right tabular-nums">
                                {money(item.unitPriceCents, quote.currency)}
                              </td>
                              <td className="text-right tabular-nums">
                                {money(item.lineTotalCents, quote.currency)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-3 py-12 text-center text-[#747a89]">
                              Choose a purchase request item to see supplier
                              prices.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
      {editor && (
        <QuotationEditor
          existing={editor === "new" ? null : editor}
          suppliers={suppliers}
          requests={requests}
          onClose={() => setEditor(null)}
          onSaved={(quote) => {
            setQuotations((current) => [
              quote,
              ...current.filter((value) => value.id !== quote.id),
            ]);
            setEditor(null);
            setToast({ message: "Supplier quotation saved.", tone: "success" });
          }}
          onDelete={deleteQuotation}
        />
      )}
    </div>
  );
}

function QuotationEditor({
  existing,
  suppliers,
  requests,
  onClose,
  onSaved,
  onDelete,
}: {
  existing: Quotation | null;
  suppliers: Supplier[];
  requests: RequestItem[];
  onClose: () => void;
  onSaved: (quote: Quotation) => void;
  onDelete: (quote: Quotation) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [supplierId, setSupplierId] = useState(existing?.supplierId || "");
  const [date, setDate] = useState(existing?.quotationDate || today());
  const [validUntil, setValidUntil] = useState(existing?.validUntil || "");
  const [currency, setCurrency] = useState(existing?.currency || "LKR");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [lines, setLines] = useState<DraftLine[]>(
    () =>
      existing?.items.map((item) => ({
        id: item.requestId,
        itemId: item.itemId,
        itemName: item.itemName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: (item.unitPriceCents / 100).toFixed(2),
      })) || [],
  );
  const [requestId, setRequestId] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null | undefined>(
    undefined,
  );
  const [fileBusy, setFileBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const fileVersion = useRef(0);
  const savingRef = useRef(false);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      fileVersion.current = -1;
      element?.close();
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const close = () => {
    if (
      !savingRef.current &&
      (!dirty || window.confirm("Discard unsaved quotation changes?"))
    )
      onClose();
  };
  const available = requests.filter(
    (request) => !lines.some((line) => line.id === request.id),
  );
  const total = lines.reduce(
    (sum, line) =>
      sum + Math.round((Number(line.unitPrice) || 0) * 100) * line.quantity,
    0,
  );
  const attachmentName =
    attachment === undefined ? existing?.attachmentName : attachment?.name;

  function addRequest() {
    const request = available.find((value) => value.id === requestId);
    if (!request || lines.length >= 100) return;
    setLines((current) => [...current, { ...request, unitPrice: "" }]);
    setRequestId("");
    setDirty(true);
  }
  async function chooseFile(file?: File) {
    if (!file) return;
    const version = ++fileVersion.current;
    setError("");
    if (
      !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        file.type,
      ) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError("Choose a PDF, PNG, JPG or WEBP file up to 2 MB.");
      return;
    }
    setFileBusy(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Unable to read file."));
        reader.readAsDataURL(file);
      });
      if (fileVersion.current === version) {
        setAttachment({ name: file.name, data });
        setDirty(true);
      }
    } catch {
      if (fileVersion.current === version)
        setError("Unable to read attachment. Try again.");
    } finally {
      if (fileVersion.current === version) setFileBusy(false);
    }
  }
  async function download() {
    if (!existing || downloading) return;
    setDownloading(true);
    setError("");
    try {
      const { data } = await api.get(`/quotations/${existing.id}/attachment`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = existing.attachmentName || "quotation";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Unable to download the attachment. Please try again.");
    } finally {
      setDownloading(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current || fileBusy) return;
    if (!lines.length) {
      setError("Add at least one purchase request item.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const payload = {
        supplierId,
        quotationDate: date,
        validUntil: validUntil || null,
        currency,
        notes,
        items: lines.map((line) => ({
          requestId: line.id,
          unitPrice: line.unitPrice,
        })),
        ...(attachment !== undefined ? { attachment } : {}),
      };
      const { data } = existing
        ? await api.put(`/quotations/${existing.id}`, payload)
        : await api.post("/quotations", payload);
      onSaved(data.quotation);
    } catch (reason) {
      setError(getApiError(reason, "Unable to save quotation."));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="m-auto w-[min(1040px,calc(100vw-32px))] max-h-[calc(100dvh-48px)] rounded-[20px] border border-[#e6e6eb] bg-white p-0 text-[#262b3a] shadow-[0_28px_80px_#0003] backdrop:bg-[#10101280] backdrop:backdrop-blur-[3px]"
      aria-labelledby="quotation-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <form className="flex max-h-[calc(100dvh-50px)] flex-col" onSubmit={save} onChange={() => setDirty(true)}>
        <header className="flex shrink-0 justify-between gap-5 border-b border-[#eceef2] px-7 py-6 max-sm:p-4">
          <div>
            <p className="m-0 text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Procurement</p>
            <h2 id="quotation-title" className="mt-2 text-[23px] font-bold">
              {existing ? "Supplier quotation" : "Add supplier quotation"}
            </h2>
            <p className="mt-1.5 text-sm text-[#747a89]">
              Assign supplier prices to the items in your purchase requests.
            </p>
          </div>
          <button
            className="inline-flex min-h-[42px] shrink-0 items-center justify-center self-start rounded-[11px] border border-[#e2e3e8] bg-white px-4 py-2.5 text-[22px] font-semibold text-[#414754] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            aria-label="Close quotation"
            disabled={saving}
            onClick={close}
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto px-7 py-6 max-sm:p-4">
          {error && (
            <p className="mb-4 rounded-[10px] border border-[#f2d4cf] bg-[#fff2f0] p-3.5 text-[13px] text-[#a13a32]" role="alert">
              {error}
            </p>
          )}
          {!suppliers.length && !existing && (
            <p className="mb-4 rounded-[10px] bg-[#fff6e3] p-3 text-[13px] text-[#8c631a]">
              Create a supplier on the Suppliers page before adding a quotation.
            </p>
          )}
          <fieldset disabled={saving} className="m-0 min-w-0 border-0 p-0">
            <div className="grid grid-cols-3 gap-[18px] max-sm:grid-cols-1">
              <label className="flex flex-col gap-2 text-xs font-semibold text-[#515867]">
                Supplier
                <AppSelect
                  searchable
                  aria-label="Supplier"
                  required
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                >
                  <option value="">Select supplier</option>
                  {existing &&
                    !suppliers.some(
                      (supplier) => supplier.id === existing.supplierId,
                    ) && (
                      <option value={existing.supplierId}>
                        {existing.supplierName} (archived)
                      </option>
                    )}
                  {suppliers
                    .filter(
                      (supplier) =>
                        supplier.isActive !== false ||
                        supplier.id === existing?.supplierId,
                    )
                    .map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                </AppSelect>
              </label>
              <div className="flex flex-col gap-2 text-xs font-semibold text-[#515867]">
                Quotation number
                <div className="min-h-[42px] rounded-[10px] border border-dashed border-[#dfe1e6] bg-[#f8f8fa] px-3 py-2.5 text-[13px] font-normal text-[#747a89]">{existing?.quotationNumber || 'Auto-generated when saved'}</div>
              </div>
              <label className="flex flex-col gap-2 text-xs font-semibold text-[#515867]">
                Quotation date
                <input
                  className="min-h-[42px] w-full min-w-0 rounded-[10px] border border-[#e2e3e8] bg-white px-3 py-2.5 text-[13px] text-[#414754] outline-none focus:border-[#ad6338] focus:ring-2 focus:ring-[#ad6338]/10"
                  type="date"
                  required
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-[#515867]">
                Valid until (optional)
                <input
                  className="min-h-[42px] w-full min-w-0 rounded-[10px] border border-[#e2e3e8] bg-white px-3 py-2.5 text-[13px] text-[#414754] outline-none focus:border-[#ad6338] focus:ring-2 focus:ring-[#ad6338]/10"
                  type="date"
                  min={date}
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-[#515867]">
                Currency
                <AppSelect
                  searchable={false}
                  aria-label="Currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  {currencies.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </AppSelect>
              </label>
            </div>
            <section className="my-6 border-y border-[#eceef2] py-[22px]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="m-0 text-[15px] font-semibold">Purchase request items</h3>
                <span className="rounded-[20px] bg-[#f2f2f5] px-2.5 py-[5px] text-xs text-[#747a89]">{lines.length} items</span>
              </div>
              <p className="mt-2 text-xs font-normal leading-relaxed text-[#7a8090]">
                Select the items covered by this quotation. Quantities come from
                the purchase requests.
              </p>
              <div className="my-5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5 max-sm:grid-cols-1">
                <AppSelect
                  searchable
                  aria-label="Select purchase request"
                  value={requestId}
                  onChange={(event) => setRequestId(event.target.value)}
                >
                  <option value="">
                    {available.length
                      ? "Select purchase request item"
                      : "No matching purchase requests"}
                  </option>
                  {available.map((request) => (
                    <option key={request.id} value={request.id}>
                      {request.itemName}
                      {request.sku ? ` · ${request.sku}` : ""} · Qty{" "}
                      {request.quantity}
                      {request.createdAt
                        ? ` · ${dateLabel(request.createdAt.slice(0, 10))}`
                        : ""}{" "}
                      · {request.id.slice(0, 8)}
                    </option>
                  ))}
                </AppSelect>
                <button
                  className="inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-[11px] border border-[#e2e3e8] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#414754] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={!requestId || lines.length >= 100}
                  onClick={addRequest}
                >
                  + Add item
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[740px] border-collapse text-left text-[13px] [&_th]:px-3 [&_th]:pb-3.5 [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[.05em] [&_th]:text-[#777e8e] [&_th:first-child]:pl-0 [&_th:last-child]:pr-0">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Item</th>
                      <th className="number">Quantity</th>
                      <th className="number">Unit price ({currency})</th>
                      <th className="number">Amount</th>
                      <th>
                        <span className="sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length ? (
                      lines.map((line, index) => (
                        <tr key={line.id} className="border-t border-[#f0f1f4] [&>td]:px-3 [&>td]:py-[17px] [&>td]:break-words [&>td:first-child]:pl-0 [&>td:last-child]:pr-0">
                          <td>{index + 1}</td>
                          <td>
                            <strong>{line.itemName}</strong>
                            <small className="mt-1 block text-[11px] text-[#7a8090]">
                              {line.sku || "No SKU"} · Request{" "}
                              {line.id.slice(0, 8)}
                            </small>
                          </td>
                          <td className="text-right tabular-nums">{line.quantity}</td>
                          <td className="text-right tabular-nums">
                            <input
                              className="min-h-[42px] w-[130px] rounded-[10px] border border-[#e2e3e8] bg-white px-3 py-2.5 text-right text-[13px] text-[#414754] outline-none focus:border-[#ad6338] focus:ring-2 focus:ring-[#ad6338]/10"
                              aria-label={`Unit price for ${line.itemName}`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max="99999999.99"
                              step="0.01"
                              required
                              placeholder="0.00"
                              value={line.unitPrice}
                              onChange={(event) =>
                                setLines((current) =>
                                  current.map((item) =>
                                    item.id === line.id
                                      ? {
                                          ...item,
                                          unitPrice: event.target.value,
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="whitespace-nowrap text-right tabular-nums">
                            {money(
                              Math.round((Number(line.unitPrice) || 0) * 100) *
                                line.quantity,
                              currency,
                            )}
                          </td>
                          <td>
                            <button
                              className="h-[30px] w-[30px] rounded-lg border border-[#e2e3e8] text-[#747a89] hover:bg-[#fff2f0] hover:text-[#a13a32]"
                              type="button"
                              aria-label={`Remove ${line.itemName}`}
                              onClick={() => {
                                setLines((current) =>
                                  current.filter((item) => item.id !== line.id),
                                );
                                setDirty(true);
                              }}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-12 text-center text-[#747a89]">
                          Add purchase request items to enter supplier prices.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-6 border-t border-[#eceef2] pt-4 text-sm">
                <span>Items total</span>
                <strong>{money(total, currency)}</strong>
              </div>
              <p className="mt-2 text-xs font-normal leading-relaxed text-[#7a8090]">
                Excludes additional tax, delivery and discounts. Record any
                extra terms in the notes below.
              </p>
            </section>
            <div className="grid grid-cols-2 gap-[18px] max-sm:grid-cols-1">
              <label className="flex flex-col gap-2 text-xs font-semibold text-[#515867]">
                Notes / supplier terms
                <textarea
                  className="min-h-[42px] w-full min-w-0 resize-y rounded-[10px] border border-[#e2e3e8] bg-white px-3 py-2.5 text-[13px] text-[#414754] outline-none focus:border-[#ad6338] focus:ring-2 focus:ring-[#ad6338]/10"
                  maxLength={2000}
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Delivery terms, warranty or other supplier conditions…"
                />
              </label>
              <div className="flex flex-col gap-2 text-xs font-semibold text-[#515867]">
                <label htmlFor="quote-attachment">
                  Supplier quotation attachment{" "}
                  <span className="font-normal text-[#8a909c]">(optional)</span>
                </label>
                <input
                  className="text-[13px] font-normal"
                  id="quote-attachment"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  disabled={fileBusy}
                  onChange={(event) => {
                    void chooseFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <span className="text-xs font-normal leading-relaxed text-[#7a8090]">
                  PDF, PNG, JPG or WEBP · Up to 2 MB
                </span>
                {fileBusy && <span role="status">Reading attachment…</span>}
                {attachmentName && (
                  <div className="flex flex-col gap-2.5 break-words rounded-[10px] bg-[#f7f7f9] p-3">
                    <span>{attachmentName}</span>
                    <div className="flex gap-4">
                      {attachment === undefined && (
                        <button
                          className="text-xs text-[#414754] underline decoration-current underline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                          type="button"
                          disabled={downloading}
                          onClick={() => void download()}
                        >
                          {downloading ? "Downloading…" : "Download"}
                        </button>
                      )}
                      <button
                        className="text-xs text-[#414754] underline decoration-current underline-offset-[3px]"
                        type="button"
                        onClick={() => {
                          setAttachment(null);
                          setDirty(true);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </fieldset>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-[#eceef2] bg-[#fafafb] px-7 py-[18px] max-sm:p-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#747a89]">
              {lines.length} items · {money(total, currency)}
            </span>
            {existing && (
              <button
                className="text-xs font-semibold text-[#a13a32] underline decoration-current underline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={saving}
                onClick={() => void onDelete(existing)}
              >
                Delete quotation
              </button>
            )}
          </div>
          <div className="flex gap-2.5">
            <button
              className="inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-[11px] border border-[#e2e3e8] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#414754] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={saving}
              onClick={close}
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-[11px] border border-[#171719] bg-[#171719] px-4 py-2.5 text-[13px] font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving || fileBusy || !lines.length || !supplierId}
            >
              {saving
                ? "Saving…"
                : existing
                  ? "Save changes"
                  : "Save quotation"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
