import React from "react";
import Svg, { Circle, Ellipse, Rect, Polygon } from "react-native-svg";

/**
 * Draws a named shape for the behaviour module's shape-matching activity, so a
 * pre-reader compares shapes by sight instead of reading the word "Circle".
 * Names are matched case-insensitively against the task's `options` strings.
 */
export type ShapeName =
  | "Circle"
  | "Oval"
  | "Square"
  | "Rectangle"
  | "Triangle"
  | "Diamond"
  | "Pentagon"
  | "Hexagon"
  | "Star";

interface Props {
  shape: string;
  size?: number;
  color?: string;
  /** Solid fill (default) vs. outline only. */
  filled?: boolean;
}

/** Vertices of a regular n-gon inscribed in the padded box, first point at `startDeg`. */
function regularPolygon(sides: number, size: number, pad: number, startDeg: number): string {
  const r = size / 2 - pad;
  const c = size / 2;
  const start = (startDeg * Math.PI) / 180;
  return Array.from({ length: sides }, (_, i) => {
    const a = start + (i * 2 * Math.PI) / sides;
    return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
  }).join(" ");
}

function starPolygon(points: number, size: number, pad: number): string {
  const outer = size / 2 - pad;
  const inner = outer * 0.42;
  const c = size / 2;
  const start = -Math.PI / 2;
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = start + (i * Math.PI) / points;
    pts.push(`${c + r * Math.cos(a)},${c + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

export default function ShapeGlyph({ shape, size = 96, color = "#7C3AED", filled = true }: Props) {
  const s = size;
  const fill = filled ? color : "none";
  const stroke = color;
  const strokeWidth = filled ? 0 : Math.max(3, s * 0.07);
  const pad = strokeWidth / 2 + 2;
  const key = shape.trim().toLowerCase();

  let body: React.ReactNode;
  switch (key) {
    case "oval":
      body = (
        <Ellipse
          cx={s / 2} cy={s / 2} rx={s / 2 - pad} ry={s / 2 - pad - s * 0.14}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth}
        />
      );
      break;
    case "square":
      body = (
        <Rect
          x={pad} y={pad} width={s - pad * 2} height={s - pad * 2} rx={s * 0.06}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"
        />
      );
      break;
    case "rectangle":
      body = (
        <Rect
          x={pad} y={s * 0.22} width={s - pad * 2} height={s * 0.56} rx={s * 0.05}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"
        />
      );
      break;
    case "triangle":
      body = (
        <Polygon
          points={`${s / 2},${pad} ${s - pad},${s - pad} ${pad},${s - pad}`}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"
        />
      );
      break;
    case "diamond":
      body = (
        <Polygon
          points={`${s / 2},${pad} ${s - pad},${s / 2} ${s / 2},${s - pad} ${pad},${s / 2}`}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"
        />
      );
      break;
    case "pentagon":
      body = (
        <Polygon points={regularPolygon(5, s, pad, -90)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
      );
      break;
    case "hexagon":
      body = (
        <Polygon points={regularPolygon(6, s, pad, -90)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
      );
      break;
    case "star":
      body = (
        <Polygon points={starPolygon(5, s, pad)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
      );
      break;
    case "circle":
    default:
      body = (
        <Circle cx={s / 2} cy={s / 2} r={s / 2 - pad} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      );
      break;
  }

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      {body}
    </Svg>
  );
}
