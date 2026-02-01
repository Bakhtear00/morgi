export const TransactionType = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  EXPENSE: 'EXPENSE',
  DEATH: 'DEATH',
  CASH_IN: 'CASH_IN',
  CASH_OUT: 'CASH_OUT'
} as const;

export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

// --- প্রধান লেনদেনের ধরণ ---

export interface Purchase {
  id: string;
  type: string;
  pieces: number;
  kg: number;
  rate: number;
  total: number;
  date: string;
  is_credit?: boolean;
  created_at?: string;
}

export interface Sale {
  id: string;
  type: string;
  pieces: number;
  kg?: number;
  rate?: number;
  mortality: number;
  total: number;
  date: string;
  is_cash?: boolean;
  created_at?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  note: string;
  date: string;
}

// --- আর্থিক রেকর্ড ---

export interface DueRecord {
  id: string;
  customer_name: string;
  mobile?: string;
  address?: string;
  amount: number;
  paid: number;
  date: string;
}

export interface CashLog {
  id: string;
  type: 'OPENING' | 'ADD' | 'WITHDRAW';
  amount: number;
  date: string;
  note?: string;
  denominations?: { [key: string]: string }; 
}

// --- লট ম্যানেজমেন্ট ---

export interface LotArchive {
  id: string;
  type: string;
  total_purchase: number;
  total_sale: number;
  profit: number;
  date: string;
  purchaseIds?: string[];
  saleIds?: string[];
}

// --- অন্যান্য ---

export interface Denomination {
  note: number;
  count: number;
}