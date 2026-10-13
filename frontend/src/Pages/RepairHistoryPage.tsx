import { useEffect, useState } from "react";
import Sidebar from "../Components/Sidebar";
import Toast from "../Components/Toast";
import type { AuthUser } from "../types/auth";
import type { RepairJob } from "./RepairJobsPage";
import api, { getApiError } from "../api/axios";

const historyStatuses = ["Delivered", "Closed"];
const statusStyles: Record<string, string> = {
  Delivered: "bg-[#edf8f1] text-[#31865a]",
  Closed: "bg-[#f0f1f3] text-[#69717f]",
};
const selectArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23667080' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

function RepairHistoryPage({
  user,
  onGoDashboard,
  onOpenRepairs,
  onOpenProfile,
  onSignOut,
}: {
  user: AuthUser;
  onGoDashboard: () => void;
  onOpenRepairs: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
}) {
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [viewJob, setViewJob] = useState<RepairJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; tone: "error" } | null>(
    null,
  );

  async function loadHistory() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const { data } = await api.get(`/repairs/history?${params.toString()}`);
      setJobs(data.jobs);
    } catch (error) {
      setToast({
        message: getApiError(error, "Unable to load repair history."),
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, [status]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
          new Date(value),
        )
      : "Not set";
  const filteredJobs = jobs.filter((job) => {
    const date = job.promisedDate ? job.promisedDate.slice(0, 10) : "";
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  });
  const partsTotal = (job: RepairJob) => (job.parts || []).reduce((total, part) => total + part.total, 0);

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
        activePage="history"
        onGoDashboard={onGoDashboard}
        onOpenRepairs={onOpenRepairs}
        onOpenHistory={() => undefined}
        onOpenProfile={onOpenProfile}
        onSignOut={onSignOut}
      />
      <main className="min-h-full flex-1 overflow-y-auto bg-[#f5f5f7] p-[20px_20px_32px_22px] max-[1100px]:p-4">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a8090]">
            Repair management
          </p>
          <h1 className="mt-2 text-[clamp(1.8rem,2vw,2.25rem)] font-bold tracking-[-0.035em] text-[#22262d]">
            Repair history
          </h1>
          <p className="mt-1 text-sm text-[#747a89]">
            Review completed and delivered repair jobs.
          </p>
        </header>
        <section className="mt-6 rounded-[18px] border border-[#eceaf2] bg-white/75 p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form
              className="flex min-w-[240px] flex-1 items-center gap-2.5 rounded-xl border border-[#e9e9ee] bg-white px-3.5 py-2.5 text-sm text-[#878c99]"
              onSubmit={(event) => {
                event.preventDefault();
                void loadHistory();
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
                aria-label="Search history"
              />
            </form>
            <div className="min-w-[180px]">
              <select
                className="w-full cursor-pointer rounded-xl border border-[#e5e6ea] bg-white py-2.5 pr-10 text-xs font-semibold text-[#535966] outline-none"
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  paddingLeft: "18px",
                  backgroundImage: selectArrow,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                  backgroundSize: "14px 14px",
                }}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All history</option>
                {historyStatuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <input className="h-10 rounded-xl border border-[#e5e6ea] bg-white px-3 text-xs font-normal text-[#535966] outline-none" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="From date" />
            <input className="h-10 rounded-xl border border-[#e5e6ea] bg-white px-3 text-xs font-normal text-[#535966] outline-none" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="To date" />
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#777e8e]">
                  <th className="px-2 py-3">Repair job</th>
                  <th className="px-2 py-3">Customer & asset</th>
                  <th className="px-2 py-3">Final status</th>
                  <th className="px-2 py-3">Technician</th>
                  <th className="px-2 py-3">Promised date</th>
                  <th className="px-2 py-3">Parts cost</th>
                  <th className="px-2 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-2 py-10 text-center text-sm text-[#7b8190]"
                    >
                      Loading repair history…
                    </td>
                  </tr>
                ) : filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-12 text-center">
                      <p className="font-semibold text-[#444a56]">
                        No repair history found
                      </p>
                      <p className="mt-1 text-xs text-[#7b8190]">
                        Delivered and closed repair jobs will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
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
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[job.status]}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-2 py-4 text-xs font-medium text-[#5a6170]">
                        {job.technician}
                      </td>
                      <td className="px-2 py-4 text-xs font-semibold text-[#5a6170]">
                        {formatDate(job.promisedDate)}
                      </td>
                      <td className="px-2 py-4 text-xs font-semibold text-[#5a6170]">Rs. {partsTotal(job).toFixed(2)}</td>
                      <td className="px-2 py-4 text-right"><button className="rounded-lg border border-[#dfe1e6] px-3 py-1.5 text-xs font-semibold text-[#555b68] hover:bg-[#f4f4f5]" type="button" onClick={() => setViewJob(job)}>View receipt</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 border-t border-[#f0f1f4] pt-4 text-xs text-[#7b8190]">
            {filteredJobs.length} repair job{filteredJobs.length === 1 ? "" : "s"} shown
          </p>
        </section>
      </main>
      {viewJob && <ReceiptModal job={viewJob} onClose={() => setViewJob(null)} />}
    </div>
  );
}

function ReceiptModal({ job, onClose }: { job: RepairJob; onClose: () => void }) {
  const parts = job.parts || [];
  const total = parts.reduce((sum, part) => sum + part.total, 0);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101012]/45 p-4"><section className="w-full max-w-lg rounded-[22px] border border-[#e7e7e9] bg-[#fbfbfc] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#777e8e]">Repair receipt</p><h2 className="mt-2 text-xl font-bold text-[#252932]">{job.jobNumber}</h2><p className="mt-1 text-sm text-[#747a89]">{job.customerName} · {job.assetName}</p></div><button className="grid h-8 w-8 place-items-center rounded-lg text-[#767c89] hover:bg-[#eeeeef]" type="button" onClick={onClose}>×</button></div><div className="mt-6 rounded-xl border border-[#e7e7e9] bg-white p-4"><p className="text-xs font-semibold text-[#555b68]">Assigned parts</p>{parts.length ? <div className="mt-3 divide-y divide-[#f0f1f4]">{parts.map(part => <div className="flex justify-between py-2 text-sm" key={part.stockId}><span>{part.name} × {part.quantity}</span><span className="font-semibold">Rs. {part.total.toFixed(2)}</span></div>)}</div> : <p className="mt-3 text-sm text-[#7a8090]">No parts assigned.</p>}<div className="mt-3 flex justify-between border-t border-[#eceef1] pt-3 text-sm font-bold"><span>Parts total</span><span>Rs. {total.toFixed(2)}</span></div></div><div className="mt-6 flex justify-end gap-3"><button className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[#555b68] hover:bg-[#f0f0f2]" type="button" onClick={onClose}>Close</button><button className="rounded-xl bg-[#171719] px-4 py-2.5 text-xs font-semibold text-white" type="button" onClick={() => window.print()}>Print receipt</button></div></section></div>;
}

export default RepairHistoryPage;
