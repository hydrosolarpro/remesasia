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

export function FlagColombia({ width = 20, height = 14 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 30 20">
      <Rect x={0} y={0} width={30} height={10} fill="#FCD116" />
      <Rect x={0} y={10} width={30} height={5} fill="#003893" />
      <Rect x={0} y={15} width={30} height={5} fill="#CE1126" />
    </Svg>
  );
}

export function FlagChile({ width = 20, height = 14 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 30 20">
      <Rect x={0} y={0} width={30} height={10} fill="#FFFFFF" />
      <Rect x={0} y={10} width={30} height={10} fill="#D52B1E" />
      <Rect x={0} y={0} width={10} height={10} fill="#0039A6" />
      <Circle cx={5} cy={5} r={2.2} fill="#FFFFFF" />
    </Svg>
  );
}

/** "Otro país": un globo sencillo, ya que no tiene bandera propia. */
export function FlagOtroPais({ width = 20, height = 14 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 30 20">
      <Circle cx={15} cy={10} r={9} fill="#2563EB" />
      <Circle cx={15} cy={10} r={9} fill="none" stroke="#FFFFFF" strokeWidth={1} />
      <Rect x={6} y={9.5} width={18} height={1} fill="#FFFFFF" />
      <Rect x={14.5} y={1} width={1} height={18} fill="#FFFFFF" />
    </Svg>
  );
}

/** Bandera del país de RECEPCIÓN de un corredor ('PE-VE', 'CO-VE', 'CL-VE', 'OT-VE'). */
export function FlagCorredor({ id, width = 22, height = 15 }: { id: string; width?: number; height?: number }) {
  if (id === 'CO-VE') return <FlagColombia width={width} height={height} />;
  if (id === 'CL-VE') return <FlagChile width={width} height={height} />;
  if (id === 'OT-VE') return <FlagOtroPais width={width} height={height} />;
  return <FlagPeru width={width} height={height} />;
}
