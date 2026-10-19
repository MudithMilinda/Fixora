import { useEffect, useRef, useState } from "react";
import AppSelect from "./AppSelect";

export type SaleWarrantyDraft = { count: number; unit: 'days' | 'months' | 'years'; numbers: string[] };

type CustomerDetails = {
  name: string;
  phone: string;
  warranties: SaleWarrantyDraft[];
};

export default function CompleteSaleModal({
  total,
  saving = false,
  error,
  onClose,
  onConfirm,
  initialCustomerName = "",
  initialCustomerPhone = "",
  items,
}: {
  total: string;
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (customer: CustomerDetails) => void;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  items: { name: string; sku: string | null; quantity: number }[];
}) {
  const [name, setName] = useState(initialCustomerName);
  const [phone, setPhone] = useState(initialCustomerPhone);
  const [warranties, setWarranties] = useState(() => items.map(() => ({ count: '0', unit: 'days' as 'days' | 'months' | 'years', numbers: '' })));
  const [validationError, setValidationError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = warranties.map(warranty => ({ count: Number(warranty.count), unit: warranty.unit, numbers: warranty.numbers.split(/\r?\n/).map(number => number.trim()).filter(Boolean) }));
    for (let i = 0; i < values.length; i++) {
      const { count, unit, numbers } = values[i], max = unit === 'days' ? 3650 : unit === 'months' ? 120 : 10;
      if (!Number.isInteger(count) || count < 0 || count > max || numbers.length > items[i].quantity || numbers.some(number => number.length > 120)) {
        setValidationError(`Check the warranty period and numbers for ${items[i].name}. Enter no more than one number per unit.`); return;
      }
    }
    setValidationError('');
    onConfirm({ name: name.trim(), phone: phone.trim(), warranties: values });
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[#101012]/45 p-4"
      onMouseDown={(event) => {
        if (!saving && event.currentTarget === event.target) onClose();
      }}
    >
      <form
        className="flex flex-col overflow-hidden rounded-[22px] border border-[#e7e7e9] bg-white shadow-[0_28px_80px_#0003]"
        style={{
          width: "min(500px, calc(100vw - 32px))",
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100dvh - 32px)",
        }}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-sale-title"
      >
        <header
          className="flex items-start justify-between gap-4 border-b border-[#eceef2]"
          style={{ padding: "26px 28px 22px" }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">
              {saving ? "Saving…" : "Complete sale"}
            </p>
            <h2
              id="complete-sale-title"
              className="mt-2 text-xl font-bold tracking-[-.02em] text-[#262b3a]"
            >
              Customer details
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[#747a89]">
              Add the customer information before finishing this sale.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-xl leading-none text-[#747a89] transition hover:bg-[#f2f3f5]"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto" style={{ padding: "24px 28px 28px" }}>
          <div className="flex items-center justify-between rounded-[12px] border border-[#e2e4e9] bg-[#f8f8fa] px-4 py-3.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#7a8090]">
                Amount received
              </p>
              <p className="mt-1 text-xs text-[#747a89]">Payment has been collected in full</p>
            </div>
            <strong className="text-base tabular-nums text-[#262b3a]">{total}</strong>
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {validationError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{validationError}</p>}
          <div className="grid gap-4">
          <label className="block text-xs font-semibold leading-4 text-[#596170]">
            Customer name <span className="font-normal text-[#949aa5]">(optional)</span>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-11 w-full rounded-[10px] border border-[#dfe2e7] bg-white px-3 text-sm font-normal text-[#262b3a] outline-none placeholder:text-[#a2a7b1] focus:border-[#171719] focus:ring-1 focus:ring-[#171719]"
              placeholder="Enter customer name"
              autoComplete="name"
            />
          </label>
          <label className="block text-xs font-semibold leading-4 text-[#596170]">
            Phone number <span className="font-normal text-[#949aa5]">(optional)</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-2 h-11 w-full rounded-[10px] border border-[#dfe2e7] bg-white px-3 text-sm font-normal text-[#262b3a] outline-none placeholder:text-[#a2a7b1] focus:border-[#171719] focus:ring-1 focus:ring-[#171719]"
              placeholder="Enter phone number"
              autoComplete="tel"
            />
          </label>
          </div>
          <section aria-label="Item warranties" className="space-y-2.5">
            <div><h3 className="text-sm font-semibold text-[#303540]">Item warranties</h3><p className="mt-1 text-xs leading-5 text-[#747a89]">Enter 0 for no warranty. Numbers are optional.</p></div>
            {items.map((item, index) => {
              const draft = warranties[index];
              const update = (patch: Partial<typeof draft>) => setWarranties(current => current.map((entry, i) => i === index ? { ...entry, ...patch } : entry));
              return <div key={index} className="rounded-xl border border-[#e7e7e9] bg-[#fafafb] p-3.5">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold leading-5 text-[#303540]">{item.name}</p>{item.sku && <p className="mt-0.5 break-all text-xs text-[#858b98]">{item.sku}</p>}</div><span className="shrink-0 rounded-md bg-[#edeef1] px-2 py-1 text-xs font-medium text-[#69717f]">Qty {item.quantity}</span></div>
                <div className="mt-3 grid grid-cols-2 items-start gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.5fr)]">
                  <label className="min-w-0 text-xs font-semibold text-[#596170]"><span className="block h-4">Period</span><input type="number" min="0" max={draft.unit === 'days' ? 3650 : draft.unit === 'months' ? 120 : 10} step="1" required value={draft.count} disabled={saving} onChange={event => update({ count: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe2e7] bg-white px-3 text-sm font-normal outline-none focus:border-[#ad6338] focus:ring-2 focus:ring-[#ad6338]/10" /></label>
                  <div className="min-w-0 text-xs font-semibold text-[#596170]"><span className="block h-4">Unit</span><AppSelect className="mt-1.5" aria-label={`Warranty unit for ${item.name}`} value={draft.unit} disabled={saving} onChange={event => update({ unit: event.target.value as typeof draft.unit })}><option value="days">Days</option><option value="months">Months</option><option value="years">Years</option></AppSelect></div>
                  <label className="col-span-2 min-w-0 text-xs font-semibold text-[#596170] sm:col-span-1"><span className="block h-4 truncate">Serial / warranty no.</span>{item.quantity === 1 ? <input value={draft.numbers} maxLength={120} disabled={saving} onChange={event => update({ numbers: event.target.value })} placeholder="Optional" className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe2e7] bg-white px-3 text-sm font-normal outline-none placeholder:text-[#a2a7b1] focus:border-[#ad6338] focus:ring-2 focus:ring-[#ad6338]/10" /> : <><textarea value={draft.numbers} disabled={saving} onChange={event => update({ numbers: event.target.value })} placeholder="One number per line" className="mt-1.5 min-h-11 w-full rounded-xl border border-[#dfe2e7] bg-white px-3 py-2 text-sm font-normal outline-none placeholder:text-[#a2a7b1] focus:border-[#ad6338] focus:ring-2 focus:ring-[#ad6338]/10" /><span className="mt-1 block font-normal text-[#747a89]">Up to {item.quantity} numbers, one per line.</span></>}</label>
                </div>
              </div>
            })}
          </section>
        </div>

        <footer
          className="flex justify-end gap-3 border-t border-[#eceef2] bg-[#fcfcfd]"
          style={{ padding: "16px 28px" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-[10px] border border-[#dfe2e7] bg-white px-4 text-xs font-semibold text-[#565d6c] transition hover:bg-[#f6f7f8]"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-[10px] bg-[#171719] px-4 text-xs font-semibold text-white transition hover:bg-[#2a2a2e]"
          >
            {saving ? "Saving…" : "Complete sale"}
          </button>
        </footer>
      </form>
    </div>
  );
}
