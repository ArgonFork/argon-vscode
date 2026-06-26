import type { ReflectionCatalog } from "../types";
import { effectiveDescriptor, resolvePropSpec } from "../utils/categorize";
import { PropertyInput } from "./inputs/PropertyInput";

interface Props {
  propKey: string;
  value: unknown;
  className: string;
  catalog: ReflectionCatalog | undefined;
  onChange: (key: string, value: unknown) => void;
}

export function PropertyRow({ propKey, value, className, catalog, onChange }: Props) {
  const desc = effectiveDescriptor(catalog, className, propKey);
  const spec = resolvePropSpec(value, desc);
  const locked = desc?.writable === false;
  const deprecated = desc?.deprecated ?? undefined;

  const nameTitle = deprecated
    ? `${propKey} - deprecated: ${deprecated}`
    : locked
    ? `${propKey} - read-only`
    : propKey;

  const input = (
    <PropertyInput
      propKey={propKey}
      value={value}
      spec={spec}
      catalog={catalog}
      onChange={onChange}
    />
  );

  return (
    <div className={`prop-row${deprecated ? " deprecated" : ""}`}>
      <div className="prop-name" title={nameTitle}>
        {deprecated && <span className="depr" title={deprecated}>⚠</span>}
        {locked && <span className="lock" title="read-only">🔒</span>}
        {propKey}
      </div>
      <div className="prop-val">
        {locked ? <div className="locked">{input}</div> : input}
      </div>
    </div>
  );
}
