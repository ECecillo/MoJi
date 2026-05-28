import { useMemo } from 'react';

export type GridType = 'tian' | 'mi' | 'hui' | 'none';

export interface CharacterGridProps {
  type: GridType;
  size: number;
  className?: string;
}

/**
 * CharacterGrid renders a calligraphic grid (田, 米, or 回) used for guiding character strokes.
 * Designed for e-ink: high contrast, minimal detail, dashed lines.
 */
export function CharacterGrid({ type, size, className = '' }: CharacterGridProps) {
  const mid = size / 2;
  const strokeColor = 'currentColor';
  const strokeWidth = 1;
  const dashArray = '4,4';

  const gridLines = useMemo(() => {
    if (type === 'none') return null;

    const lines = [];

    // Central cross (common to most types)
    if (type === 'tian' || type === 'mi' || type === 'hui') {
      lines.push(
        <line key="v-mid" x1={mid} y1={0} x2={mid} y2={size} />,
        <line key="h-mid" x1={0} y1={mid} x2={size} y2={mid} />,
      );
    }

    // Diagonals for Mi Zi Ge
    if (type === 'mi') {
      lines.push(
        <line key="d1" x1={0} y1={0} x2={size} y2={size} />,
        <line key="d2" x1={size} y1={0} x2={0} y2={size} />,
      );
    }

    // Inner square for Hui Zi Ge
    if (type === 'hui') {
      const margin = size * 0.25;
      const innerSize = size * 0.5;
      lines.push(
        <rect
          key="inner-rect"
          x={margin}
          y={margin}
          width={innerSize}
          height={innerSize}
          fill="none"
        />,
      );
    }

    return lines;
  }, [type, size, mid]);

  if (type === 'none') return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`pointer-events-none text-ink-faint ${className}`}
      aria-hidden="true"
    >
      <g stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={dashArray}>
        {gridLines}
      </g>
      {/* Outer border to ensure the grid square is well-defined */}
      <rect
        x={0.5}
        y={0.5}
        width={size - 1}
        height={size - 1}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
