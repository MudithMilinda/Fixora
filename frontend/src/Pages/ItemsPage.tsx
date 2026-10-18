import { useEffect, useState, type FormEvent } from "react";
import Sidebar from "../Components/Sidebar";
import Pagination from "../Components/Pagination";
import Toast from "../Components/Toast";
import AddItemModal from "../Components/AddItemModal";
import EditItemModal from "../Components/EditItemModal";
import DeleteItemModal from "../Components/DeleteItemModal";
import type { AuthUser } from "../types/auth";
import api, { getApiError } from "../api/axios";
type Item = {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    minimumStock: number;
    costPrice: number;
    sellingPrice: number;
};
export default function ItemsPage(p: {
    user: AuthUser;
    onGoDashboard: () => void;
    onOpenRepairs: () => void;
    onOpenHistory: () => void;
    onOpenProfile: () => void;
    onSignOut: () => void;
}) {
    const [items, setItems] = useState<Item[]>([]),
        [open, setOpen] = useState(false),
        [edit, setEdit] = useState<Item | null>(null),
        [pendingDelete, setPendingDelete] = useState<Item | null>(null),
        [search, setSearch] = useState(""),
        [toast, setToast] = useState<any>(null);
    const [page, setPage] = useState(1), [total, setTotal] = useState(0), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
    const load = async () => { setRevision(value => value + 1) };
    useEffect(() => {
        let cancelled = false; setLoading(true);
        const timer = window.setTimeout(() => { api.get('/items', { params: { page, search: search.trim() } }).then(({ data }) => { if (cancelled) return; const last = Math.max(1, Math.ceil(data.total / data.pageSize)); if (page > last) { setPage(last); return } setItems(data.items); setTotal(data.total) }).catch(error => { if (!cancelled) setToast({message:getApiError(error,'Unable to load items.'),tone:'error'}) }).finally(() => { if (!cancelled) setLoading(false) }) }, search ? 250 : 0);
        return () => { cancelled = true; window.clearTimeout(timer) };
    }, [page, search, revision]);
    const add = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
            await api.post("/items", {
                name: f.get("name"),
                sku: f.get("sku"),
                minimumStock: Number(f.get("minimumStock")),
                quantity: 0,
                costPrice: 0,
                sellingPrice: 0,
            });
            setOpen(false);
            await load();
        } catch (e) {
            setToast({
                message: getApiError(e, "Unable to add item."),
                tone: "error",
            });
        }
    };
    const save = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!edit) return;
        const f = new FormData(e.currentTarget);
        try {
            await api.patch(`/items/${edit.id}`, {
                name: f.get("name"),
                sku: f.get("sku"),
                minimumStock: Number(f.get("minimumStock")),
            });
            setEdit(null);
            await load();
        } catch (e) {
            setToast({
                message: getApiError(e, "Unable to update item."),
                tone: "error",
            });
        }
    };
    const del = async () => {
        if (!pendingDelete) return;
        try {
            await api.delete(`/items/${pendingDelete.id}`);
            setPendingDelete(null);
            await load();
        } catch (e) {
            setToast({ message: getApiError(e, "Unable to delete item."), tone: "error" });
        }
    };
    const filteredItems = items;
    return (
        <div className="flex h-dvh w-screen overflow-hidden bg-[#f4f4f5] font-sans text-[#262b3a]">
            {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
            <Sidebar
                user={p.user}
                activePage="items"
                onGoDashboard={p.onGoDashboard}
                onOpenRepairs={p.onOpenRepairs}
                onOpenHistory={p.onOpenHistory}
                onOpenProfile={p.onOpenProfile}
                onSignOut={p.onSignOut}
            />
            <main className="flex-1 overflow-y-auto bg-[#f5f5f7] p-6">
                <header className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#7a8090]">
                            Inventory
                        </p>
                        <h1 className="mt-2 text-3xl font-bold">Items</h1>
                        <p className="mt-1 text-sm text-[#747a89]">
                            Manage your standard parts and product catalog.
                        </p>
                    </div>
                    <button
                        className="h-11 rounded-xl bg-[#171719] px-4 text-sm font-semibold text-white"
                        onClick={() => setOpen(true)}
                    >
                        + Add item
                    </button>
                </header>
                <form className="mt-5 flex max-w-md items-center gap-2.5 rounded-xl border border-[#e9e9ee] bg-white px-3.5 py-2.5 text-sm text-[#878c99] shadow-sm" onSubmit={(e) => e.preventDefault()}>
                    <span aria-hidden="true">⌕</span>
                    <input className="min-w-0 flex-1 bg-transparent font-normal outline-none placeholder:text-[#9ca0aa]" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} placeholder="Search item or SKU…" aria-label="Search items" />
                </form>
                <section className="mt-6 rounded-[18px] border border-[#eceaf2] bg-white/75 p-5 shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[11px] uppercase text-[#777e8e]">
                            <tr>
                                <th>Item</th>
                                <th>SKU</th>
                                <th>Minimum stock</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((i) => (
                                <tr className="border-t border-[#f0f1f4]" key={i.id}>
                                    <td className="py-4 font-semibold">{i.name}</td>
                                    <td>{i.sku || "Not set"}</td>
                                    <td>{i.minimumStock}</td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                aria-label={`Edit ${i.name}`}
                                                title="Edit"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#dfe1e6] bg-white text-[#646b7a] transition hover:border-[#bfc4cd] hover:bg-[#f7f7f8] hover:text-[#262b3a]"
                                                onClick={() => setEdit(i)}
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="h-4 w-4"
                                                    aria-hidden="true"
                                                >
                                                    <path d="m15.5 5.5 3 3M4 20l4.5-1L19.3 8.2a2.12 2.12 0 0 0-3-3L5.5 16z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={`Delete ${i.name}`}
                                                title="Delete"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#dfe1e6] bg-white text-[#646b7a] transition hover:border-[#d7aaa6] hover:bg-[#fff5f4] hover:text-[#b64a42]"
                                                onClick={() => setPendingDelete(i)}
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="h-4 w-4"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Pagination page={page} total={total} disabled={loading} onPageChange={setPage} />
                </section>
                {open && <AddItemModal onClose={() => setOpen(false)} onSubmit={add} />}{" "}
                {edit && (
                    <EditItemModal
                        item={edit}
                        onClose={() => setEdit(null)}
                        onSubmit={save}
                    />
                )}
                {pendingDelete && (
                    <DeleteItemModal
                        name={pendingDelete.name}
                        onClose={() => setPendingDelete(null)}
                        onConfirm={del}
                    />
                )}
            </main>
        </div>
    );
}
