import { color3ToHex } from "../../utils/math";

interface Props {
  propKey: string;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

function toRGB(value: unknown): [number, number, number] {
  // Argon: [r, g, b] array (0-1 range)
  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0]) || 0, Number(value[1]) || 0, Number(value[2]) || 0];
  }
  return [0, 0, 0];
}

export function Color3Input({ propKey, value, onChange }: Props) {
  const [r, g, b] = toRGB(value);
  const hex = color3ToHex(r, g, b);

  const handleChange = (h: string) => {
    onChange(propKey, [
      parseInt(h.slice(1, 3), 16) / 255,
      parseInt(h.slice(3, 5), 16) / 255,
      parseInt(h.slice(5, 7), 16) / 255,
    ]);
  };

  return (
    <div className="color-row">
      <input
        className="color-input"
        type="color"
        value={hex}
        onChange={(e) => handleChange(e.target.value)}
      />
      <span className="color-text">
        {r.toFixed(3)}, {g.toFixed(3)}, {b.toFixed(3)}
      </span>
    </div>
  );
}
