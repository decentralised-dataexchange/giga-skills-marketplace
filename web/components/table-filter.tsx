// A compact filter Select rendered above a DataTable. Every dashboard table
// defaults to its active records; this is the one control that widens the
// view to archived, suspended, or historical rows.
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TableFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  /** Accessible name for the control, e.g. "Filter by status". */
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    // Base UI can emit null on close; only real selections propagate.
    <Select value={value} onValueChange={(v) => v && onChange(v as T)}>
      <SelectTrigger size="sm" className="w-40" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
