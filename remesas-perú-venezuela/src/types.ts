export interface ScreenshotItem {
  id: string;
  title: string;
  category: 'operador_peru' | 'operador_venezuela' | 'sesion_cliente';
  tag: string;
  badgeText: string;
  description: string;
  details: string[];
  mockData: {
    tasa?: number;
    montoSoles?: number;
    montoBolivares?: number;
    rentabilidad?: string;
    operacionesCount?: number;
    ganancia?: string;
    equipoPeru?: string;
    equipoVenezuela?: string;
    telegramUser?: string;
    bancoDestino?: string;
    metodoPago?: string;
  };
  keyFeatures: string[];
}

export interface ExchangeRateData {
  rateSolesToBs: number;
  rentabilidadPercent: number;
  lastUpdated: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  priceSoles: number;
  period: string;
  popular?: boolean;
  operadoresCount: number;
  features: string[];
  ctaText: string;
}
