import { Fragment, useRef } from "react";
import { cframeToOrientation, orientationToCframeRotation } from "../../utils/math";

interface Props {
  propKey: string;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

const IDENTITY: number[] = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];

function getComponents(value: unknown): number[] {
  // Argon format: flat [px,py,pz, R00..R22] array
  if (Array.isArray(value) && value.length === 12) return value.map(Number);
  return [...IDENTITY];
}

const LABELS = ["X", "Y", "Z"] as const;

export function CFrameInput({ propKey, value, onChange }: Props) {
  const components = getComponents(value);
  const [px, py, pz] = components;
  const [ox, oy, oz] = cframeToOrientation(components);

  const posRef = useRef([px, py, pz]);
  const rotRef = useRef([ox, oy, oz]);

  const emit = (pos: number[], rot: number[]) => {
    onChange(propKey, [...pos, ...orientationToCframeRotation(rot[0], rot[1], rot[2])]);
  };

  return (
    <div className="cframe">
      <div className="vec-row">
        <span className="vc" style={{ width: 22 }}>Pos</span>
        {LABELS.map((label, i) => (
          <Fragment key={label}>
            <input
              className="vi"
              type="number"
              defaultValue={[px, py, pz][i]}
              onChange={(e) => {
                posRef.current[i] = parseFloat(e.target.value) || 0;
                emit(posRef.current, rotRef.current);
              }}
            />
          </Fragment>
        ))}
      </div>
      <div className="vec-row">
        <span className="vc" style={{ width: 22 }}>Rot</span>
        {LABELS.map((label, i) => (
          <Fragment key={label}>
            <input
              className="vi"
              type="number"
              defaultValue={[ox, oy, oz][i]}
              onChange={(e) => {
                rotRef.current[i] = parseFloat(e.target.value) || 0;
                emit(posRef.current, rotRef.current);
              }}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
