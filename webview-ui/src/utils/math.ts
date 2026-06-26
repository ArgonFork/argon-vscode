export function color3ToHex(r: number, g: number, b: number): string {
  const h = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Roblox CFrame component order: [px,py,pz, R00,R01,R02,R10,R11,R12,R20,R21,R22]
// Returns orientation in degrees (Tait-Bryan YXZ, matches CFrame:ToOrientation())
export function cframeToOrientation(c: number[]): [number, number, number] {
  const r02 = c[5], r10 = c[6], r11 = c[7], r12 = c[8], r22 = c[11];
  const x = Math.asin(Math.max(-1, Math.min(1, -r12)));
  const y = Math.atan2(r02, r22);
  const z = Math.atan2(r10, r11);
  const deg = (v: number) => (v * 180) / Math.PI;
  return [deg(x), deg(y), deg(z)];
}

export function orientationToCframeRotation(ox: number, oy: number, oz: number): number[] {
  const d = Math.PI / 180;
  const x = ox * d, y = oy * d, z = oz * d;
  const cx = Math.cos(x), sx = Math.sin(x);
  const cy = Math.cos(y), sy = Math.sin(y);
  const cz = Math.cos(z), sz = Math.sin(z);
  return [
    cy * cz + sy * sx * sz,   -cy * sz + sy * sx * cz,  sy * cx,
    cx * sz,                   cx * cz,                  -sx,
    -sy * cz + cy * sx * sz,   sy * sz + cy * sx * cz,   cy * cx,
  ];
}
