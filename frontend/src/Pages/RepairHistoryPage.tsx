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
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-10 text-center text-sm text-[#7b8190]"
                    >
                      Loading repair history…
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-12 text-center">
                      <p className="font-semibold text-[#444a56]">
                        No repair history found
                      </p>
                      <p className="mt-1 text-xs text-[#7b8190]">
                        Delivered and closed repair jobs will appear here.
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
    </div>
  );
}

export default RepairHistoryPage;
