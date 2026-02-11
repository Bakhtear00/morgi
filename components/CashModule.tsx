import React, { useState, useMemo } from 'react';
import { Wallet, PlusCircle, Calendar } from 'lucide-react';
import { DataService } from '../services/dataService';
import { CashLog } from '../types';
import { getLocalDateString } from '../constants.tsx';
import HoldToDeleteButton from './HoldToDeleteButton';
import { useToast } from '../contexts/ToastContext';

// FIX: Removed useData hook and accept props from parent component.
interface CashModuleProps {
  cashLogs: CashLog[];
  refresh: () => void;
}

const CashModule: React.FC<CashModuleProps> = ({ cashLogs, refresh }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'OPENING' | 'ADD' | 'WITHDRAW'>('ADD');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [filterDate, setFilterDate] = useState('');
  const { addToast } = useToast();

  const currentBalance = cashLogs.reduce((sum, log) => {
    if (log.type === 'WITHDRAW') return sum - log.amount;
    return sum + log.amount;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      addToast('সঠিক টাকার পরিমাণ লিখুন!', 'error');
      return;
    }
    
    const log: Omit<CashLog, 'id'> = {
      type,
      amount: Number(amount),
      date: date,
      note: note.trim() || (type === 'ADD' ? 'মালিক জমা' : type === 'WITHDRAW' ? 'মালিক উত্তোলন' : 'শুরু ক্যাশ')
    };
    
    try {
      await DataService.addCashLog(log);
      setAmount('');
      setNote('');
      addToast('হিসাব সফলভাবে জমা হয়েছে!', 'success');
      refresh();
    } catch (error) {
      console.error("Failed to add cash log:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await DataService.deleteCashLog(id);
      addToast('ক্যাশ এন্ট্রি সফলভাবে মোছা হয়েছে!', 'success');
      refresh();
    } catch (error) {
      console.error("Failed to delete cash log:", error);
    }
  };

  const filteredLogs = useMemo(() => {
    if (!filterDate) return cashLogs;
    return cashLogs.filter(log => log.date.split('T')[0] === filterDate);
  }, [cashLogs, filterDate]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-indigo-700 to-violet-800 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col items-center text-center border-b-8 border-indigo-900">
            <Wallet className="w-10 h-10 mb-4 opacity-40 text-indigo-200" />
            <span className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-1">মোট খাতা ব্যালেন্স (নগদ)</span>
            <h3 className="text-5xl font-black">৳ {currentBalance.toLocaleString('bn-BD')}</h3>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-gray-100">
            <h4 className="font-black text-gray-800 mb-6 flex items-center gap-2 text-xl border-b pb-4">
              <PlusCircle className="text-indigo-600 w-6 h-6" /> ক্যাশ এন্ট্রি করুন
            </h4>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label htmlFor="cash-date" className="text-xs font-black text-gray-600 uppercase ml-1">তারিখ</label>
                <div className="relative">
                  <input 
                    id="cash-date"
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="w-full px-4 py-4 rounded-2xl bg-blue-50/50 border-2 border-blue-200 text-blue-900 font-black text-lg outline-none cursor-pointer focus:border-blue-600 transition-all" 
                    required 
                  />
                  <Calendar size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="cash-type" className="text-xs font-black text-gray-600 uppercase ml-1">লেনদেনের ধরণ</label>
                <select 
                  id="cash-type"
                  value={type} 
                  onChange={(e) => setType(e.target.value as 'OPENING' | 'ADD' | 'WITHDRAW')} 
                  className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-gray-300 font-black text-gray-900 text-lg outline-none focus:border-indigo-600"
                >
                  <option value="ADD">মালিক জমা (+)</option>
                  <option value="WITHDRAW">মালিক উত্তোলন (-)</option>
                  <option value="OPENING">শুরু ক্যাশ</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="cash-amount" className="text-xs font-black text-gray-600 uppercase ml-1">টাকার পরিমাণ</label>
                <input 
                  id="cash-amount"
                  type="text" 
                  inputMode="decimal"
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  className="w-full p-5 rounded-2xl bg-white border-2 border-gray-300 font-black text-4xl text-gray-900 placeholder-gray-200 outline-none focus:border-indigo-600 shadow-inner" 
                  placeholder="০" 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="cash-note" className="text-xs font-black text-gray-600 uppercase ml-1">বিবরণ (নোট)</label>
                <input 
                  id="cash-note"
                  type="text" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-gray-300 font-bold text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-600" 
                  placeholder="যেমন: ঘর ভাড়া, ব্যক্তিগত কাজ" 
                />
              </div>

              <button 
                type="submit" 
                className={`w-full py-5 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all text-white border-b-4 ${
                  type === 'WITHDRAW' ? 'bg-red-600 border-red-900' : 'bg-indigo-600 border-indigo-900'
                }`}
              >
                হিসাব জমা দিন
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex flex-col gap-4">
              <h4 className="font-black text-gray-800 flex items-center gap-2 text-xl">
                 ক্যাশ খাতা (Ledger)
              </h4>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 no-print">
                <div className="relative w-full sm:w-auto">
                  <input 
                    type="date" 
                    value={filterDate} 
                    onChange={(e) => setFilterDate(e.target.value)} 
                    className="w-full sm:w-60 px-5 py-3 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-900 font-black text-lg outline-none cursor-pointer" 
                  />
                </div>
                {filterDate && <button onClick={() => setFilterDate('')} className="text-red-600 font-black px-3 py-1 bg-red-50 rounded-lg">ফিল্টার সরান</button>}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 text-gray-500 text-[10px] uppercase font-black tracking-wider border-b">
                  <tr>
                    <th className="px-6 py-4 text-left">তারিখ</th>
                    <th className="px-6 py-4 text-left">বিবরণ</th>
                    <th className="px-6 py-4 text-right">টাকা</th>
                    <th className="px-6 py-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap font-bold text-gray-600">{new Date(log.date).toLocaleDateString('bn-BD')}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className={`text-[9px] font-black uppercase mb-1 ${log.type === 'WITHDRAW' ? 'text-red-500' : 'text-green-600'}`}>
                            {log.type === 'OPENING' ? 'শুরু ক্যাশ' : log.type === 'ADD' ? 'জমা' : 'খরচ/উত্তোলন'}
                          </span>
                          <span className="text-base text-gray-900 font-black">
                            {log.note?.split(' [ref:')[0] || 'সাধারণ লেনদেন'}
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-5 text-right font-black text-2xl ${log.type === 'WITHDRAW' ? 'text-red-600' : 'text-green-700'}`}>
                        {log.type === 'WITHDRAW' ? '-' : '+'} ৳{log.amount.toLocaleString('bn-BD')}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <HoldToDeleteButton onDelete={() => handleDelete(log.id)} />
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-gray-400">
                        <p className="font-bold">{filterDate ? 'এই তারিখে কোনো লেনদেন নেই' : 'এখনও কোনো লেনদেন রেকর্ড করা হয়নি।'}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashModule;