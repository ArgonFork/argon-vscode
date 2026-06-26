import { useRef, useState } from "react";

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
}

export function TagsSection({ value, onChange }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(e.currentTarget.value);
      e.currentTarget.value = "";
    }
  };

  return (
    <div className="tags-section">
      <div className="cat-hdr" onClick={() => setCollapsed((c) => !c)}>
        <svg className={`chev ${collapsed ? "" : "open"}`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </svg>
        <span className="cat-name">Tags</span>
        <span className="cat-ct">{value.length}</span>
      </div>

      {!collapsed && (
        <div className="tags-body">
          <div className="tags-pills">
            {value.map((tag) => (
              <span key={tag} className="tag-pill">
                {tag}
                <button className="tag-del" onClick={() => removeTag(tag)}>×</button>
              </span>
            ))}
            <input
              ref={inputRef}
              className="tag-in"
              placeholder="Add tag…"
              onKeyDown={handleKey}
              onBlur={(e) => {
                if (e.target.value) { addTag(e.target.value); e.target.value = ""; }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
