import type { PropertyMap, ReflectionCatalog, PropDescriptor, PropSpec } from "../types";

const HIDDEN_PROPS = new Set(["UniqueId", "HistoryId"]);
// Always shown in dedicated sections, never in normal property categories
const SEPARATE_PROPS = new Set(["Attributes", "Tags"]);

export function effectiveDescriptor(
  catalog: ReflectionCatalog | undefined,
  className: string,
  key: string
): PropDescriptor | undefined {
  if (!catalog) return undefined;
  let current: string | undefined = className;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const override = catalog.overrides?.[current]?.[key];
    if (override) return override;
    current = catalog.superclasses?.[current];
  }
  return catalog.properties?.[key];
}

export function resolvePropSpec(
  value: unknown,
  desc?: PropDescriptor
): PropSpec {
  if (desc?.type && desc.type !== "unknown") {
    return { type: desc.type, enumType: desc.enumType ?? undefined };
  }
  if (typeof value === "boolean") return { type: "boolean" };
  if (typeof value === "number") return { type: "number" };
  if (typeof value === "string") return { type: "string" };

  // Argon array formats (AmbiguousValue)
  if (Array.isArray(value)) {
    if (value.length === 12) return { type: "CFrame" };
    if (value.length === 3) return { type: "Array3" };   // Color3 or Vector3 — need catalog to distinguish
    if (value.length === 2 && Array.isArray(value[0])) return { type: "UDim2" };
    if (value.length === 2) return { type: "Array2" };   // UDim / Vector2 / NumberRange
    if (value.length === 4) return { type: "Array4" };   // Rect
    return { type: "unknown" };
  }

  // Argon FullyQualified: single-key object like { "UniqueId": "..." } or { "Int32": 3 }
  if (value && typeof value === "object") {
    const keys = Object.keys(value as object);
    if (keys.length === 1) return { type: "FullyQualified", fqKey: keys[0] };
    // Attributes dict (multi-key object)
    return { type: "AttributeMap" };
  }

  return { type: "unknown" };
}

export function categorizeProps(
  className: string,
  props: PropertyMap,
  catalog: ReflectionCatalog | undefined
): Array<{ name: string; entries: [string, unknown][] }> {
  const allKeys = Object.keys(props).filter((k) => {
    if (HIDDEN_PROPS.has(k)) return false;
    if (SEPARATE_PROPS.has(k)) return false;
    return true;
  });

  if (!catalog) {
    return [{ name: "Data", entries: allKeys.map((k) => [k, props[k]]) }];
  }

  const order = catalog.classes?.[className] ?? [];
  const orderIndex = new Map<string, number>(order.map((p, i) => [p, i]));

  const byCategory = new Map<string, [string, unknown][]>();
  for (const key of allKeys) {
    const cat = effectiveDescriptor(catalog, className, key)?.category ?? "Other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push([key, props[key]]);
  }

  for (const entries of byCategory.values()) {
    entries.sort(([a], [b]) => {
      const ia = orderIndex.get(a) ?? Infinity;
      const ib = orderIndex.get(b) ?? Infinity;
      return ia - ib || a.localeCompare(b);
    });
  }

  const names = [...byCategory.keys()].sort(
    (a, b) => Number(a === "Other") - Number(b === "Other") || a.localeCompare(b)
  );
  return names.map((name) => ({ name, entries: byCategory.get(name)! }));
}
