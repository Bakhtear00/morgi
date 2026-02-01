import { useState, useEffect, useCallback } from 'react';
import { DataService } from '../services/dataService';
import { Purchase, Sale, Expense, DueRecord, CashLog, LotArchive } from '../types';

interface AppData {
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  dues: DueRecord[];
  cashLogs: CashLog[];
  stock: { [key: string]: { pieces: number; kg: number; dead: number; } };
  resets: { [key: string]: string };
  lotHistory: LotArchive[];
}

export const useData = (isLoggedIn: boolean, isSettingUp: boolean) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AppData>({
    purchases: [], sales: [], expenses: [], dues: [], cashLogs: [],
    stock: {}, resets: {}, lotHistory: []
  });

  const fetchData = useCallback(async () => {
    if (!isLoggedIn || isSettingUp) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [purchases, sales, expenses, dues, cashLogs, lotHistory, resets] = await Promise.all([
        DataService.getPurchases(),
        DataService.getSales(),
        DataService.getExpenses(),
        DataService.getDues(),
        DataService.getCashLogs(),
        DataService.getLotHistory(),
        DataService.getResets()
      ]);

      const stock = DataService.calculateStock(purchases, sales, resets);
      
      setData({ purchases, sales, expenses, dues, cashLogs, stock, resets, lotHistory });
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, isSettingUp]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, loading, refresh: fetchData };
};