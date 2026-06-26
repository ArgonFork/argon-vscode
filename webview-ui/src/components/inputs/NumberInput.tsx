interface Props {
  propKey: string;
  value: unknown;
  onChange: (key: string, value: number) => void;
}

export function NumberInput({ propKey, value, onChange }: Props) {
  const n = typeof value === "number" ? value : parseFloat(String(value)) || 0;
  return (
    <input
      className="num-in"
      type="number"
      defaultValue={n}
      onChange={(e) => onChange(propKey, parseFloat(e.target.value) || 0)}
    />
  );
}
