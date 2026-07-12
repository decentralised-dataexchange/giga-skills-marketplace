"use client";

import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Searchable multi-select using the standard tokenizer/combobox pattern: chips
// live inline inside the input box so adding or clearing tags never shifts the
// surrounding fields. The label shows a live count.
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "Search…",
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const filtered = options
    .filter((o) => !selected.includes(o) && o.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  function add(o: string) {
    onChange([...selected, o]);
    setQuery("");
    inputRef.current?.focus();
  }
  function remove(o: string) {
    onChange(selected.filter((s) => s !== o));
  }

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-ink">
        {label}
        {selected.length > 0 && <span className="ml-1 text-muted-foreground tabular-nums">({selected.length})</span>}
      </span>

      <div className="relative">
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-white p-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40"
        >
          {selected.map((s) => (
            <span key={s} className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-brand-dark">
              {s}
              <button
                type="button"
                aria-label={`Remove ${s}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(s);
                }}
                className="rounded-full text-brand-dark/70 hover:text-brand-dark"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            value={query}
            placeholder={selected.length ? "" : placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length) {
                e.preventDefault();
                add(filtered[0]);
              } else if (e.key === "Backspace" && !query && selected.length) {
                remove(selected[selected.length - 1]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            className="min-w-[10ch] flex-1 bg-transparent px-1 py-0.5 text-base outline-none md:text-sm"
          />
        </div>

        {open && filtered.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-white py-1 shadow-md"
          >
            {filtered.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(o);
                  }}
                  className={cn("block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-accent")}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
