import type { PropSpec, ReflectionCatalog } from "../../types";
import { BoolInput } from "./BoolInput";
import { Color3Input } from "./Color3Input";
import { EnumInput } from "./EnumInput";
import { NumberInput } from "./NumberInput";
import { StringInput } from "./StringInput";
import { VectorInput } from "./VectorInput";
import { CFrameInput } from "./CFrameInput";

interface Props {
  propKey: string;
  value: unknown;
  spec: PropSpec;
  catalog: ReflectionCatalog | undefined;
  onChange: (key: string, value: unknown) => void;
}

// Read from argon array format
function arr(v: unknown, i: number): number {
  return Array.isArray(v) ? (Number(v[i]) || 0) : 0;
}

// Write back to argon array format
function arrSet(
  propKey: string,
  value: unknown,
  defLen: number,
  onChange: Props["onChange"]
): (pk: string, fieldKey: string, n: number) => void {
  return (pk, fieldKey, n) => {
    const copy: number[] = Array.isArray(value)
      ? [...(value as number[])]
      : Array.from({ length: defLen }, () => 0);
    copy[Number(fieldKey)] = n;
    onChange(pk, copy);
  };
}

export function PropertyInput({ propKey, value, spec, catalog, onChange }: Props) {
  // Tags is always a string array
  if (propKey === "Tags" && Array.isArray(value)) {
    const tags = (value as unknown[]).filter((t): t is string => typeof t === "string");
    return (
      <span className="str-in" style={{ fontSize: "0.85em", opacity: 0.8 }}>
        {tags.join(", ") || "(none)"}
      </span>
    );
  }

  switch (spec.type) {
    case "boolean":
      return <BoolInput propKey={propKey} value={value} onChange={onChange} />;

    case "Color3":
      return <Color3Input propKey={propKey} value={value} onChange={onChange} />;

    case "Enum": {
      const enumType = spec.enumType ?? "";
      return (
        <EnumInput
          propKey={propKey}
          value={value}
          enumType={enumType}
          options={catalog?.enums?.[enumType] ?? []}
          onChange={onChange}
        />
      );
    }

    case "number":
      return <NumberInput propKey={propKey} value={value} onChange={onChange} />;

    case "string":
      return <StringInput propKey={propKey} value={value} variant="string" onChange={onChange} />;

    case "BrickColor":
      return <StringInput propKey={propKey} value={value} variant="brick" onChange={onChange} />;

    case "Ref":
      return <StringInput propKey={propKey} value={value} variant="ref" onChange={onChange} />;

    // Argon: [x, y, z]
    case "Vector3":
      return (
        <VectorInput
          propKey={propKey}
          fields={[
            { label: "X", fieldKey: "0", value: arr(value, 0) },
            { label: "Y", fieldKey: "1", value: arr(value, 1) },
            { label: "Z", fieldKey: "2", value: arr(value, 2) },
          ]}
          onChange={arrSet(propKey, value, 3, onChange)}
        />
      );

    // Argon: [x, y]
    case "Vector2":
      return (
        <VectorInput
          propKey={propKey}
          fields={[
            { label: "X", fieldKey: "0", value: arr(value, 0) },
            { label: "Y", fieldKey: "1", value: arr(value, 1) },
          ]}
          onChange={arrSet(propKey, value, 2, onChange)}
        />
      );

    // Argon: [scale, offset]
    case "UDim":
      return (
        <VectorInput
          propKey={propKey}
          fields={[
            { label: "Scale",  fieldKey: "0", value: arr(value, 0) },
            { label: "Offset", fieldKey: "1", value: arr(value, 1) },
          ]}
          onChange={arrSet(propKey, value, 2, onChange)}
        />
      );

    // Argon: [[xScale, xOffset], [yScale, yOffset]]
    case "UDim2": {
      const v = value as unknown[][];
      const xs = Array.isArray(v?.[0]) ? Number(v[0][0]) || 0 : 0;
      const xo = Array.isArray(v?.[0]) ? Number(v[0][1]) || 0 : 0;
      const ys = Array.isArray(v?.[1]) ? Number(v[1][0]) || 0 : 0;
      const yo = Array.isArray(v?.[1]) ? Number(v[1][1]) || 0 : 0;
      const udim2Change = (pk: string, fk: string, n: number) => {
        const cur = (Array.isArray(value) ? value : [[0, 0], [0, 0]]) as number[][];
        const next = cur.map((a) => Array.isArray(a) ? [...a] : [0, 0]) as number[][];
        const map: Record<string, [number, number]> = { "0": [0,0], "1": [0,1], "2": [1,0], "3": [1,1] };
        const [ri, ci] = map[fk] ?? [0, 0];
        next[ri][ci] = n;
        onChange(pk, next);
      };
      return (
        <VectorInput
          propKey={propKey}
          fields={[
            { label: "XS", fieldKey: "0", value: xs },
            { label: "XO", fieldKey: "1", value: xo },
            { label: "YS", fieldKey: "2", value: ys },
            { label: "YO", fieldKey: "3", value: yo },
          ]}
          onChange={udim2Change}
        />
      );
    }

    // Argon: [min, max]
    case "NumberRange":
      return (
        <VectorInput
          propKey={propKey}
          fields={[
            { label: "Min", fieldKey: "0", value: arr(value, 0) },
            { label: "Max", fieldKey: "1", value: arr(value, 1) },
          ]}
          onChange={arrSet(propKey, value, 2, onChange)}
        />
      );

    // Argon: [minX, minY, maxX, maxY]
    case "Rect":
      return (
        <VectorInput
          propKey={propKey}
          fields={[
            { label: "X0", fieldKey: "0", value: arr(value, 0) },
            { label: "Y0", fieldKey: "1", value: arr(value, 1) },
            { label: "X1", fieldKey: "2", value: arr(value, 2) },
            { label: "Y1", fieldKey: "3", value: arr(value, 3) },
          ]}
          onChange={arrSet(propKey, value, 4, onChange)}
        />
      );

    // Argon: flat [px,py,pz, R00..R22] 12-element array
    case "CFrame":
      return <CFrameInput propKey={propKey} value={value} onChange={onChange} />;

    // Without catalog: 3-element array — show as generic Vector3
    case "Array3":
      return (
        <VectorInput
          propKey={propKey}
          fields={[
            { label: "0", fieldKey: "0", value: arr(value, 0) },
            { label: "1", fieldKey: "1", value: arr(value, 1) },
            { label: "2", fieldKey: "2", value: arr(value, 2) },
          ]}
          onChange={arrSet(propKey, value, 3, onChange)}
        />
      );

    // Without catalog: 2-element array
    case "Array2":
      return (
        <VectorInput
          propKey={propKey}
          fields={[
            { label: "0", fieldKey: "0", value: arr(value, 0) },
            { label: "1", fieldKey: "1", value: arr(value, 1) },
          ]}
          onChange={arrSet(propKey, value, 2, onChange)}
        />
      );

    // Without catalog: 4-element array
    case "Array4":
      return (
        <VectorInput
          propKey={propKey}
          fields={[
            { label: "0", fieldKey: "0", value: arr(value, 0) },
            { label: "1", fieldKey: "1", value: arr(value, 1) },
            { label: "2", fieldKey: "2", value: arr(value, 2) },
            { label: "3", fieldKey: "3", value: arr(value, 3) },
          ]}
          onChange={arrSet(propKey, value, 4, onChange)}
        />
      );

    // Tags: string[]
    case "Tags": {
      const tags = Array.isArray(value) ? (value as string[]) : [];
      return (
        <span className="str-in" style={{ fontSize: "0.85em", opacity: 0.8 }}>
          {tags.join(", ") || "(none)"}
        </span>
      );
    }

    // FullyQualified { "TypeName": value } — read-only
    case "FullyQualified": {
      const fqKey = spec.fqKey ?? "?";
      const inner = value && typeof value === "object"
        ? (value as Record<string, unknown>)[fqKey]
        : value;
      return (
        <span className="str-in" style={{ opacity: 0.6, fontFamily: "monospace", fontSize: "0.85em" }}>
          {fqKey}: {String(inner ?? "")}
        </span>
      );
    }

    // AttributeMap { key: value, ... } — read-only JSON for now
    case "AttributeMap": {
      return (
        <span className="str-in" style={{ opacity: 0.6, fontFamily: "monospace", fontSize: "0.8em", whiteSpace: "pre-wrap" }}>
          {JSON.stringify(value, null, 1)}
        </span>
      );
    }

    default: {
      const display =
        value && typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
      return (
        <input
          className="str-in"
          type="text"
          defaultValue={display}
          onChange={(e) => {
            try {
              onChange(propKey, JSON.parse(e.target.value));
            } catch {
              onChange(propKey, e.target.value);
            }
          }}
        />
      );
    }
  }
}
