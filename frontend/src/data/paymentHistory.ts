export type CompletedSaleLine = {
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
};

export type CompletedSale = {
  id: string;
  completedAt: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  discount: number;
  total: number;
  payments: { method: string; amount: number }[];
  lines: CompletedSaleLine[];
  repair?: {
    jobNumber: string;
    assetName: string;
    assetIdentifier: string | null;
    issue: string;
  };
};

export type RepairPaymentDraft = {
  customerName: string;
  customerPhone: string;
  repair: NonNullable<CompletedSale["repair"]>;
  lines: CompletedSaleLine[];
};

const storageKey = "fixora.completed-sales";
const repairDraftStorageKey = "fixora.repair-payment-draft";

export function getCompletedSales(): CompletedSale[] {
  try {
    const value = window.localStorage.getItem(storageKey);
    const sales = value ? JSON.parse(value) : [];
    return Array.isArray(sales) ? sales : [];
  } catch {
    return [];
  }
}

export function saveCompletedSale(sale: CompletedSale) {
  const sales = [sale, ...getCompletedSales()].slice(0, 200);
  window.localStorage.setItem(storageKey, JSON.stringify(sales));
}

export function saveRepairPaymentDraft(draft: RepairPaymentDraft) {
  window.localStorage.setItem(repairDraftStorageKey, JSON.stringify(draft));
}

export function takeRepairPaymentDraft(): RepairPaymentDraft | null {
  try {
    const value = window.localStorage.getItem(repairDraftStorageKey);
    window.localStorage.removeItem(repairDraftStorageKey);
    if (!value) return null;
    const draft = JSON.parse(value);
    if (!draft || !Array.isArray(draft.lines) || !draft.repair) return null;
    return draft as RepairPaymentDraft;
  } catch {
    return null;
  }
}
