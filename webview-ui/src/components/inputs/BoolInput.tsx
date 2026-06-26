interface Props {
  propKey: string;
  value: unknown;
  onChange: (key: string, value: boolean) => void;
}

export function BoolInput({ propKey, value, onChange }: Props) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        defaultChecked={value === true}
        onChange={(e) => onChange(propKey, e.target.checked)}
      />
      <span className="track" />
    </label>
  );
}
