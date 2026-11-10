import React from 'react';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Path,
  Circle,
  Ellipse,
  Polygon,
  G,
} from 'react-native-svg';
import { THEME } from '../constants/theme';

export interface TrailSegment {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  status: 'completed' | 'active' | 'upcoming';
}

export interface ForestDecorSeed {
  y: number;
  avoidX: number;
  variant: number;
  allowTallTree?: boolean;
}

interface ForestMapCanvasProps {
  width: number;
  height: number;
  segments: TrailSegment[];
  decorSeeds: ForestDecorSeed[];
}

function buildCubicPath(seg: TrailSegment): string {
  const dy = seg.toY - seg.fromY;
  const cp = dy * 0.56;
  return `M ${seg.fromX} ${seg.fromY} C ${seg.fromX} ${seg.fromY + cp}, ${seg.toX} ${seg.toY - cp}, ${seg.toX} ${seg.toY}`;
}

const PineTree: React.FC<{ x: number; y: number; scale?: number; variant?: number }> = ({
  x,
  y,
  scale = 1,
  variant = 0,
}) => {
  const topColor = variant % 2 === 0 ? '#184A36' : '#154238';
  const midColor = variant % 2 === 0 ? '#113728' : '#0F322A';
  const baseColor = variant % 2 === 0 ? '#0C281D' : '#0B241E';

  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Soft ground shadow */}
      <Ellipse cx={0} cy={22} rx={17} ry={5.5} fill="#06100C" opacity={0.65} />
      {/* Wood trunk */}
      <Rect x={-3} y={10} width={6} height={13} rx={2} fill="#2B1F16" />
      {/* Bottom tier */}
      <Polygon points="0,-6 -18,14 18,14" fill={baseColor} />
      {/* Middle tier */}
      <Polygon points="0,-19 -14,2 14,2" fill={midColor} />
      {/* Top crown */}
      <Polygon points="0,-31 -10,-11 10,-11" fill={topColor} />
      {/* Subtle moonlight highlight edge */}
      <Polygon points="0,-31 -10,-11 0,-13" fill="#2A7557" opacity={0.35} />
    </G>
  );
};

const MossBoulder: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    <Ellipse cx={0} cy={6} rx={14} ry={5} fill="#060E0B" opacity={0.55} />
    <Path d="M -12 5 Q -13 -6 0 -7 Q 13 -6 12 5 Z" fill="#1C2C26" />
    <Path d="M -9 -2 Q 0 -9 9 -2 Q 3 1 -9 -2 Z" fill="#14533B" opacity={0.85} />
  </G>
);

export const ForestMapCanvas: React.FC<ForestMapCanvasProps> = ({
  width,
  height,
  segments,
  decorSeeds,
}) => {
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        {/* Multi-biome forest floor gradient from Trailhead down to Emerald Summit */}
        <SvgLinearGradient id="forestGroundGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#091612" />
          <Stop offset="0.28" stopColor="#0D221A" />
          <Stop offset="0.56" stopColor="#0A1E1E" />
          <Stop offset="0.82" stopColor="#0D1D17" />
          <Stop offset="1" stopColor="#08120F" />
        </SvgLinearGradient>

        {/* Subtle golden lantern/moonlight clearing shimmer */}
        <SvgLinearGradient id="completedRoadGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#34D399" />
          <Stop offset="1" stopColor="#10B981" />
        </SvgLinearGradient>
      </Defs>

      {/* Base Forest Terrain */}
      <Rect x={0} y={0} width={width} height={height} fill="url(#forestGroundGrad)" />

      {/* Subtle Biome Contour Hills across the map */}
      {decorSeeds.map((seed, idx) => {
        if (idx % 2 !== 0) return null;
        const hillY = seed.y;
        return (
          <Path
            key={`hill-${idx}`}
            d={`M 0 ${hillY} Q ${width * 0.35} ${hillY - 36} ${width * 0.68} ${hillY - 10} T ${width} ${hillY - 22} L ${width} ${hillY + 90} L 0 ${hillY + 90} Z`}
            fill={idx % 4 === 0 ? '#0D241B' : '#0B1D19'}
            opacity={0.42}
          />
        );
      })}

      {/* Wide Mossy Valley Clearing behind the trail */}
      {segments.map((seg, i) => (
        <Path
          key={`clearing-${i}`}
          d={buildCubicPath(seg)}
          stroke="#07120E"
          strokeWidth={76}
          strokeLinecap="round"
          strokeOpacity={0.55}
          fill="none"
        />
      ))}

      {/* Stylized Pine Trees, Moss Boulders & Fireflies placed strictly clear of the active path */}
      {decorSeeds.map((seed, idx) => {
        const isPathLeft = seed.avoidX < width * 0.5;
        const treeX = isPathLeft
          ? Math.min(width - 28, width * 0.84 - (idx % 2) * 14)
          : Math.max(28, width * 0.14 + (idx % 2) * 14);
        const outerEdgeX = isPathLeft ? 18 : width - 18;
        const fireflyX = isPathLeft ? treeX - 24 : treeX + 24;

        return (
          <G key={`decor-${idx}`}>
            {/* Primary Pine Cluster on open side (only in full row corridors) */}
            {seed.allowTallTree !== false && (
              <>
                <PineTree
                  x={treeX}
                  y={seed.y - 4}
                  scale={0.76 + (seed.variant % 2) * 0.1}
                  variant={seed.variant}
                />
                {idx % 2 === 0 && (
                  <PineTree
                    x={isPathLeft ? width - 20 : 20}
                    y={seed.y + 10}
                    scale={0.6}
                    variant={seed.variant + 1}
                  />
                )}
              </>
            )}

            {/* Outer margin compact tree */}
            {seed.allowTallTree !== false && idx % 3 === 1 && (
              <PineTree x={outerEdgeX} y={seed.y - 10} scale={0.56} variant={seed.variant} />
            )}

            {/* Mossy boulder */}
            {(idx % 2 === 1 || seed.allowTallTree === false) && (
              <MossBoulder
                x={isPathLeft ? width - 38 : 38}
                y={seed.y + 6}
                scale={0.82}
              />
            )}

            {/* Warm Golden & Emerald Forest Fireflies */}
            <G>
              <Circle
                cx={fireflyX}
                cy={seed.y - 10}
                r={7}
                fill={idx % 2 === 0 ? '#FBBF24' : '#34D399'}
                opacity={0.14}
              />
              <Circle
                cx={fireflyX}
                cy={seed.y - 10}
                r={2.2}
                fill={idx % 2 === 0 ? '#FDE68A' : '#6EE7B7'}
                opacity={0.9}
              />
              <Circle
                cx={isPathLeft ? 30 : width - 30}
                cy={seed.y + 4}
                r={1.6}
                fill="#FDE047"
                opacity={0.65}
              />
            </G>
          </G>
        );
      })}

      {/* Outer Dark Stone Trail Bank */}
      {segments.map((seg, i) => (
        <Path
          key={`bank-${i}`}
          d={buildCubicPath(seg)}
          stroke="#132920"
          strokeWidth={22}
          strokeLinecap="round"
          fill="none"
        />
      ))}

      {/* Inner Cobblestone Soil Bed */}
      {segments.map((seg, i) => (
        <Path
          key={`bed-${i}`}
          d={buildCubicPath(seg)}
          stroke="#1C392C"
          strokeWidth={13}
          strokeLinecap="round"
          fill="none"
        />
      ))}

      {/* Glowing Progress & Stepping-Stone Dashes along Trail */}
      {segments.map((seg, i) => {
        const d = buildCubicPath(seg);
        if (seg.status === 'completed') {
          return (
            <G key={`trail-${i}`}>
              <Path
                d={d}
                stroke={THEME.colors.accent}
                strokeWidth={7}
                strokeLinecap="round"
                fill="none"
                opacity={0.35}
              />
              <Path
                d={d}
                stroke="url(#completedRoadGrad)"
                strokeWidth={4}
                strokeLinecap="round"
                fill="none"
              />
            </G>
          );
        }

        if (seg.status === 'active') {
          return (
            <G key={`trail-${i}`}>
              <Path
                d={d}
                stroke={THEME.colors.gold}
                strokeWidth={5.5}
                strokeDasharray="8 9"
                strokeLinecap="round"
                fill="none"
                opacity={0.32}
              />
              <Path
                d={d}
                stroke="#FDE047"
                strokeWidth={3.5}
                strokeDasharray="8 9"
                strokeLinecap="round"
                fill="none"
              />
            </G>
          );
        }

        return (
          <Path
            key={`trail-${i}`}
            d={d}
            stroke="#325947"
            strokeWidth={3.5}
            strokeDasharray="6 9"
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
    </Svg>
  );
};
