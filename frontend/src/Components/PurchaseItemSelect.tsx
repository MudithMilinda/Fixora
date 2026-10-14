import { useEffect, useId, useRef, useState, type RefObject } from "react";

type Item = { id: string; name: string; sku: string | null; quantity: number };

export default function PurchaseItemSelect({ items, value, onChange, inputRef, disabled }: {
  items: Item[];
  value: string;
  onChange: (id: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
}) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = items.find((item) => item.id === value);
  const results = items.filter((item) => `${item.name} ${item.sku || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const expanded = open && !disabled;
  const activeItem = results[activeIndex];

  useEffect(() => {
    if (expanded) containerRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, query, expanded]);

  function showOptions() {
    if (disabled) return;
    setQuery("");
    setActiveIndex(Math.max(0, items.findIndex((item) => item.id === value)));
    setOpen(true);
  }

  function choose(item: Item) {
    onChange(item.id);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div
      className="purchase-item-picker"
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <label htmlFor="purchase-item">Select item</label>
      <div className="purchase-item-picker-control">
        <input
          id="purchase-item"
          ref={inputRef}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={expanded && activeItem ? `${listId}-${activeItem.id}` : undefined}
          autoComplete="off"
          placeholder={expanded ? "Search by name or SKU…" : "Choose or search for an item…"}
          value={expanded ? query : selected ? `${selected.name}${selected.sku ? ` · ${selected.sku}` : ""}` : ""}
          disabled={disabled}
          onClick={() => { if (!expanded) showOptions(); }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
            onChange("");
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!expanded) showOptions();
              else setActiveIndex((current) => Math.max(0, Math.min(results.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
            } else if (event.key === "Enter" && expanded) {
              event.preventDefault();
              if (activeItem) choose(activeItem);
            } else if (event.key === "Escape" && expanded) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              setQuery("");
            } else if (event.key === "Tab") {
              setOpen(false);
              setQuery("");
            }
          }}
        />
        <button
          type="button" className="purchase-item-picker-toggle" tabIndex={-1}
          aria-label={expanded ? "Close item options" : "Show item options"}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { if (expanded) setOpen(false); else showOptions(); inputRef.current?.focus(); }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={expanded ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} /></svg>
        </button>
      </div>
      {expanded && (
        <div className="purchase-item-picker-menu">
          <div className="purchase-item-picker-hint" role="status">{results.length} {results.length === 1 ? "item" : "items"} found</div>
          <ul id={listId} role="listbox" aria-label="Available items">
            {results.map((item, index) => (
              <li
                id={`${listId}-${item.id}`} key={item.id} role="option"
                aria-selected={item.id === value} data-active={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <span className="purchase-item-picker-details"><strong>{item.name}</strong><span>{item.sku || "No SKU"}</span></span>
                <span className="purchase-item-picker-stock">Stock {item.quantity}</span>
                {item.id === value && <span aria-hidden="true">✓</span>}
              </li>
            ))}
          </ul>
          {!results.length && <p className="purchase-item-picker-empty">No matching items. Try another name or SKU.</p>}
        </div>
      )}
    </div>
  );
}
