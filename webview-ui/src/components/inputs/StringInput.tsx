interface Props {
  propKey: string;
  value: unknown;
  variant: "string" | "brick" | "ref";
  onChange: (key: string, value: unknown) => void;
}

function resolveDisplay(value: unknown, variant: Props["variant"]): string {
  if (variant === "brick") {
    return value && typeof value === "object"
      ? String((value as Record<string, unknown>).name ?? "")
      : "";
  }
  if (variant === "ref") {
    return value && typeof value === "object"
      ? String((value as Record<string, unknown>).id ?? "")
      : "";
  }
  return typeof value === "string" ? value : String(value ?? "");
}

function wrapValue(raw: string, variant: Props["variant"]): unknown {
  if (variant === "brick") return { __type: "BrickColor", name: raw };
  if (variant === "ref") return raw ? { __type: "Ref", id: raw } : null;
  return raw;
}

export function StringInput({ propKey, value, variant, onChange }: Props) {
  return (
    <input
      className={`str-in${variant === "ref" ? " ref-in" : ""}`}
      type="text"
      defaultValue={resolveDisplay(value, variant)}
      placeholder={variant === "ref" ? "roplica id" : undefined}
      onChange={(e) => onChange(propKey, wrapValue(e.target.value, variant))}
    />
  );
}
