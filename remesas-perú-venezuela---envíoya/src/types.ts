export interface ExchangeRateInfo {
  ratePENtoVES: number;
  lastUpdated: string;
  guaranteedMinutesRemaining: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  iconName: string;
  badge?: string;
  accountDetail?: string;
}

export interface VenezuelanBank {
  id: string;
  code: string;
  name: string;
}

export type OrderStatus =
  | 'payment_pending'
  | 'verifying'
  | 'processing_pago_movil'
  | 'telegram_notified'
  | 'completed';

export interface RemittanceOrder {
  id: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientDocument: string;
  recipientPhone: string;
  recipientBank: string;
  amountPEN: number;
  amountVES: number;
  exchangeRate: number;
  paymentMethod: string;
  status: OrderStatus;
  createdAt: string;
  telegramNotificationSent: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FeatureCardItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
}
