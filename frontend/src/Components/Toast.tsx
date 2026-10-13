type ToastProps = {
  message: string
  tone: 'success' | 'error'
  onDismiss: () => void
}

function Toast({ message, tone, onDismiss }: ToastProps) {
  const isSuccess = tone === 'success'

  return (
    <div className="fixed right-5 top-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-2xl border border-[#e7e7e9] bg-white px-4 py-3.5 shadow-[0_16px_40px_rgba(23,23,25,0.16)]" role={isSuccess ? 'status' : 'alert'} aria-live="polite">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${isSuccess ? 'bg-[#171719] text-white' : 'bg-[#fff0ef] text-[#b53c35]'}`}>
        {isSuccess ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4.2 4L19 6.5" /></svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 8v5" /><path d="M12 16.5h.01" /><circle cx="12" cy="12" r="9" /></svg>
        )}
      </span>
      <p className="text-xs font-semibold text-[#30333a]">{message}</p>
      <button className="ml-1 grid h-6 w-6 place-items-center rounded-md text-[#8b8d95] transition hover:bg-[#f3f3f4] hover:text-[#25272d]" type="button" onClick={onDismiss} aria-label="Dismiss notification">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
  )
}

export default Toast
