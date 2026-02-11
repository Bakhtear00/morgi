import React, { useState, useMemo } from 'react';
import { ShoppingCart, History, Trash2, Edit2, X, Calendar } from 'lucide-react';
import { POULTRY_TYPES, getLocalDateString } from '../constants.tsx';
import { DataService } from '../services/dataService';
import { Sale } from '../types';
import HoldToDeleteButton from './HoldToDeleteButton';
import { useToast } from '../contexts/ToastContext';

// FIX: Removed useData hook and accept props from parent component.
interface SalesModuleProps {
  sales: Sale[];
  refresh: () => void;
}

const SalesModule: React.FC<SalesModuleProps> = ({ sales, refresh }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const { addToast } = useToast();
  // অংক করার জন্য এই ফাংশনটি যোগ করুন
const evaluateMath = (input: string): number => {
  try {
    // শুধুমাত্র সংখ্যা এবং + - * / . ছাড়া সব রিমুভ করে ক্যালকুলেট করবে
    const sanitized = input.replace(/[^-?\d/*+.]/g, '');
    return sanitized ? Function(`"use strict"; return (${sanitized})`)() : 0;
  } catch (e) {
    return 0;
  }
};
  const initialFormState = {
    type: POULTRY_TYPES[0],
    pieces: '',
    rate: '',
    total: '',
    mortality: '0',
    date: getLocalDateString()
  };
  
  const [formData, setFormData] = useState(initialFormState);

 
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // ১. ডুপ্লিকেট ক্লিক আটকানোর চেক
  if (isSubmitting) return;

  // টেক্সট ইনপুট থেকে অংকের রেজাল্ট বের করা (আপনার আগের ম্যাথ লজিক)
  const finalTotal = evaluateMath(formData.total);
  const finalPieces = evaluateMath(formData.pieces);

  if (finalTotal <= 0) {
    addToast('মোট বিক্রয়ের টাকার পরিমাণ সঠিকভাবে লিখুন!', 'error');
    return;
  }

  // ২. সাবমিশন শুরু (লক করা)
  setIsSubmitting(true);

  const saleData = {
    type: formData.type,
    pieces: finalPieces,
    rate: formData.rate ? Number(formData.rate) : 0,
    mortality: Number(formData.mortality) || 0,
    total: finalTotal,
    date: formData.date,
    created_at: new Date().toISOString()
  };

  try {
    if (editingId) {
      await DataService.updateSale(saleData, editingId);
      setEditingId(null);
      addToast('সংশোধন সম্পন্ন!', 'success');
    } else {
      const newSale = await DataService.addSale(saleData);
      if (newSale) {
        // ক্যাশ বক্সে অটোমেটিক যোগ হওয়া
        await DataService.addCashLog({
          type: 'ADD',
          amount: saleData.total,
          date: saleData.date,
          note: `বিক্রয় থেকে আয়: ${saleData.type} [ref:sale:${newSale.id}]`
        });
        addToast('হিসাব জমা হয়েছে এবং ক্যাশ বক্সে যোগ হয়েছে!', 'success');
      }
    }
    setFormData(initialFormState);
    refresh();
  } catch (error) {
    console.error("Failed to save sale:", error);
    addToast('সেভ করতে সমস্যা হয়েছে', 'error');
  } finally {
    // ৩. ৫ সেকেন্ড পর বাটন আবার কাজ করার জন্য খুলে যাবে
    setTimeout(() => {
      setIsSubmitting(false);
    }, 5000);
  }
};
const filteredSales = useMemo(() => {
  let result = filterDate 
    ? sales.filter(s => s.date.split('T')[0] === filterDate) 
    : [...sales];

  return result.sort((a, b) => {
    // আপনার টাইপ অনুযায়ী created_at ব্যবহার করা হয়েছে
    const timeA = a.created_at || a.date;
    const timeB = b.created_at || b.date;
    
    // নতুন এন্ট্রি উপরে রাখার জন্য comparison
    return timeB.localeCompare(timeA);
  });
}, [sales, filterDate]);

  const handleEdit = (s: Sale) => {
    setEditingId(s.id);
    setFormData({
      type: s.type,
      pieces: (s.pieces || 0).toString(),
      rate: s.rate ? s.rate.toString() : '',
      total: s.total.toString(),
      mortality: (s.mortality || 0).toString(),
      date: s.date.split('T')[0]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDelete = async (id: string) => {
    try {
      await DataService.deleteSale(id);
      addToast('বিক্রয় হিসাব সফলভাবে মোছা হয়েছে!', 'success');
      if (editingId === id) {
        setEditingId(null);
        setFormData(initialFormState);
      }
      refresh();
    } catch (error) {
      console.error("Failed to delete sale:", error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className={`bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border-2 ${editingId ? 'border-orange-500' : 'border-gray-100'} no-print`}>
        <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
            <ShoppingCart className={`w-7 h-7 ${editingId ? 'text-orange-600' : 'text-green-600'}`} />
            {editingId ? 'বিক্রয় সংশোধন' : `নতুন বেচা (নগদ + বাকি)`}
          </h2>
          {editingId && (
            <button onClick={() => { setEditingId(null); setFormData(initialFormState); }} className="text-red-500 font-black flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-xl">
              <X size={18} /> বাতিল
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="col-span-1">
            <label htmlFor="sale-date" className="text-sm font-black text-gray-700 mb-1.5 block ml-1">তারিখ</label>
            <div className="relative">
              <input 
                id="sale-date"
                type="date" 
                value={formData.date} 
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                className="w-full px-5 py-4 rounded-2xl bg-blue-50/50 border-2 border-blue-100 text-blue-700 font-black text-xl outline-none focus:border-blue-600 transition-all cursor-pointer" 
                required 
              />
              <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none w-6 h-6" />
            </div>
          </div>
          <div className="col-span-1">
            <label htmlFor="sale-type" className="text-sm font-black text-gray-700 mb-1.5 block ml-1">ধরণ</label>
            <select id="sale-type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 font-bold text-lg outline-none focus:border-green-600 transition-all">
              {POULTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label htmlFor="sale-pieces" className="text-sm font-black text-gray-700 mb-1.5 block ml-1">মোট পিস</label>
            <input id="sale-pieces" type="text"  value={formData.pieces} onChange={(e) => setFormData({ ...formData, pieces: e.target.value })} className="w-full px-4 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 font-bold text-lg outline-none" placeholder="০" />
          </div>
          <div className="col-span-1">
            <label htmlFor="sale-rate" className="text-sm font-black text-gray-700 mb-1.5 block ml-1">গড় দর (ঐচ্ছিক)</label>
            <input id="sale-rate" type="text" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} className="w-full px-4 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 font-bold text-lg outline-none" placeholder="০" />
          </div>
          <div className="col-span-1">
            <label htmlFor="sale-mortality" className="text-sm font-black text-red-600 mb-1.5 block ml-1">মোট মৃত্যু</label>
            <input id="sale-mortality" type="text"  value={formData.mortality} onChange={(e) => setFormData({ ...formData, mortality: e.target.value })} className="w-full px-4 py-4 rounded-xl bg-white border-2 border-red-200 text-gray-900 font-bold text-lg outline-none focus:border-red-600" placeholder="০" />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="sale-total" className="text-lg font-black text-green-700 mb-2 block ml-1">মোট বিক্রয় টাকা *</label>
            <input id="sale-total" type="text"  value={formData.total} onChange={(e) => setFormData({ ...formData, total: e.target.value })} className="w-full px-6 py-7 rounded-3xl bg-green-50/20 border-4 border-green-600 text-green-700 font-black text-5xl outline-none" placeholder="৳ ০" required />
          </div>
          <div className="md:col-span-full flex flex-col md:flex-row gap-4">
           <button 
  type="submit" 
  disabled={isSubmitting} // বাটন লক করবে
  className={`flex-1 text-white py-5 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all 
    ${isSubmitting ? 'bg-gray-400 cursor-not-allowed opacity-70' : (editingId ? 'bg-orange-600' : 'bg-green-600')}`}
>
  {isSubmitting ? 'অপেক্ষা করুন...' : (editingId ? 'আপডেট সম্পন্ন করুন' : 'হিসাব জমা দিন')}
</button>
            {editingId && (
              <HoldToDeleteButton
                onDelete={() => handleDelete(editingId)}
                className="bg-red-600 text-white py-5 px-6 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 relative overflow-hidden select-none"
              >
                <Trash2 size={22} />
                <span>মুছুন</span>
              </HoldToDeleteButton>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border-2 border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col gap-4">
          <h3 className="font-black text-gray-800 flex items-center gap-2 text-xl">
            <History className="w-6 h-6 text-green-600" /> বিক্রয় তালিকা
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 no-print">
            <div className="relative w-full sm:w-auto">
              <input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)} 
                className="w-full sm:w-64 px-5 py-3 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-700 font-black text-lg outline-none focus:border-blue-500 cursor-pointer" 
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none w-5 h-5" />
            </div>
            {filterDate && (
              <button onClick={() => setFilterDate('')} className="flex items-center gap-2 text-red-500 font-black bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100">
                <X size={18} strokeWidth={3} /> ফিল্টার সরান
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100/50 text-gray-500 text-xs uppercase font-black border-b border-gray-200">
                <th className="px-6 py-5">তারিখ</th>
                <th className="px-6 py-5">ধরণ</th>
                <th className="px-6 py-5 text-center">পিস</th>
                <th className="px-6 py-5 text-center">মৃত্যু</th>
                <th className="px-6 py-5 text-right">মোট টাকা</th>
                <th className="px-6 py-4 text-center no-print">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map((s) => (
                <tr key={s.id} className="text-base hover:bg-green-50/20 transition-colors">
                  <td className="px-6 py-6 whitespace-nowrap text-gray-900 font-bold">{new Date(s.date).toLocaleDateString('bn-BD')}</td>
                  <td className="px-6 py-6"><span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-xl font-black text-xs">{s.type}</span></td>
                  <td className="px-6 py-6 text-center font-black text-indigo-600">{s.pieces.toLocaleString('bn-BD')} টি</td>
                  <td className="px-6 py-6 text-center font-black text-red-500">{s.mortality.toLocaleString('bn-BD')} টি</td>
                  <td className="px-6 py-6 text-right font-black text-green-700 text-2xl">৳{s.total.toLocaleString('bn-BD')}</td>
                  <td className="px-6 py-6 text-center no-print">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => handleEdit(s)} className="text-blue-500 p-2 bg-blue-50 rounded-lg hover:bg-blue-100"><Edit2 size={18} /></button>
                      <HoldToDeleteButton onDelete={() => handleDelete(s.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400">
                    <p className="font-bold">{filterDate ? 'এই তারিখে কোনো তথ্য নেই' : 'এখনও কোনো বিক্রয় রেকর্ড করা হয়নি।'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesModule;