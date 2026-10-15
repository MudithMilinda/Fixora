import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Sidebar from "../Components/Sidebar";
import AddPurchaseRequestModal from "../Components/AddPurchaseRequestModal";
import Toast from "../Components/Toast";
import type { AuthUser } from "../types/auth";
import type { CompanyProfile } from "../types/company";
import { waitForDocumentImages } from "../utils/documentBranding";
import { purchaseRequestPrintHtml } from "../utils/purchaseRequestPrint";
import api, { getApiError } from "../api/axios";
import "./PurchaseRequestsPage.css";

type PurchaseRequest = {
  id: string;
  itemName: string;
  sku: string | null;
  quantity: number;
  note: string | null;
  status: string;
  createdAt: string;
};
type Item = { id: string; name: string; sku: string | null; quantity: number };

export default function PurchaseRequestsPage({
  user,
  onGoDashboard,
  onOpenRepairs,
  onOpenHistory,
  onOpenProfile,
  onSignOut,
}: {
  user: AuthUser;
  onGoDashboard: () => void;
  onOpenRepairs: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
}) {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const printRequestRef = useRef<AbortController | null>(null);
  const [editing, setEditing] = useState<PurchaseRequest | null>(null);
  const [deleting, setDeleting] = useState<PurchaseRequest | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const totalQuantity = requests.reduce(
    (sum, request) => sum + request.quantity,
    0,
  );

  async function load() {
    setIsLoading(true);
    try {
      const [requestResponse, itemResponse] = await Promise.all([
        api.get("/stock-requests"),
        api.get("/items"),
      ]);
      setRequests(requestResponse.data.requests);
      setItems(itemResponse.data.items);
    } catch (error) {
      setToast({
        message: getApiError(error, "Unable to load purchase requests."),
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      printRequestRef.current?.abort();
      printFrameRef.current?.remove();
    };
  }, []);

  async function saveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    try {
      await api.patch(`/stock-requests/${editing.id}`, {
        quantity: Number(form.get("quantity")),
        note: form.get("note"),
      });
      setEditing(null);
      setToast({ message: "Purchase request updated.", tone: "success" });
      await load();
    } catch (error) {
      setToast({
        message: getApiError(error, "Unable to update the request."),
        tone: "error",
      });
    }
  }
  async function deleteRequest() {
    if (!deleting) return;
    try {
      await api.delete(`/stock-requests/${deleting.id}`);
      setDeleting(null);
      setToast({ message: "Purchase request deleted.", tone: "success" });
      await load();
    } catch (error) {
      setToast({
        message: getApiError(error, "Unable to delete the request."),
        tone: "error",
      });
    }
  }

  async function printPurchaseRequests() {
    if (!requests.length || printRequestRef.current) return;
    const controller = new AbortController();
    printRequestRef.current = controller;
    setIsPrinting(true);
    try {
      const { data } = await api.get<{ company: CompanyProfile }>("/company-settings", { signal: controller.signal });
      if (controller.signal.aborted) return;
      const company = data.company;
      // Render a separate print document inside this tab, without a popup.
      printFrameRef.current?.remove();
      const frame = document.createElement("iframe");
      frame.title = "Purchase requests print document";
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1024px;height:768px;border:0;pointer-events:none";
      document.body.append(frame);
      printFrameRef.current = frame;
      const reportWindow = frame.contentWindow;
      if (!reportWindow) throw new Error("Unable to prepare print document.");
      reportWindow.document.write(purchaseRequestPrintHtml({ company, requests, preparedBy: user.fullName }));
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
    } catch (error) {
      printFrameRef.current?.remove();
      printFrameRef.current = null;
      if (!controller.signal.aborted) {
        setToast({ message: getApiError(error, "Unable to prepare purchase requests for printing. Please try again."), tone: "error" });
      }
    } finally {
      if (printRequestRef.current === controller) printRequestRef.current = null;
      if (!controller.signal.aborted) setIsPrinting(false);
    }
  }

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-[#f4f4f5] font-sans text-[#262b3a]">
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      <Sidebar
        user={user}
        activePage="purchaseRequests"
        onGoDashboard={onGoDashboard}
        onOpenRepairs={onOpenRepairs}
        onOpenHistory={onOpenHistory}
        onOpenProfile={onOpenProfile}
        onSignOut={onSignOut}
      />
      <main className="min-w-0 flex-1 overflow-y-auto bg-[#f5f5f7] p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#7a8090]">
              Procurement
            </p>
            <h1 className="mt-2 text-3xl font-bold">Purchase requests</h1>
            <p className="mt-1 text-sm text-[#747a89]">
              Create and manage purchase requests for this branch.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button
              className="h-11 rounded-xl bg-[#171719] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!requests.length || isPrinting}
              onClick={() => void printPurchaseRequests()}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <path d="M6 14h12v7H6zM18 12h.01" />
              </svg>
              {isPrinting ? "Preparing print…" : "Print"}
            </button>
            <button
              className="h-11 rounded-xl bg-[#171719] px-4 text-sm font-semibold text-white"
              type="button"
              onClick={() => setIsCreateOpen(true)}
            >
              + Add purchase request
            </button>
          </div>
        </header>

        <div className="purchase-requests-content">
          <section
            className="purchase-requests-card"
            aria-labelledby="request-list-title"
          >
            <div className="purchase-requests-heading">
              <div>
                <h2 id="request-list-title">Request list</h2>
                <p>
                  All purchase requests created for this branch.
                </p>
              </div>
              <span className="purchase-requests-count">
                {requests.length} total
              </span>
            </div>

            <div className="purchase-requests-table-wrap" role="region" aria-label="Purchase requests table" tabIndex={0}>
              <table className="purchase-requests-table" aria-labelledby="request-list-title">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">SKU</th>
                    <th scope="col" className="purchase-requests-number">Quantity</th>
                    <th scope="col">Created</th>
                    <th scope="col" className="purchase-requests-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="purchase-requests-empty"
                      >
                        Loading purchase requests…
                      </td>
                    </tr>
                  ) : requests.length ? (
                    requests.map((request) => (
                      <tr
                        key={request.id}
                      >
                        <td className="purchase-requests-item">
                          <p>
                            {request.itemName}
                          </p>
                          {request.note && <p className="purchase-requests-note">{request.note}</p>}
                        </td>
                        <td className="purchase-requests-muted">{request.sku || "—"}</td>
                        <td className="purchase-requests-number">
                          {request.quantity}
                        </td>
                        <td className="purchase-requests-date">{new Date(request.createdAt).toLocaleDateString()}</td>
                        <td className="purchase-requests-actions">
                          <div className="purchase-requests-action-buttons">
                            <IconButton
                              label={`Edit ${request.itemName}`}
                              onClick={() => setEditing(request)}
                            >
                              <path d="m15.5 5.5 3 3M4 20l4.5-1L19.3 8.2a2.12 2.12 0 0 0-3-3L5.5 16z" />
                            </IconButton>
                            <IconButton
                              label={`Delete ${request.itemName}`}
                              onClick={() => setDeleting(request)}
                            >
                              <path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="purchase-requests-empty"
                      >
                        <p>No purchase requests yet.</p>
                        <span>Click “Add purchase request” to create your first request.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="purchase-requests-summary">
              <div>
                <span>Total requests</span>
                <strong>{requests.length}</strong>
              </div>
              <div>
                <span>Total quantity</span>
                <strong>{totalQuantity}</strong>
              </div>
            </div>
          </section>
        </div>
      </main>

      {isCreateOpen && (
        <AddPurchaseRequestModal
          items={items}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(count) => {
            setIsCreateOpen(false);
            setToast({
              message: count + " purchase request" + (count === 1 ? "" : "s") + " added.",
              tone: "success",
            });
            void load();
          }}
        />
      )}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-2xl"
            onSubmit={saveRequest}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7a8090]">
                  Purchase request
                </p>
                <h2 className="mt-2 text-xl font-bold">Edit request</h2>
                <p className="mt-1 text-sm text-[#747a89]">
                  {editing.itemName}
                  {editing.sku ? ` · ${editing.sku}` : ""}
                </p>
              </div>
              <button
                className="text-lg text-[#747a89]"
                type="button"
                aria-label="Close"
                onClick={() => setEditing(null)}
              >
                ×
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="text-xs font-normal text-[#4b5260]">
                Quantity
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-[#e2e3e7] px-3 text-sm font-normal outline-none focus:border-[#171719]"
                  name="quantity"
                  type="number"
                  min="1"
                  defaultValue={editing.quantity}
                  required
                />
              </label>
              <label className="text-xs font-normal text-[#4b5260]">
                Note <span className="text-[#8a8f9b]">(optional)</span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-xl border border-[#e2e3e7] p-3 text-sm font-normal outline-none focus:border-[#171719]"
                  name="note"
                  defaultValue={editing.note || ""}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-2 text-sm text-[#515664]"
                type="button"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="rounded-xl bg-[#171719] px-4 py-2.5 text-sm font-semibold text-white">
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}
      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <section className="w-full max-w-sm rounded-[20px] border border-[#e7e7e9] bg-white p-6 shadow-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#bb4941]">
              Delete request
            </p>
            <h2 className="mt-2 text-xl font-bold">
              Delete {deleting.itemName}?
            </h2>
            <p className="mt-2 text-sm text-[#747a89]">
              This purchase request will be permanently removed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2.5 text-xs font-semibold"
                type="button"
                onClick={() => setDeleting(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-[#bd4940] px-4 py-2.5 text-xs font-semibold text-white"
                type="button"
                onClick={() => void deleteRequest()}
              >
                Delete request
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#dfe1e6] bg-white text-[#646b7a] transition hover:border-[#bfc4cd] hover:bg-[#f7f7f8] hover:text-[#262b3a]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
