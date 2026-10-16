import { useEffect, useRef, useState } from "react";

type CustomerDetails = {
  name: string;
  phone: string;
};

export default function CompleteSaleModal({
  total,
  onClose,
  onConfirm,
  initialCustomerName = "",
  initialCustomerPhone = "",
}: {
  total: string;
  onClose: () => void;
  onConfirm: (customer: CustomerDetails) => void;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
}) {
  const [name, setName] = useState(initialCustomerName);
  const [phone, setPhone] = useState(initialCustomerPhone);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm({ name: name.trim(), phone: phone.trim() });
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[#101012]/45 p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <form
        className="overflow-hidden rounded-[22px] border border-[#e7e7e9] bg-white shadow-[0_28px_80px_#0003]"
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
              Complete sale
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
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-xl leading-none text-[#747a89] transition hover:bg-[#f2f3f5]"
          >
            ×
          </button>
        </header>

        <div className="space-y-5" style={{ padding: "24px 28px 28px" }}>
          <div className="flex items-center justify-between rounded-[12px] border border-[#e2e4e9] bg-[#f8f8fa] px-4 py-3.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#7a8090]">
                Amount received
              </p>
              <p className="mt-1 text-xs text-[#747a89]">Payment has been collected in full</p>
            </div>
            <strong className="text-base tabular-nums text-[#262b3a]">{total}</strong>
          </div>
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
        </div>

        <footer
          className="flex justify-end gap-3 border-t border-[#eceef2] bg-[#fcfcfd]"
          style={{ padding: "16px 28px" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[10px] border border-[#dfe2e7] bg-white px-4 text-xs font-semibold text-[#565d6c] transition hover:bg-[#f6f7f8]"
          >
            Back
          </button>
          <button
            type="submit"
            className="h-10 rounded-[10px] bg-[#171719] px-4 text-xs font-semibold text-white transition hover:bg-[#2a2a2e]"
          >
            Complete sale
          </button>
        </footer>
      </form>
    </div>
  );
}
