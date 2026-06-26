import { Fragment } from "react";

export interface VectorField {
  label: string;
  fieldKey: string;
  value: number;
}

interface Props {
  propKey: string;
  fields: VectorField[];
  onChange: (propKey: string, fieldKey: string, value: number) => void;
}

export function VectorInput({ propKey, fields, onChange }: Props) {
  return (
    <div className="vec-row">
      {fields.map(({ label, fieldKey, value }) => (
        <Fragment key={label}>
          <span className="vc">{label}</span>
          <input
            className="vi"
            type="number"
            defaultValue={value}
            onChange={(e) => onChange(propKey, fieldKey, parseFloat(e.target.value) || 0)}
          />
        </Fragment>
      ))}
    </div>
  );
}
