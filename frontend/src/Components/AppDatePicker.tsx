import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

type Props = { label: string; value?: string; defaultValue?: string; min?: string; max?: string; name?: string; required?: boolean; hideLabel?: boolean; onChange?: (value: string) => void }

const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const parseDate = (value: string) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day) }
const displayDate = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export default function AppDatePicker({ label, value: controlledValue, defaultValue = '', min, max, name, required, hideLabel, onChange }: Props) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const value = controlledValue ?? internalValue
  const [invalid, setInvalid] = useState(false)
  const id = useId(), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), popup = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => value ? parseDate(value) : new Date())
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = (firstDay.getDay() + 6) % 7
  const days = Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - start + i))
  const today = dateString(new Date())
  const allowed = (day: string) => (!min || day >= min) && (!max || day <= max)
  const close = (focus = false) => { setOpen(false); if (focus) trigger.current?.focus() }
  const select = (day: string) => { setInternalValue(day); setInvalid(false); onChange?.(day); close(true) }

  useLayoutEffect(() => {
    const menu = popup.current, button = trigger.current
    if (!open || !menu || !button) return
    const position = () => {
      const rect = button.getBoundingClientRect(), width = Math.min(270, window.innerWidth - 24)
      const below = window.innerHeight - rect.bottom - 12, above = rect.top - 12
      menu.style.width = `${width}px`
      menu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`
      menu.style.maxHeight = `${Math.max(120, Math.max(below, above) - 6)}px`
      if (below < 300 && above > below) { menu.style.top = 'auto'; menu.style.bottom = `${window.innerHeight - rect.top + 6}px` }
      else { menu.style.bottom = 'auto'; menu.style.top = `${rect.bottom + 6}px` }
    }
    menu.showPopover(); position()
    menu.querySelector<HTMLButtonElement>('[data-calendar-focus]')?.focus({ preventScroll: true })
    const scroll = (event: Event) => { if (!menu.contains(event.target as Node)) position() }
    window.addEventListener('resize', position); window.addEventListener('scroll', scroll, true)
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', scroll, true); if (menu.matches(':popover-open')) menu.hidePopover() }
  }, [open])
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close() }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  useEffect(() => {
    const form = root.current?.closest('form')
    const reset = () => { setInternalValue(defaultValue); setInvalid(false); setOpen(false) }
    form?.addEventListener('reset', reset)
    return () => form?.removeEventListener('reset', reset)
  }, [defaultValue])

  return <div ref={root} className="relative text-xs font-semibold text-[#596170]">
    <span id={`${id}-label`} className={hideLabel ? 'sr-only' : undefined}>{label}</span>
    <input type="date" className="sr-only" tabIndex={-1} aria-hidden="true" name={name} value={value} min={min} max={max} required={required} onChange={() => {}} onInvalid={event => { event.preventDefault(); setInvalid(true); trigger.current?.focus() }} />
    <button ref={trigger} type="button" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open} aria-required={required || undefined} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined} onClick={() => { if (open) close(); else { setMonth(value ? parseDate(value) : new Date()); setOpen(true) } }} className={`${hideLabel ? '' : 'mt-2 '}flex h-11 w-full min-w-[160px] items-center justify-between gap-3 rounded-xl border ${invalid ? 'border-red-400' : 'border-[#e2e3e8]'} bg-white px-3.5 text-left text-sm font-normal shadow-sm transition hover:border-[#bfc4cd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad6338]`}>
      <span id={`${id}-value`} className={value ? 'text-[#414754]' : 'text-[#7a8090]'}>{value ? displayDate(parseDate(value)) : hideLabel ? label : 'Select date'}</span>
      <svg className="h-4 w-4 shrink-0 text-[#747a89]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18" strokeLinecap="round"/></svg>
    </button>
    {invalid && <span id={`${id}-error`} role="alert" className="mt-1 block text-xs font-normal text-red-600">Select a valid date{min || max ? ' within the allowed range' : ''}.</span>}
    {open && <div ref={popup} popover="manual" role="dialog" aria-label={`${label} calendar`} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true) } }} className="fixed m-0 overflow-y-auto rounded-2xl border border-[#e2e3e8] bg-white p-3 font-sans text-[#262b3a] shadow-[0_12px_36px_#262b3a24]">
      <div className="flex items-center justify-between gap-2"><h2 aria-live="polite" className="text-sm font-semibold">{firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2><div className="flex gap-1"><button data-calendar-focus type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-[#596170] hover:bg-[#f0f0f3] focus-visible:outline-2 focus-visible:outline-[#ad6338]">‹</button><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-[#596170] hover:bg-[#f0f0f3] focus-visible:outline-2 focus-visible:outline-[#ad6338]">›</button></div></div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <span key={i} className="grid h-7 place-items-center text-[11px] font-semibold text-[#9399a6]">{day}</span>)}{days.map(date => { const day = dateString(date), selected = day === value; return <button key={day} type="button" aria-label={displayDate(date)} aria-pressed={selected} disabled={!allowed(day)} onClick={() => select(day)} className={`grid h-8 place-items-center rounded-lg text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-[#ad6338] disabled:cursor-not-allowed disabled:opacity-30 ${selected ? 'bg-[#262b3a] text-white' : date.getMonth() !== month.getMonth() ? 'text-[#aeb3bd] hover:bg-[#f0f0f3]' : 'text-[#414754] hover:bg-[#f0f0f3]'} ${day === today && !selected ? 'ring-1 ring-inset ring-[#cbd0d8]' : ''}`}>{date.getDate()}</button> })}</div>
      <div className="mt-2 flex justify-between border-t border-[#eceef2] pt-2"><button type="button" onClick={() => select('')} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#747a89] hover:bg-[#f0f0f3]">Clear</button><button type="button" disabled={!allowed(today)} onClick={() => select(today)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#596170] hover:bg-[#f0f0f3] disabled:opacity-30">Today</button></div>
    </div>}
  </div>
}
