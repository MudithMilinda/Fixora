import AppDatePicker from '../Components/AppDatePicker'
import AppSelect from '../Components/AppSelect'
import Pagination from '../Components/Pagination'
import { useEffect, useState } from "react";
import Sidebar from "../Components/Sidebar";
import ReceiptModal from "../Components/RepairReceiptModal";
import Toast from "../Components/Toast";
import type { AuthUser } from "../types/auth";
import type { RepairJob } from "./RepairJobsPage";
import api, { getApiError } from "../api/axios";

const historyStatuses = ["Delivered", "Closed"];
const statusStyles: Record<string, string> = {
  Delivered: "bg-[#edf8f1] text-[#31865a]",
  Closed: "bg-[#f0f1f3] text-[#69717f]",
};

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
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [followUp, setFollowUp] = useState<RepairJob | null>(null);
  const [followUpIssue, setFollowUpIssue] = useState('');
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [followUpError, setFollowUpError] = useState('');
  const [viewJob, setViewJob] = useState<RepairJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; tone: "error" } | null>(
    null,
  );

  const [page, setPage] = useState(1), [total, setTotal] = useState(0)
  useEffect(() => {
    let cancelled = false; setIsLoading(true)
    const timer = window.setTimeout(() => {
      api.get('/repairs/history', { params: { page, search: search.trim(), status, from: fromDate, to: toDate } }).then(({ data }) => {
        if (cancelled) return
        const last = Math.max(1, Math.ceil(data.total / data.pageSize))
        if (page > last) { setPage(last); return }
        setJobs(data.jobs); setTotal(data.total)
      }).catch(error => { if (!cancelled) setToast({ message: getApiError(error, 'Unable to load repair history.'), tone: 'error' }) }).finally(() => { if (!cancelled) setIsLoading(false) })
    }, search ? 250 : 0)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [page, search, status, fromDate, toDate]);
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
  async function createFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!followUp || !followUpIssue.trim()) return;
    setFollowUpSaving(true); setFollowUpError('');
    try {
      const { data } = await api.post('/repairs', { parentRepairId: followUp.id, customerName: followUp.customerName, customerPhone: followUp.customerPhone, assetName: followUp.assetName, assetType: followUp.assetType, assetIdentifier: followUp.assetIdentifier, issue: followUpIssue.trim() });
      window.location.href = `/repair-jobs?search=${encodeURIComponent(data.job.jobNumber)}`;
    } catch (error) { setFollowUpError(getApiError(error, 'Unable to create follow-up repair.')) }
    finally { setFollowUpSaving(false) }
  }
  const warrantyLabel = (job: RepairJob) => job.warrantyStatus === 'active' ? 'Active' : job.warrantyStatus === 'expired' ? 'Expired' : job.warrantyStatus === 'none' ? 'No warranty' : job.warrantyStatus === 'not_started' ? 'Not started' : 'Not recorded';
  const filteredJobs = jobs;
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
                setPage(1);
              }}
            >
              <span>⌕</span>
              <input
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9ca0aa]"
                value={search}
                onChange={(event) => { setPage(1); setSearch(event.target.value) }}
                placeholder="Search job, customer or asset…"
              />
              <button
                className="sr-only"
                type="submit"
                aria-label="Search history"
              />
            </form>
            <div className="min-w-[180px]">
              <AppSelect aria-label="Filter repair history"
                value={status}
                onChange={(event) => { setPage(1); setStatus(event.target.value) }}
              >
                <option value="">All history</option>
                {historyStatuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </AppSelect>
            </div>
            <AppDatePicker label="From date" hideLabel value={fromDate} onChange={value => { setPage(1); setFromDate(value) }} />
            <AppDatePicker label="To date" hideLabel value={toDate} onChange={value => { setPage(1); setToDate(value) }} />
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
                  <th className="px-2 py-3">Warranty</th>
                  <th className="px-2 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-2 py-10 text-center text-sm text-[#7b8190]"
                    >
                      Loading repair history…
                    </td>
                  </tr>
                ) : filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-12 text-center">
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
                        {job.parentJobNumber && <p className="mt-1 text-xs text-[#8b5d40]">{job.warrantyClaim ? 'Warranty follow-up' : 'Follow-up'} · {job.parentJobNumber}</p>}
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
                      <td className="px-2 py-4 text-xs"><span className={`font-semibold ${job.warrantyStatus === 'active' ? 'text-[#247545]' : 'text-[#747a89]'}`}>{warrantyLabel(job)}</span>{job.warrantyEnd && <span className="mt-1 block text-[#747a89]">Until {new Date(`${job.warrantyEnd}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}</td>
                      <td className="px-2 py-4 text-right"><div className="flex justify-end gap-2"><button className="grid h-8 w-8 place-items-center rounded-[9px] border border-[#dfe2e7] bg-white text-[#667080] shadow-[0_1px_1px_#10101206] transition hover:border-[#cbd0d8] hover:bg-[#f6f7f8] hover:text-[#262b3a]" type="button" onClick={() => setViewJob(job)} aria-label={`View receipt for ${job.jobNumber}`} title="View receipt"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M2.8 12s3.3-5.7 9.2-5.7 9.2 5.7 9.2 5.7-3.3 5.7-9.2 5.7S2.8 12 2.8 12Z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.6"/></svg></button><button className="grid h-8 w-8 place-items-center rounded-[9px] border border-[#dfe2e7] bg-white text-[#667080] shadow-[0_1px_1px_#10101206] transition hover:border-[#cbd0d8] hover:bg-[#f6f7f8] hover:text-[#262b3a]" type="button" onClick={() => { setFollowUp(job); setFollowUpIssue(''); setFollowUpError('') }} aria-label={`New follow-up for ${job.jobNumber}`} title="New follow-up"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 5 10l4-4"/><path d="M5 10h9a5 5 0 0 1 0 10h-3"/></svg></button></div></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} disabled={isLoading} onPageChange={setPage} />
        </section>
      </main>
      {followUp && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101012]/45 p-4"><form onSubmit={createFollowUp} role="dialog" aria-modal="true" aria-labelledby="follow-up-title" className="w-full max-w-md rounded-2xl border border-[#e7e7e9] bg-white p-6 shadow-xl"><h2 id="follow-up-title" className="text-xl font-bold">New follow-up repair</h2><p className="mt-2 text-sm text-[#747a89]">{followUp.jobNumber} · {followUp.customerName} · {followUp.assetName}</p><p className="mt-3 rounded-xl bg-[#f7f7f9] p-3 text-sm text-[#596170]">Warranty: <strong>{warrantyLabel(followUp)}</strong>{followUp.warrantyEnd ? ` · Until ${new Date(`${followUp.warrantyEnd}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}. {followUp.warrantyStatus === 'active' ? 'The new repair will be marked as a warranty follow-up.' : 'The new repair will be linked as a follow-up; warranty coverage is not recorded as active.'}</p><label className="mt-4 block text-xs font-semibold text-[#596170]">Current issue<textarea required maxLength={5000} value={followUpIssue} onChange={event => setFollowUpIssue(event.target.value)} className="mt-2 block min-h-24 w-full rounded-xl border border-[#e2e3e8] p-3 text-sm font-normal outline-none focus:border-[#171719]" placeholder="Describe the issue reported now…" /></label>{followUpError && <p role="alert" className="mt-3 text-sm text-red-700">{followUpError}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" disabled={followUpSaving} onClick={() => setFollowUp(null)} className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[#596170]">Cancel</button><button disabled={followUpSaving} className="rounded-xl bg-[#171719] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">{followUpSaving ? 'Creating…' : 'Create follow-up'}</button></div></form></div>}
      {viewJob && <ReceiptModal job={viewJob} onClose={() => setViewJob(null)} />}
    </div>
  );
}


export default RepairHistoryPage;
