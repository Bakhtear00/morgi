import React, { useState, useMemo } from 'react';
import { Plus, History, Trash2, Edit2, X, Calendar } from 'lucide-react';
import { POULTRY_TYPES, getLocalDateString } from '../constants.tsx';
import { DataService } from '../services/dataService';
import { Purchase } from '../types';
import HoldToDeleteButton from './HoldToDeleteButton';
import { useToast } from '../contexts/ToastContext';

// FIX: Removed useData hook and accept props from parent component.
interface PurchaseModuleProps {
  purchases: Purchase[];
  refresh: () => void;
}

const PurchaseModule: React.FC<PurchaseModuleProps> = ({ purchases, refresh }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const { addToast } = useToast();
  
  const initialFormState = {
    type: POULTRY_TYPES[0],
    pieces: '',
    kg: '',
    rate: '',
    date: getLocalDateString(),
    isCredit: false
  };
  const [formData, setFormData] = useState(initialFormState);

  const total = (Number(formData.kg) || 0) * (Number(formData.rate) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pieces || !formData.kg || !formData.rate) {
      addToast('সবগুলো ঘর পূরণ করুন!', 'error');
      return;
    }

    const purchaseData = {
      type: formData.type,
      pieces: Number(formData.pieces),
      kg: Number(formData.kg),
      rate: Number(formData.rate),
      total: total,
      date: formData.date,
      is_credit: formData.isCredit
    };

    try {
      if (editingId) {
        await DataService.updatePurchase(purchaseData, editingId);
        setEditingId(null);
        addToast('সংশোধন হয়েছে!', 'success');
      } else {
        const newPurchase = await DataService.addPurchase(purchaseData);
        if (newPurchase && !formData.isCredit) {
          await DataService.addCashLog({
            type: 'WITHDRAW',
            amount: total,
            date: formData.date,
            note: `মাল ক্রয়: ${formData.type} [ref:purchase:${newPurchase.id}]`
          });
          addToast('ক্রয় রেকর্ড সংরক্ষিত এবং ক্যাশ থেকে বিয়োগ হয়েছে!', 'success');
        } else {
          addToast('বাকিতে ক্রয় রেকর্ড সংরক্ষিত হয়েছে!', 'success');
        }
      }
      setFormData(initialFormState);
      refresh();
    } catch (error) {
      console.error("Failed to save purchase:", error);
    }
  };

  const filteredPurchases = useMemo(() => {
    if (!filterDate) return purchases;
    return purchases.filter(p => p.date.split('T')[0] === filterDate);
  }, [purchases, filterDate]);

  const handleEdit = (p: Purchase) => {
    setEditingId(p.id);
    setFormData({
      type: p.type,
      pieces: p.pieces.toString(),
      kg: p.kg.toString(),
      rate: p.rate.toString(),
      date: p.date.split('T')[0],
      isCredit: p.is_credit || false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDelete = async (id: string) => {
    try {
      await DataService.deletePurchase(id);
      addToast('ক্রয় হিসাব সফলভাবে মোছা হয়েছে!', 'success');
      if (editingId === id) {
        setEditingId(null);
        setFormData(initialFormState);
      }
      refresh();
    } catch (error) {
      console.error("Failed to delete purchase:", error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className={`bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border-2 ${editingId ? 'border-orange-500' : 'border-gray-100'} no-print`}>
        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
            {editingId ? <Edit2 className="w-7 h-7 text-orange-600" /> : <Plus className="w-7 h-7 text-green-600" />}
            {editingId ? 'ক্রয় রেকর্ড সংশোধন' : `নতুন ক্রয় (Purchase)`}
          </h2>
          {editingId && (
            <button onClick={() => { setEditingId(null); setFormData(initialFormState); }} className="text-red-500 font-black flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-xl">
              <X size={18} /> বাতিল
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="col-span-1">
            <label htmlFor="purchase-date" className="text-sm font-black text-gray-700 mb-1.5 block ml-1">তারিখ</label>
            <div className="relative">
              <input 
                id="purchase-date"
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
            <label htmlFor="purchase-type" className="text-sm font-black text-gray-700 mb-1.5 block ml-1">ধরণ</label>
            <select id="purchase-type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 font-bold text-lg outline-none focus:border-green-600 transition-all">
              {POULTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label htmlFor="purchase-pieces" className="text-sm font-black text-gray-700 mb-1.5 block ml-1">পিস</label>
            <input id="purchase-pieces" type="text" inputMode="numeric" pattern="[0-9]*" value={formData.pieces} onChange={(e) => setFormData({ ...formData, pieces: e.target.value })} className="w-full px-4 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 font-bold text-lg outline-none" placeholder="০" required />
          </div>
          <div className="col-span-1">
            <label htmlFor="purchase-kg" className="text-sm font-black text-gray-700 mb-1.5 block ml-1">ওজন (কেজি)</label>
            <input id="purchase-kg" type="text" inputMode="decimal" value={formData.kg} onChange={(e) => setFormData({ ...formData, kg: e.target.value })} className="w-full px-4 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 font-bold text-lg outline-none" placeholder="০.০০" required />
          </div>
          <div className="col-span-1">
            <label htmlFor="purchase-rate" className="text-sm font-black text-gray-700 mb-1.5 block ml-1">দর (রেট)</label>
            <input id="purchase-rate" type="text" inputMode="decimal" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} className="w-full px-4 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 font-bold text-lg outline-none" placeholder="০" required />
          </div>
          <div className="lg:col-span-1 flex items-center mt-2 lg:mt-7">
              <label className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50/50 border-2 border-gray-200 cursor-pointer w-full hover:border-orange-400 transition-all">
                  <input 
                      type="checkbox" 
                      checked={formData.isCredit}
                      onChange={(e) => setFormData({ ...formData, isCredit: e.target.checked })}
                      className="w-6 h-6 text-orange-600 border-gray-300 rounded-md focus:ring-orange-500"
                  />
                  <span className="font-black text-gray-800 text-xl select-none">বাকিতে কেনা</span>
              </label>
          </div>

          <div className="md:col-span-full lg:col-span-3 flex items-center bg-green-50/20 px-6 py-4 rounded-xl border-2 border-green-200 mt-2">
            <span className="text-xl font-black text-gray-800">মোট: <span className="text-green-700 ml-2 font-black text-3xl">৳ {total.toLocaleString('bn-BD')}</span></span>
          </div>
          <div className="md:col-span-full flex flex-col md:flex-row gap-4">
            <button type="submit" className={`flex-1 text-white py-5 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all ${editingId ? 'bg-orange-600' : 'bg-green-600'}`}>
              {editingId ? 'আপডেট সম্পন্ন করুন' : 'ক্রয় রেকর্ড জমা দিন'}
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
            <History className="w-6 h-6 text-green-600" /> ক্রয় তালিকা
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
                <th className="px-6 py-5 text-center">ওজন</th>
                <th className="px-6 py-5 text-right">রেট</th>
                <th className="px-6 py-5 text-right">মোট</th>
                <th className="px-6 py-4 text-center no-print">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="text-base hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-6 whitespace-nowrap text-gray-900 font-bold">{new Date(p.date).toLocaleDateString('bn-BD')}</td>
                  <td className="px-6 py-6 font-bold text-gray-700">
                    {p.type}
                    {p.is_credit && <span className="ml-2 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-black">বাকি</span>}
                  </td>
                  <td className="px-6 py-6 text-center font-black text-indigo-600">{p.pieces.toLocaleString('bn-BD')} টি</td>
                  <td className="px-6 py-6 text-center font-black text-blue-600">{p.kg.toLocaleString('bn-BD')} কেজি</td>
                  <td className="px-6 py-6 text-right text-gray-500 font-bold">৳{p.rate.toLocaleString('bn-BD')}</td>
                  <td className="px-6 py-6 text-right font-black text-green-700 text-2xl">৳{p.total.toLocaleString('bn-BD')}</td>
                  <td className="px-6 py-6 text-center no-print">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => handleEdit(p)} className="text-blue-500 p-2 bg-blue-50 rounded-lg hover:bg-blue-100"><Edit2 size={18} /></button>
                      <HoldToDeleteButton onDelete={() => handleDelete(p.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-400">
                    <p className="font-bold">{filterDate ? 'এই তারিখে কোনো তথ্য নেই' : 'এখনও কোনো ক্রয় রেকর্ড করা হয়নি।'}</p>
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

export default PurchaseModule;