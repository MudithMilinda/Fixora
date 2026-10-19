import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject, type SelectHTMLAttributes } from 'react'

type Option = { value: string; label: string; disabled: boolean }
type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size' | 'className'> & {
  className?: string
  searchable?: boolean
  searchPlaceholder?: string
  triggerRef?: RefObject<HTMLButtonElement | null>
  compact?: boolean
}

function optionText(children: ReactNode): string {
  return Children.toArray(children).map((child) => isValidElement<{ children?: ReactNode }>(child) ? optionText(child.props.children) : String(child)).join('')
}

function readOptions(children: ReactNode, disabled = false): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode; value?: string | number; disabled?: boolean; label?: string }>(child)) return []
    if (child.type === 'option') {
      const label = child.props.label || optionText(child.props.children)
      return [{ value: String(child.props.value ?? label), label, disabled: disabled || !!child.props.disabled }]
    }
    return readOptions(child.props.children, disabled || !!child.props.disabled)
  })
}

// Retains a native select for FormData and required validation, but never opens
// its OS menu. The visible popup uses Tailwind and the browser's top layer so
// it is not clipped by scrollable forms or native modal dialogs.
export default function AppSelect({ children, className = '', searchable, searchPlaceholder = 'Search options…', triggerRef, compact = false, value, defaultValue, onChange, onInvalid, disabled, required, id, style: _style, ...props }: Props) {
  const generatedId = useId()
  const triggerId = id || `${generatedId}-trigger`
  const listId = `${generatedId}-list`
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const native = useRef<HTMLSelectElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const options = readOptions(children)
  const initialValue = String(defaultValue ?? options[0]?.value ?? '')
  const [internalValue, setInternalValue] = useState(initialValue)
  const selectedValue = value === undefined ? internalValue : String(value)
  const selected = options.find((option) => option.value === selectedValue)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [invalid, setInvalid] = useState(false)
  const results = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
  const hasSearch = searchable ?? options.length > 5
  const expanded = open && !disabled
  const activeOption = results[active]
  const typeahead = useRef({ value: '', time: 0 })

  function close(restoreFocus = false) {
    setOpen(false)
    setQuery('')
    if (restoreFocus) trigger.current?.focus()
  }

  function show() {
    if (trigger.current?.matches(':disabled')) return
    setQuery('')
    setActive(Math.max(0, options.findIndex((option) => option.value === selectedValue && !option.disabled)))
    setOpen(true)
  }

  function choose(option: Option) {
    if (option.disabled || !native.current || trigger.current?.matches(':disabled')) return
    setInternalValue(option.value)
    setInvalid(false)
    native.current.value = option.value
    // Dispatching the real select change preserves existing handlers and parent
    // form change/dirty tracking without manufacturing a React event object.
    native.current.dispatchEvent(new Event('change', { bubbles: true }))
    close(true)
  }

  function navigate(key: string) {
    const enabled = results.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0)
    if (!enabled.length) return
    if (key === 'Home') setActive(enabled[0])
    else if (key === 'End') setActive(enabled[enabled.length - 1])
    else {
      const current = enabled.indexOf(active)
      const next = key === 'ArrowDown' ? (current + 1) % enabled.length : (current <= 0 ? enabled.length : current) - 1
      setActive(enabled[next])
    }
  }

  function handleKey(event: React.KeyboardEvent) {
    if (event.nativeEvent.isComposing) return
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      if (!expanded) show()
      else navigate(event.key)
    } else if ((event.key === 'Enter' || (event.key === ' ' && event.target === trigger.current)) && expanded) {
      event.preventDefault()
      if (activeOption) choose(activeOption)
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault(); event.stopPropagation(); close(true)
    } else if (event.key === 'Tab' && expanded) {
      // Move out from the trigger's position in the form, not from popup content.
      trigger.current?.focus(); close()
    } else if (event.key.length === 1 && event.target === trigger.current && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
      event.preventDefault()
      if (hasSearch) { setQuery(event.key); setActive(0); setOpen(true) }
      else {
        const now = Date.now()
        typeahead.current = { value: (now - typeahead.current.time < 700 ? typeahead.current.value : '') + event.key.toLowerCase(), time: now }
        const index = options.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(typeahead.current.value))
        if (index >= 0) { if (expanded) setActive(index); else choose(options[index]) }
      }
    }
  }

  useLayoutEffect(() => {
    const menu = popup.current
    const button = trigger.current
    if (!expanded || !menu || !button) return
    const position = () => {
      const rect = button.getBoundingClientRect()
      const width = Math.min(Math.max(rect.width, compact ? 180 : 220), window.innerWidth - 24)
      const below = window.innerHeight - rect.bottom - 16
      const above = rect.top - 16
      const upwards = below < 240 && above > below
      menu.style.width = `${width}px`
      menu.style.maxHeight = `${Math.max(80, Math.min(340, upwards ? above : below))}px`
      menu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`
      menu.style.top = upwards ? 'auto' : `${rect.bottom + 6}px`
      menu.style.bottom = upwards ? `${window.innerHeight - rect.top + 6}px` : 'auto'
    }
    menu.showPopover()
    position()
    if (hasSearch) search.current?.focus({ preventScroll: true })
    const scroll = (event: Event) => { if (!menu.contains(event.target as Node)) position() }
    window.addEventListener('resize', position)
    window.addEventListener('scroll', scroll, true)
    const observer = new ResizeObserver(position)
    observer.observe(button)
    return () => {
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', scroll, true)
      observer.disconnect()
      if (menu.matches(':popover-open')) menu.hidePopover()
    }
  }, [expanded, hasSearch, compact])

  useEffect(() => {
    if (!expanded) return
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close() }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [expanded])

  useEffect(() => {
    if (expanded) popup.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, query, expanded])

  useEffect(() => {
    const form = native.current?.form
    const reset = () => { setInternalValue(initialValue); setInvalid(false); close() }
    form?.addEventListener('reset', reset)
    return () => form?.removeEventListener('reset', reset)
  }, [initialValue])

  return <div ref={root} className={`relative min-w-0 ${className}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) close() }}>
    <button ref={(element) => { trigger.current = element; if (triggerRef) triggerRef.current = element }} id={triggerId} type="button" role="combobox" aria-haspopup="listbox" aria-controls={expanded ? listId : undefined} aria-expanded={expanded} aria-activedescendant={expanded && !hasSearch && activeOption ? `${listId}-${active}` : undefined} aria-required={required || undefined} aria-invalid={invalid || undefined} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={invalid ? `${generatedId}-error` : props['aria-describedby']} disabled={disabled} autoFocus={props.autoFocus} onKeyDown={handleKey} onClick={() => expanded ? close() : show()}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white text-left text-sm font-normal shadow-sm transition hover:border-[#bfc4cd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad6338] disabled:cursor-not-allowed disabled:bg-[#f7f7f9] disabled:opacity-60 ${compact ? 'min-h-10 px-3 py-2' : 'min-h-11 px-3.5 py-2.5'} ${invalid ? 'border-red-400' : expanded ? 'border-[#ad6338] ring-2 ring-[#ad6338]/10' : 'border-[#e2e3e8]'}`}>
      <span className={`min-w-0 truncate ${selectedValue ? 'text-[#414754]' : 'text-[#7a8090]'}`}>{selected?.label || 'Select an option'}</span>
      <svg className={`h-4 w-4 shrink-0 text-[#747a89] transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    <select {...props} ref={native} tabIndex={-1} aria-hidden="true" autoFocus={false} required={required} disabled={disabled} value={selectedValue} onChange={(event) => { setInternalValue(event.target.value); onChange?.(event) }} onInvalid={(event) => { event.preventDefault(); setInvalid(true); trigger.current?.focus(); onInvalid?.(event) }} style={{ display: 'none' }}>{children}</select>
    {invalid && <span id={`${generatedId}-error`} role="alert" className="mt-1 block text-xs text-red-600">Please select an option.</span>}
    {expanded && <div ref={popup} popover="manual" className="fixed m-0 flex flex-col overflow-hidden rounded-xl border border-[#e2e3e8] bg-white p-1.5 font-sans text-[#414754] shadow-[0_12px_36px_#262b3a24]" onKeyDown={handleKey}>
      {hasSearch && <div className={`relative mb-1 shrink-0 border-b border-[#eceef2] p-1.5 ${compact ? 'pb-2' : 'pb-3'}`}><input ref={search} role="combobox" aria-label={`Search ${props['aria-label'] || 'options'}`} aria-expanded="true" aria-controls={listId} aria-autocomplete="list" aria-activedescendant={activeOption ? `${listId}-${active}` : undefined} autoComplete="off" value={query} placeholder={searchPlaceholder} onChange={(event) => { event.stopPropagation(); setQuery(event.target.value); setActive(0) }} className={`${compact ? 'min-h-9' : 'min-h-10'} w-full rounded-lg border border-[#e2e3e8] bg-[#f8f8fa] px-3 py-2 text-sm font-normal text-[#414754] outline-none focus:border-[#ad6338]`} /></div>}
      <ul id={listId} role="listbox" aria-label={props['aria-label'] || 'Options'} className="m-0 min-h-0 list-none overflow-y-auto overscroll-contain p-0">
        {results.map((option, index) => <li key={`${option.value}-${index}`} id={`${listId}-${index}`} role="option" aria-selected={option.value === selectedValue} aria-disabled={option.disabled || undefined} data-active={index === active} onPointerMove={() => { if (!option.disabled) setActive(index) }} onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.preventDefault(); choose(option) }} className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm font-normal leading-relaxed ${compact ? 'min-h-9 py-1.5' : 'min-h-10 py-2.5'} ${option.disabled ? 'cursor-not-allowed opacity-40' : index === active ? 'bg-[#f0f0f3] text-[#262b3a]' : option.value === selectedValue ? 'bg-[#f7f7f9] text-[#262b3a]' : 'text-[#515867]'}`}><span className="min-w-0 break-words">{option.label}</span>{option.value === selectedValue && <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>}</li>)}
      </ul>
      {!results.length && <p role="status" className="px-3 py-6 text-center text-sm font-normal text-[#7a8090]">No matching options.</p>}
    </div>}
  </div>
}
