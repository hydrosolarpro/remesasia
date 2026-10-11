import React, { createContext, useContext, useState } from 'react';
import { Corredor, CorredorId, CORREDORES, CORREDOR_POR_DEFECTO } from '../data/corredores';

// Corredor que el visitante está mirando en la landing. Cambia la moneda, los
// textos y el simulador (no hay nada que guardar: es solo presentación).
interface Estado {
  corredor: Corredor;
  setCorredorId: (id: CorredorId) => void;
}

const Ctx = createContext<Estado>({
  corredor: CORREDORES[0],
  setCorredorId: () => {},
});

export const CorredorLandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [id, setId] = useState<CorredorId>(CORREDOR_POR_DEFECTO);
  const corredor = CORREDORES.find((c) => c.id === id) ?? CORREDORES[0];
  return <Ctx.Provider value={{ corredor, setCorredorId: setId }}>{children}</Ctx.Provider>;
};

export const useCorredorLanding = () => useContext(Ctx);
