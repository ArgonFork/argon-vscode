import { useState } from "react";
import { PropertyInput } from "./inputs/PropertyInput";
import { resolvePropSpec } from "../utils/categorize";
import type { ReflectionCatalog } from "../types";

interface Props {
  value: Record<string, unknown>;
  className: string;
  catalog: ReflectionCatalog | undefined;
  onChange: (v: Record<string, unknown>) => void;
}

const ATTR_TYPES = [
  "String", "Boolean", "Number",
  "Color3", "Vector3", "Vector2",
  "BrickColor", "UDim", "UDim2", "NumberRange",
] as const;

const TYPE_DEFAULTS: Record<string, unknown> = {
  String: "",
  Boolean: false,
  Number: 0,
  BrickColor: "Medium stone grey",
  Color3: [0, 0, 0],
  Vector3: [0, 0, 0],
  Vector2: [0, 0],
  UDim: [0, 0],
  UDim2: [[0, 0], [0, 0]],
  NumberRange: [0, 0],
};

const TYPE_SPEC: Record<string, string> = {
  String: "string", Boolean: "boolean", Number: "number",
  BrickColor: "BrickColor", Color3: "Color3", Vector3: "Vector3",
  Vector2: "Vector2", UDim: "UDim", UDim2: "UDim2", NumberRange: "NumberRange",
};

function inferDisplayType(v: unknown): string {
  if (typeof v === "boolean") return "Boolean";
  if (typeof v === "number") return "Number";
  if (typeof v === "string") return "String";
  if (Array.isArray(v)) {
    if (v.length === 12) return "CFrame";
    if (v.length === 2 && Array.isArray(v[0])) return "UDim2";
    if (v.length === 4) return "Rect";
    if (v.length === 3) return "Color3"; // or Vector3; indeterminate
    if (v.length === 2) return "Vector2";
  }
  if (v && typeof v === "object") {
    const keys = Object.keys(v as object);
    if (keys.length === 1) return keys[0];
  }
  return "?";
}

export function AttributesSection({ value, className, catalog, onChange }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("String");

  const entries = Object.entries(value);

  const handleValChange = (key: string, v: unknown) => {
    onChange({ ...value, [key]: v });
  };

  const handleDelete = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  const confirmAdd = () => {
    const name = newName.trim();
    if (!name) return;
    onChange({ ...value, [name]: TYPE_DEFAULTS[newType] ?? "" });
    setNewName("");
    setAdding(false);
  };

  return (
    <div className="attr-section">
      <div className="cat-hdr" onClick={() => setCollapsed((c) => !c)}>
        <svg className={`chev ${collapsed ? "" : "open"}`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </svg>
        <span className="cat-name">Attributes</span>
        <span className="cat-ct">{entries.length}</span>
        <button
          className="attr-add-btn"
          title="Add attribute"
          onClick={(e) => { e.stopPropagation(); setAdding(true); setCollapsed(false); }}
        >+</button>
      </div>

      {!collapsed && (
        <div className="attr-body">
          {entries.map(([key, val]) => {
            const displayType = inferDisplayType(val);
            const specType = TYPE_SPEC[displayType] ?? "unknown";
            const spec = resolvePropSpec(val, { type: specType });
            return (
              <div key={key} className="attr-row">
                <span className="attr-key" title={key}>{key}</span>
                <span className="attr-type">{displayType}</span>
                <div className="attr-val">
                  <PropertyInput
                    propKey={key}
                    value={val}
                    spec={spec}
                    catalog={catalog}
                    onChange={(_, v) => handleValChange(key, v)}
                  />
                </div>
                <button className="attr-del" title="Delete" onClick={() => handleDelete(key)}>×</button>
              </div>
            );
          })}

          {adding && (
            <div className="attr-add-row">
              <input
                className="attr-name-in"
                placeholder="Name"
                value={newName}
                autoFocus
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAdd();
                  if (e.key === "Escape") setAdding(false);
                }}
              />
              <select
                className="attr-type-sel"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                {ATTR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="attr-confirm" onClick={confirmAdd}>✓</button>
              <button className="attr-del" onClick={() => setAdding(false)}>×</button>
            </div>
          )}

          {entries.length === 0 && !adding && (
            <div className="attr-empty">No attributes</div>
          )}
        </div>
      )}
    </div>
  );
}
