import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Sidebar from "../Components/Sidebar";
import AddPurchaseRequestModal from "../Components/AddPurchaseRequestModal";
import Toast from "../Components/Toast";
import type { AuthUser } from "../types/auth";
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

  function generateReport() {
    if (!requests.length) return;
    const reportWindow = window.open("", "_blank", "width=1000,height=720");
    if (!reportWindow) {
      setToast({
        message: "Allow pop-ups to generate the report.",
        tone: "error",
      });
      return;
    }
    const reportNumber = `PR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
    const rows = requests
      .map(
        (request) =>
          `<tr><td><strong>${escapeHtml(request.itemName)}</strong>${request.sku ? `<span>${escapeHtml(request.sku)}</span>` : ""}</td><td class="numeric">${request.quantity}</td><td>${escapeHtml(request.note || "—")}</td><td>${new Date(request.createdAt).toLocaleDateString()}</td><td>${escapeHtml(request.status)}</td></tr>`,
      )
      .join("");
    reportWindow.document.write(
      `<!doctype html><html><head><title>Purchase requests report</title><style>body{margin:44px auto;max-width:1040px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#273548}.eyebrow{color:#dc7a42;font-size:11px;font-weight:800;letter-spacing:.17em;text-transform:uppercase}.title{margin:8px 0 34px;font-size:34px;line-height:1.12;letter-spacing:-.03em}.info{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:24px}.meta{width:100%;border-collapse:collapse;font-size:13px}.meta td{border:1px solid #dde1e6;padding:7px 9px}.meta td:first-child{width:42%;background:#f7f8f9;font-weight:700;color:#506074}.meta tr:nth-child(even) td{background:#f1f3f5}.meta tr:nth-child(even) td:first-child{background:#e9edf1}.section{margin:20px 0 10px;color:#506074;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}table{width:100%;border-collapse:collapse;font-size:13px}.requests th{background:#314359;color:#fff;padding:10px 9px;text-align:left;font-size:11px;font-weight:700}.requests td{border:1px solid #dfe3e7;padding:10px 9px;vertical-align:top}.requests tr:nth-child(even) td{background:#f2f4f6}.requests strong{font-weight:700}.requests span{display:block;margin-top:4px;color:#6d7887;font-size:11px}.numeric{text-align:right}footer{margin-top:20px;color:#747f8d;font-size:11px}@media print{body{margin:20px;max-width:none}.title{font-size:30px}}</style></head><body><div class="eyebrow">Fixora · Procurement</div><h1 class="title">Purchase Requests<br>Report</h1><div class="info"><table class="meta"><tr><td>Report no.</td><td>${reportNumber}</td></tr><tr><td>Date</td><td>${new Date().toLocaleDateString()}</td></tr><tr><td>Total requests</td><td>${requests.length}</td></tr></table><table class="meta"><tr><td>Department</td><td>Procurement</td></tr><tr><td>Total quantity</td><td>${totalQuantity}</td></tr><tr><td>Prepared by</td><td>Fixora system</td></tr></table></div><div class="section">Purchase request details</div><table class="requests"><thead><tr><th>Item</th><th>Qty</th><th>Note</th><th>Created</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><footer>Generated ${new Date().toLocaleString()} · Fixora Procurement</footer></body></html>`,
    );
    reportWindow.document.close();
    window.setTimeout(() => {
      reportWindow.focus();
      reportWindow.print();
    }, 200);
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
              disabled={!requests.length}
              onClick={generateReport}
            >
              Generate report
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
function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] || character,
  );
}
