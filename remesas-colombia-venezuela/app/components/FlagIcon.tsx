import Svg, { Rect, Circle } from 'react-native-svg';

// Banderas dibujadas en SVG (no emoji): los emoji de bandera 🇵🇪/🇻🇪 no se
// renderizan en Windows/Chrome (salen vacíos o como letras sueltas) — esto
// se ve igual en cualquier plataforma.

export function FlagPeru({ width = 20, height = 14 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 30 20">
      <Rect x={0} y={0} width={10} height={20} fill="#D91023" />
      <Rect x={10} y={0} width={10} height={20} fill="#FFFFFF" />
      <Rect x={20} y={0} width={10} height={20} fill="#D91023" />
    </Svg>
  );
}

export function FlagVenezuela({ width = 20, height = 14 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 30 20">
      <Rect x={0} y={0} width={30} height={6.67} fill="#FFCC00" />
      <Rect x={0} y={6.67} width={30} height={6.67} fill="#00247D" />
      <Rect x={0} y={13.34} width={30} height={6.66} fill="#CF142B" />
      {[-8, -5.5, -3, 0, 3, 5.5, 8].map((dx) => (
        <Circle key={dx} cx={15 + dx} cy={10} r={0.9} fill="#FFFFFF" />
      ))}
    </Svg>
  );
}
