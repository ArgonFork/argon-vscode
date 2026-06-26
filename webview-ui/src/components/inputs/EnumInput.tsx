import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";

interface Props {
  propKey: string;
  value: unknown;
  enumType: string;
  options: string[];
  onChange: (key: string, value: { __type: "Enum"; enumType: string; name: string }) => void;
}

export function EnumInput({ propKey, value, enumType, options, onChange }: Props) {
  const currentName =
    value && typeof value === "object"
      ? String((value as Record<string, unknown>).name ?? "")
      : "";

  const handleChange = (e: React.FormEvent<HTMLElement>) => {
    const name = (e.target as HTMLSelectElement).value;
    onChange(propKey, { __type: "Enum", enumType, name });
  };

  return (
    <VSCodeDropdown value={currentName} onChange={handleChange}>
      {options.map((name) => (
        <VSCodeOption key={name} value={name}>
          {name}
        </VSCodeOption>
      ))}
    </VSCodeDropdown>
  );
}
