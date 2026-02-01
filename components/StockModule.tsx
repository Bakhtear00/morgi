import React, { useMemo } from 'react';
import { Package, History } from 'lucide-react';
import { POULTRY_TYPES } from '../constants.tsx';
import { Purchase, Sale, LotArchive } from '../types';

interface StockModuleProps {
  stock: { [key: string]: { pieces: number; kg: number; dead: number; } };
  purchases: Purchase[];
  sales: Sale[];
  resets: { [key: string]: string };
  lotHistory: LotArchive[];
}

const StockModule: React.FC<StockModuleProps> = ({ stock, purchases, sales, resets, lotHistory }) => {

  // Fix: Cast `Object.values` result to resolve TS error, as it can be inferred as `unknown[]`.
  const totalStockPieces = (Object.values(stock) as { pieces: number }[]).reduce((acc, curr) => acc + (curr.pieces || 0), 0);

  const currentLotsData = useMemo(() => {
    const data: { [key: string]: any } = {};
    POULTRY_TYPES.forEach(type => {
      const lastSaveTime = resets[type] ? new Date(resets[type]).getTime() : 0;

      const filterLogic = (item: Purchase | Sale) => {
        if (item.type !== type) return false;
        const itemTime = item.created_at ? new Date(item.created_at).getTime() : new Date(item.date).getTime();
        return itemTime > lastSaveTime;
      };

      const lotPurchases = purchases.filter(filterLogic);
      const lotSales = sales.filter(filterLogic);

      const buyAmount = lotPurchases.reduce((sum, p) => sum + p.total, 0);
      const sellAmount = lotSales.reduce((sum, s) => sum + s.total, 0);

      if (buyAmount > 0 || sellAmount > 0) {
        data[type] = {
          buyAmount,
          sellAmount,
          profit: sellAmount - buyAmount
        };
      }
    });
    return data;
  }, [purchases, sales, resets]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="bg-gradient-to-r from-green-600 to-teal-700 p-10 rounded-[2.5rem] text-white shadow-2xl flex justify-center items-center text-center border-b-8 border-teal-900">
        <div>
          <Package className="w-10 h-10 text-green-200 mb-4 mx-auto opacity-40" />
          <p className="text-green-100 text-xs font-black uppercase tracking-widest mb-1">দোকানের মোট মজুদ মুরগি</p>
          <p className="text-6xl font-black tracking-tight">{new Intl.NumberFormat('bn-BD').format(totalStockPieces)} <span className="text-xl font-normal opacity-70">টি</span></p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 px-4">
        <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
        <h3 className="text-lg font-black text-gray-700 uppercase tracking-tight">মুরগির ধরণ অনুযায়ী মজুদ ও লটের হিসাব</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {POULTRY_TYPES.map(type => {
          const s = stock[type] || { pieces: 0, kg: 0, dead: 0 };
          const currentLot = currentLotsData[type];
          const isProfit = currentLot?.profit >= 0;

          return (
            <div key={type} className="bg-white rounded-[2.5rem] p-6 shadow-sm border-2 border-gray-50 hover:border-green-300 hover:shadow-lg transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-2xl font-black text-gray-800">{type}</h4>
                  <div className="bg-gray-50 p-3 rounded-2xl group-hover:bg-green-50 transition-colors">
                     <Package className="w-6 h-6 text-gray-300 group-hover:text-green-500" />
                  </div>
                </div>
                <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">বর্তমানে আছে</p>
                    <p className={`text-5xl font-black ${s.pieces > 0 ? 'text-indigo-600' : 'text-orange-400'}`}>
                      {new Intl.NumberFormat('bn-BD').format(s.pieces)} <span className="text-lg font-bold">টি</span>
                    </p>
                </div>
              </div>
              
              {currentLot && (
                <div className="mt-6 pt-6 border-t-2 border-dashed border-gray-100 space-y-4">
                   <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">চলমান লটের হিসাব</h5>
                   <div className="flex justify-between text-sm">
                      <span className="font-bold text-gray-500">মোট ক্রয়:</span>
                      <span className="font-black text-emerald-600">৳{new Intl.NumberFormat('bn-BD').format(currentLot.buyAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-gray-500">মোট বিক্রয়:</span>
                      <span className="font-black text-blue-600">৳{new Intl.NumberFormat('bn-BD').format(currentLot.sellAmount)}</span>
                    </div>
                    <div className={`flex justify-between text-base p-3 rounded-xl ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
                      <span className="font-black text-gray-700">{isProfit ? 'লাভ' : 'লস'}:</span>
                      <span className={`font-black ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                        ৳{new Intl.NumberFormat('bn-BD').format(Math.abs(currentLot.profit))}
                      </span>
                    </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border-2 border-gray-50">
          <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
            <History className="w-5 h-5 text-indigo-500" /> সম্পন্ন হওয়া লট ইতিহাস
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black border-b">
                  <th className="px-4 py-4">মুরগির ধরণ</th>
                  <th className="px-4 py-4">শেষ হওয়ার তারিখ</th>
                  <th className="px-4 py-4 text-right">মোট ক্রয়</th>
                  <th className="px-4 py-4 text-right">মোট বিক্রয়</th>
                  <th className="px-4 py-4 text-right">লাভ/লস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lotHistory.length > 0 ? lotHistory.map((lot: LotArchive) => (
                  <tr key={lot.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-5 font-black text-gray-800">{lot.type}</td>
                    <td className="px-4 py-5 text-xs font-bold text-gray-500">{new Date(lot.date).toLocaleDateString('bn-BD')}</td>
                    <td className="px-4 py-5 text-right text-emerald-600 font-bold">৳{new Intl.NumberFormat('bn-BD').format(lot.total_purchase)}</td>
                    <td className="px-4 py-5 text-right text-blue-600 font-bold">৳{new Intl.NumberFormat('bn-BD').format(lot.total_sale)}</td>
                    <td className={`px-4 py-5 text-right font-black text-lg ${lot.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {lot.profit >= 0 ? '+' : '-'} ৳{new Intl.NumberFormat('bn-BD').format(Math.abs(lot.profit))}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-300 font-bold italic">এখনও কোনো লট সেভ করা হয়নি।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default StockModule;