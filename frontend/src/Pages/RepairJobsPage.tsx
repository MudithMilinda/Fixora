import AppSelect from '../Components/AppSelect'
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import Sidebar from "../Components/Sidebar";
import Toast from "../Components/Toast";
import CreateRepairModal, { type RepairPartDraft } from "../Components/CreateRepairModal";
import type { AuthUser } from "../types/auth";
import api, { getApiError } from "../api/axios";

export type RepairJob = {
  id: string;
  jobNumber: string;
  customerName: string;
  customerPhone: string | null;
  assetName: string;
  assetType: string;
  assetIdentifier: string | null;
  issue: string;
  status: string;
  technician: string;
  promisedDate: string | null;
  priority: string;
  parts?: { stockId: string; name: string; quantity: number; total: number }[];
};
type ToastState = { message: string; tone: "success" | "error" };
const statuses = [
  "Received",
  "Diagnosis",
  "Awaiting approval",
  "In progress",
  "Waiting for parts",
  "Quality check",
  "Ready for collection",
];
const statusStyles: Record<string, string> = {
  Received: "bg-[#edf0f5] text-[#566170]",
  Diagnosis: "bg-[#f0edff] text-[#705bb6]",
  "Awaiting approval": "bg-[#fff4dc] text-[#a76c00]",
  "In progress": "bg-[#eaf1ff] text-[#3565ad]",
  "Waiting for parts": "bg-[#fff4dc] text-[#a76c00]",
  "Quality check": "bg-[#eaf6f5] text-[#28746d]",
  "Ready for collection": "bg-[#eafaf1] text-[#228953]",
  Delivered: "bg-[#edf8f1] text-[#31865a]",
  Closed: "bg-[#f0f1f3] text-[#69717f]",
  Cancelled: "bg-[#fff0ef] text-[#bd4940]",
};


function RepairJobsPage({
  user,
  onGoDashboard,
  onOpenHistory,
  onOpenProfile,
  onSignOut,
}: {
  user: AuthUser;
  onGoDashboard: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
}) {
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingJob, setEditingJob] = useState<RepairJob | null>(null);
  const [viewingJob, setViewingJob] = useState<RepairJob | null>(null);
  const [actionJob, setActionJob] = useState<RepairJob | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [statusJob, setStatusJob] = useState<RepairJob | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [deletingJob, setDeletingJob] = useState<RepairJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  async function loadJobs() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const { data } = await api.get(`/repairs?${params.toString()}`);
      setJobs(data.jobs);
    } catch (error) {
      setToast({
        message: getApiError(error, "Unable to load repair jobs."),
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    void loadJobs();
  }, [status]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const metrics = useMemo(
    () => ({
      open: jobs.filter(
        (job) => !["Delivered", "Closed", "Cancelled"].includes(job.status),
      ).length,
      attention: jobs.filter(
        (job) =>
          job.priority === "Urgent" || job.status === "Awaiting approval",
      ).length,
      waiting: jobs.filter((job) => job.status === "Waiting for parts").length,
      ready: jobs.filter((job) => job.status === "Ready for collection").length,
    }),
    [jobs],
  );

  async function saveRepair(event: FormEvent<HTMLFormElement>, parts: RepairPartDraft[] = []) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsCreating(true);
    try {
      const payload = {
        customerName: form.get("customerName"),
        customerPhone: form.get("customerPhone"),
        assetType: form.get("assetType"),
        assetName: form.get("assetName"),
        assetIdentifier: form.get("assetIdentifier"),
        issue: form.get("issue"),
        technician: form.get("technician"),
        promisedDate: form.get("promisedDate"),
        priority: form.get("priority"),
        parts: parts.map((part) => ({ stockId: part.itemId, quantity: part.quantity })),
      };
      const { data } = editingJob
        ? await api.patch(`/repairs/${editingJob.id}`, payload)
        : await api.post("/repairs", payload);
      setIsCreateOpen(false);
      setEditingJob(null);
      setToast({
        message: editingJob
          ? `Repair job updated successfully${parts.length ? ` with ${parts.length} part${parts.length === 1 ? "" : "s"} assigned` : ""}.`
          : `${data.job.jobNumber} created successfully${parts.length ? ` with ${parts.length} part${parts.length === 1 ? "" : "s"} assigned` : ""}.`,
        tone: "success",
      });
      await loadJobs();
    } catch (error) {
      setToast({
        message: getApiError(
          error,
          editingJob
            ? "Unable to update repair job."
            : "Unable to create repair job.",
        ),
        tone: "error",
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function deleteRepair() {
    if (!deletingJob) return;
    setIsDeleting(true);
    try {
      await api.delete(`/repairs/${deletingJob.id}`);
      setToast({
        message: `${deletingJob.jobNumber} deleted successfully.`,
        tone: "success",
      });
      setDeletingJob(null);
      await loadJobs();
    } catch (error) {
      setToast({
        message: getApiError(error, "Unable to delete repair job."),
        tone: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function updateRepairStatus(status: string) {
    if (!statusJob) return;
    setIsUpdatingStatus(true);
    try {
      await api.patch(`/repairs/${statusJob.id}`, { status });
      setToast({
        message: `${statusJob.jobNumber} status updated to ${status}.`,
        tone: "success",
      });
      setStatusJob(null);
      await loadJobs();
    } catch (error) {
      setToast({
        message: getApiError(error, "Unable to update repair status."),
        tone: "error",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function toggleActionMenu(
    job: RepairJob,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    if (actionJob?.id === job.id) {
      setActionJob(null);
      setActionMenuPosition(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 126;
    const top =
      window.innerHeight - rect.bottom > menuHeight + 12
        ? rect.bottom + 8
        : rect.top - menuHeight - 8;
    setActionJob(job);
    setActionMenuPosition({ top, right: window.innerWidth - rect.right });
  }

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-[#f4f4f5] font-sans text-[#262b3a] max-[1100px]:flex-col">
      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      )}
      <Sidebar
        user={user}
        activePage="repairs"
        onGoDashboard={onGoDashboard}
        onOpenRepairs={() => undefined}
        onOpenHistory={onOpenHistory}
        onOpenProfile={onOpenProfile}
        onSignOut={onSignOut}
      />
      <main className="min-h-full flex-1 overflow-y-auto bg-[#f5f5f7] p-[20px_20px_32px_22px] max-[1100px]:p-4">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a8090]">
              Repair management
            </p>
            <h1 className="mt-2 text-[clamp(1.8rem,2vw,2.25rem)] font-bold tracking-[-0.035em] text-[#22262d]">
              Repair jobs
            </h1>
            <p className="mt-1 text-sm text-[#747a89]">
              Track every repair from customer intake to collection.
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#171719] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,23,25,0.14)] transition hover:bg-[#303034]"
            type="button"
            onClick={() => setIsCreateOpen(true)}
          >
            <span className="text-lg leading-none">+</span>Create repair
          </button>
        </header>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Open repairs"
            value={metrics.open}
            detail="Active repair jobs"
          />
          <Metric
            label="Need attention"
            value={metrics.attention}
            detail="Urgent or awaiting approval"
            tone="alert"
          />
          <Metric
            label="Waiting for parts"
            value={metrics.waiting}
            detail="Parts are required to continue"
          />
          <Metric
            label="Ready to collect"
            value={metrics.ready}
            detail="Ready for customer handover"
            tone="success"
          />
        </section>
        <section className="mt-5 rounded-[18px] border border-[#eceaf2] bg-white/75 p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form
              className="flex min-w-[240px] flex-1 items-center gap-2.5 rounded-xl border border-[#e9e9ee] bg-white px-3.5 py-2.5 text-sm text-[#878c99]"
              onSubmit={(event) => {
                event.preventDefault();
                void loadJobs();
              }}
            >
              <span>⌕</span>
              <input
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9ca0aa]"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search job, customer or asset…"
              />
              <button
                className="sr-only"
                type="submit"
                aria-label="Submit search"
              />
            </form>
            <div className="min-w-[180px]">
              <AppSelect aria-label="Filter repair status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </AppSelect>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[930px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#777e8e]">
                  <th className="px-2 py-3">Repair job</th>
                  <th className="px-2 py-3">Customer & asset</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Technician</th>
                  <th className="px-2 py-3">Promised date</th>
                  <th className="px-2 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      className="px-2 py-10 text-center text-sm text-[#7b8190]"
                      colSpan={6}
                    >
                      Loading repair jobs…
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td className="px-2 py-12 text-center" colSpan={6}>
                      <p className="font-semibold text-[#444a56]">
                        No repair jobs found
                      </p>
                      <p className="mt-1 text-xs text-[#7b8190]">
                        Create your first repair job to start tracking it here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-t border-[#f0f1f4] text-sm"
                    >
                      <td className="px-2 py-4">
                        <p className="font-semibold text-[#2b3039]">
                          {job.jobNumber}
                        </p>
                        <p className="mt-1 max-w-[220px] truncate text-xs text-[#7b8190]">
                          {job.issue}
                        </p>
                      </td>
                      <td className="px-2 py-4">
                        <p className="font-medium text-[#454b58]">
                          {job.customerName}
                        </p>
                        <p className="mt-1 text-xs text-[#7b8190]">
                          {job.assetName}
                        </p>
                      </td>
                      <td className="px-2 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[job.status] || statusStyles.Received}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-2 py-4 text-xs font-medium text-[#5a6170]">
                        {job.technician}
                      </td>
                      <td className="px-2 py-4 text-xs font-semibold text-[#5a6170]">
                        {job.promisedDate
                          ? new Intl.DateTimeFormat("en", {
                              dateStyle: "medium",
                            }).format(new Date(job.promisedDate))
                          : "Not set"}
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex justify-end gap-1.5">
                          <IconButton
                            label="View repair job"
                            title="View"
                            onClick={() => setViewingJob(job)}
                          >
                            <EyeIcon />
                          </IconButton>
                          <IconButton
                            label="More repair actions"
                            title="More actions"
                            onClick={(event) => toggleActionMenu(job, event)}
                          >
                            <MoreIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 border-t border-[#f0f1f4] pt-4 text-xs text-[#7b8190]">
            {jobs.length} repair job{jobs.length === 1 ? "" : "s"} shown
          </p>
        </section>
      </main>
      {isCreateOpen && (
        <CreateRepairModal
          job={editingJob}
          isCreating={isCreating}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingJob(null);
          }}
          onSubmit={saveRepair}
        />
      )}
      {viewingJob && (
        <RepairDetailModal
          job={viewingJob}
          onClose={() => setViewingJob(null)}
        />
      )}
      {actionJob && actionMenuPosition && (
        <div
          className="fixed z-30 w-40 rounded-xl border border-[#e4e5e8] bg-white p-1.5 shadow-xl"
          style={actionMenuPosition}
        >
          <ActionMenuButton
            onClick={() => {
              setEditingJob(actionJob);
              setIsCreateOpen(true);
              setActionJob(null);
              setActionMenuPosition(null);
            }}
          >
            <EditIcon />
            Edit
          </ActionMenuButton>
          <ActionMenuButton
            onClick={() => {
              setStatusJob(actionJob);
              setActionJob(null);
              setActionMenuPosition(null);
            }}
          >
            <StatusIcon />
            Repair status
          </ActionMenuButton>
          <ActionMenuButton
            tone="danger"
            onClick={() => {
              setDeletingJob(actionJob);
              setActionJob(null);
              setActionMenuPosition(null);
            }}
          >
            <DeleteIcon />
            Delete
          </ActionMenuButton>
        </div>
      )}
      {statusJob && (
        <RepairStatusModal
          job={statusJob}
          isUpdating={isUpdatingStatus}
          onClose={() => setStatusJob(null)}
          onSave={updateRepairStatus}
        />
      )}
      {deletingJob && (
        <DeleteRepairModal
          job={deletingJob}
          isDeleting={isDeleting}
          onClose={() => setDeletingJob(null)}
          onConfirm={deleteRepair}
        />
      )}
    </div>
  );
}

function RepairDetailModal({ job, onClose }: { job: RepairJob; onClose: () => void }) {
  const parts = job.parts || [];
  const date = job.promisedDate
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(job.promisedDate))
    : "Not set";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101012]/45 p-4"><section className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-[#e7e7e9] bg-[#fbfbfc] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#777e8e]">Repair job details</p><h2 className="mt-2 text-xl font-bold tracking-[-.03em] text-[#252932]">{job.jobNumber}</h2><p className="mt-1 text-sm text-[#747a89]">{job.customerName} · {job.assetName}</p></div><button className="grid h-8 w-8 place-items-center rounded-lg text-[#767c89] hover:bg-[#eeeeef]" type="button" onClick={onClose} aria-label="Close">×</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Detail label="Customer" value={job.customerName}/><Detail label="Phone number" value={job.customerPhone||'Not provided'}/><Detail label="Asset type" value={job.assetType}/><Detail label="Asset / model" value={job.assetName}/><Detail label="Identifier" value={job.assetIdentifier||'Not provided'}/><Detail label="Technician" value={job.technician||'Unassigned'}/><Detail label="Priority" value={job.priority}/><Detail label="Promised date" value={date}/><div className="sm:col-span-2"><p className="text-[11px] font-semibold text-[#7b8190]">Reported issue</p><p className="mt-2 whitespace-pre-wrap rounded-xl border border-[#eceef1] bg-white p-3 text-sm leading-6 text-[#414854]">{job.issue}</p></div></div><section className="mt-5 rounded-xl border border-[#e7e7e9] bg-white p-4"><h3 className="text-sm font-semibold text-[#303540]">Assigned parts</h3>{parts.length?<div className="mt-3 divide-y divide-[#f0f1f4] rounded-lg border border-[#eceef1]">{parts.map(part=><div className="flex items-center justify-between gap-3 px-3 py-2" key={part.stockId}><span className="text-xs font-normal text-[#303540]">{part.name} × {part.quantity}</span><span className="text-xs font-normal text-[#69717f]">Rs. {part.total.toFixed(2)}</span></div>)}</div>:<p className="mt-2 text-xs font-normal text-[#7a8090]">No parts assigned yet.</p>}</section><div className="mt-6 flex justify-end"><button className="rounded-xl bg-[#171719] px-4 py-2.5 text-xs font-semibold text-white" type="button" onClick={onClose}>Close</button></div></section></div>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#eceef1] bg-white p-3"><p className="text-[11px] font-semibold text-[#7b8190]">{label}</p><p className="mt-1 text-sm font-normal text-[#414854]">{value}</p></div>; }

function DeleteRepairModal({
  job,
  isDeleting,
  onClose,
  onConfirm,
}: {
  job: RepairJob;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101012]/45 p-4">
      <div className="w-full max-w-sm rounded-[20px] border border-[#e7e7e9] bg-[#fbfbfc] p-6 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#bb4941]">
          Delete repair job
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[#252932]">
          Delete {job.jobNumber}?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6f7582]">
          This will permanently remove this repair job. This action cannot be
          undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[#555b68] hover:bg-[#f0f0f2]"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-[#bd4940] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#a83e37] disabled:opacity-60"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete repair"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RepairStatusModal({
  job,
  isUpdating,
  onClose,
  onSave,
}: {
  job: RepairJob;
  isUpdating: boolean;
  onClose: () => void;
  onSave: (status: string) => void;
}) {
  const [status, setStatus] = useState(job.status);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101012]/45 p-4">
      <form
        className="w-full max-w-sm rounded-[20px] border border-[#e7e7e9] bg-[#fbfbfc] p-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(status);
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#777e8e]">
          Update repair status
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[#252932]">
          {job.jobNumber}
        </h2>
        <label className="mt-6 block text-[11px] font-semibold text-[#4b5260]">
          <span>Repair status</span>
          <AppSelect className="mt-2" aria-label="Repair status" disabled={isUpdating}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
            <option>Delivered</option>
            <option>Closed</option>
            <option>Cancelled</option>
          </AppSelect>
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[#555b68] hover:bg-[#f0f0f2]"
            type="button"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-[#171719] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
            type="submit"
            disabled={isUpdating}
          >
            {isUpdating ? "Updating…" : "Update status"}
          </button>
        </div>
      </form>
    </div>
  );
}

function IconButton({
  label,
  title,
  tone = "default",
  onClick,
  children,
}: {
  label: string;
  title: string;
  tone?: "default" | "danger";
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`grid h-8 w-8 place-items-center rounded-lg border transition ${tone === "danger" ? "border-[#f1d6d3] text-[#bb4941] hover:bg-[#fff1f0]" : "border-[#e2e4e8] text-[#596170] hover:border-[#c8cbd2] hover:bg-[#f5f5f6]"}`}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
    >
      {children}
    </button>
  );
}
function ActionMenuButton({
  children,
  tone = "default",
  onClick,
}: {
  children: React.ReactNode;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${tone === "danger" ? "text-[#bb4941] hover:bg-[#fff1f0]" : "text-[#4d5562] hover:bg-[#f3f4f5]"}`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"
      />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.7 5.3 4 4M4 20l4.1-.9L19.7 7.5a2.1 2.1 0 0 0-3-3L5.1 16.1 4 20Z"
      />
    </svg>
  );
}
function DeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16m-10 4v5m4-5v5M9 7l.7-2h4.6l.7 2m-9 0 1 13h10l1-13"
      />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}
function StatusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" d="m8.5 12 2.2 2.2 4.8-4.8" />
    </svg>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "alert" | "success";
}) {
  const accent =
    tone === "alert"
      ? "text-[#bd4940]"
      : tone === "success"
        ? "text-[#228953]"
        : "text-[#22262d]";
  return (
    <article className="rounded-[18px] border border-[#eceaf2] bg-white/75 p-4 shadow-sm">
      <p className="text-xs font-medium text-[#737a89]">{label}</p>
      <p className={`mt-3 text-3xl font-bold tracking-[-0.04em] ${accent}`}>
        {value}
      </p>
      <p className="mt-2 text-[11px] text-[#8a8f9b]">{detail}</p>
    </article>
  );
}
export default RepairJobsPage;
