import { useState } from "react";
import type { ReflectionCatalog } from "../types";
import { PropertyRow } from "./PropertyRow";

interface Props {
  name: string;
  entries: [string, unknown][];
  className: string;
  catalog: ReflectionCatalog | undefined;
  onChange: (key: string, value: unknown) => void;
}

export function CategorySection({ name, entries, className, catalog, onChange }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="category">
      <div className="cat-hdr" onClick={() => setOpen((v) => !v)}>
        <svg className={`chev${open ? " open" : ""}`} viewBox="0 0 16 16">
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span className="cat-name">{name}</span>
        <span className="cat-ct">{entries.length}</span>
      </div>
      {open && (
        <div className="cat-body">
          {entries.map(([key, value]) => (
            <PropertyRow
              key={key}
              propKey={key}
              value={value}
              className={className}
              catalog={catalog}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
