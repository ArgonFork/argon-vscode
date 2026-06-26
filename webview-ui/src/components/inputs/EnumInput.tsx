interface Props {
  propKey: string;
  value: unknown;
  enumType: string;
  options: string[];
  onChange: (key: string, value: string) => void;
}

export function EnumInput({ propKey, value, options, onChange }: Props) {
  // Argon stores enums as plain strings
  const current = typeof value === "string" ? value : "";

  return (
    <select
      className="enum-sel"
      value={current}
      onChange={(e) => onChange(propKey, e.target.value)}
    >
      {!options.includes(current) && current && (
        <option value={current}>{current}</option>
      )}
      {options.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  );
}
