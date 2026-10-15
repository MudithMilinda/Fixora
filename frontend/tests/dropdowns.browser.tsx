// Open /tests/dropdowns.html with the Vite dev server running.
// Exercises real native dialog/popover, form validation and React change events.
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import AppSelect from '../src/Components/AppSelect'
import '../src/index.css'
import '../src/Pages/QuotationsPage.css'

export function Fixture() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [supplier, setSupplier] = useState('')
  const [changes, setChanges] = useState(0)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} className="quotation-dialog p-6">
    <form id="test-form" onSubmit={(event) => event.preventDefault()} onChange={() => setChanges((n) => n + 1)}>
      <label className="quotes-field">Supplier<AppSelect name="supplier" aria-label="Supplier" searchable required value={supplier} onChange={(event) => setSupplier(event.target.value)}>
        <option value="">Select supplier</option><option value="island">Island Electronics</option><option value="lanka">Lanka Laptop Components</option><option value="metro">Metro Mobile Parts</option>
      </AppSelect></label>
      <label>Priority<AppSelect name="priority" aria-label="Priority" defaultValue="Normal"><option>Normal</option><option disabled>High</option><option>Urgent</option></AppSelect></label>
      <fieldset disabled><AppSelect aria-label="Disabled field"><option>Unavailable</option></AppSelect></fieldset>
      <button id="outside" type="button">Outside</button>
      <output id="selected">{supplier}</output><output id="changes">{changes}</output>
    </form>
  </dialog>
}
createRoot(document.getElementById('root')!).render(<Fixture />)

const wait = () => new Promise((resolve) => setTimeout(resolve, 60))
const get = (selector: string) => { const element = document.querySelector(selector); if (!element) throw new Error(`Missing ${selector}`); return element as HTMLElement }
const key = (element: HTMLElement, value: string) => element.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }))
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message) }
const type = (value: string) => { const input = get('input[role="combobox"]') as HTMLInputElement; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) }
const passed: string[] = []

async function run() {
  await wait(); await wait()
  const form = get('#test-form') as HTMLFormElement
  const supplier = get('button[aria-label="Supplier"]')
  assert(!form.checkValidity(), 'Required empty supplier must block submission')
  await wait()
  assert(document.activeElement === supplier, 'Invalid selection focuses visible control')
  passed.push('Required validation and focus')
  supplier.click(); await wait()
  assert(document.querySelector('[popover]:popover-open'), 'Popup should be in the top layer')
  assert(document.activeElement?.tagName === 'INPUT', 'Search should receive focus')
  type('lanka'); await wait()
  assert(document.querySelectorAll('[role="option"]').length === 1, 'Search filters supplier list')
  get('[role="option"]').click(); await wait()
  assert(get('#selected').textContent === 'lanka', 'Option click updates controlled React value')
  assert(!document.querySelector('[popover]:popover-open'), 'Option inside label must not reopen popup')
  assert(new FormData(form).get('supplier') === 'lanka', 'Native FormData contains chosen value')
  assert(form.checkValidity(), 'Selected supplier passes validation')
  assert(get('#changes').textContent === '1', 'Only selection, not search typing, marks parent form changed')
  passed.push('Search, label click, controlled change, FormData and dirty tracking')
  supplier.click(); await wait(); type('not-found'); await wait()
  assert(get('[role="status"]').textContent?.includes('No matching'), 'Empty search state')
  key(get('input[role="combobox"]'), 'Escape'); await wait()
  assert((get('dialog') as HTMLDialogElement).open, 'Escape closes dropdown, not enclosing modal')
  assert(get('#selected').textContent === 'lanka', 'Search cancellation preserves selected value')
  assert(document.activeElement === supplier, 'Escape restores trigger focus')
  passed.push('No-results state and Escape in modal')
  const priority = get('button[aria-label="Priority"]')
  priority.click(); await wait(); key(priority, 'ArrowDown'); await wait(); key(priority, 'Enter'); await wait()
  assert(new FormData(form).get('priority') === 'Urgent', 'Keyboard skips disabled option and updates uncontrolled field')
  passed.push('Keyboard navigation and disabled options')
  supplier.click(); await wait()
  get('#outside').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await wait()
  assert(!document.querySelector('[popover]:popover-open'), 'Outside pointer dismisses popup')
  get('button[aria-label="Disabled field"]').click(); await wait()
  assert(!document.querySelector('[popover]:popover-open'), 'Disabled fieldset cannot open dropdown')
  form.reset(); await wait()
  assert(new FormData(form).get('priority') === 'Normal', 'Form reset restores uncontrolled default')
  passed.push('Outside dismissal, fieldset disabled and form reset')
  // Leave a realistic open dropdown available for visual inspection.
  supplier.click(); await wait()
  const rect = get('[popover]').getBoundingClientRect()
  assert(rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight, 'Popup stays within viewport')
  passed.push('Viewport positioning')
}
run().then(() => { document.getElementById('results')!.textContent = `PASS: ${passed.length} groups\n${passed.join('\n')}`; document.body.dataset.testResult = 'pass' })
  .catch((error) => { document.getElementById('results')!.textContent = `FAIL: ${error.message}\n${passed.join('\n')}`; document.body.dataset.testResult = 'fail' })
