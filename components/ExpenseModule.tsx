import React, { useState, useMemo } from 'react';
import { CreditCard, History, Trash2, Calendar, X, Edit2 } from 'lucide-react';
import { EXPENSE_CATEGORIES, getLocalDateString } from '../constants.tsx';
import { DataService } from '../services/dataService';
import { Expense } from '../types';
import HoldToDeleteButton from './HoldToDeleteButton';
import { useToast } from '../contexts/ToastContext';

// FIX: Removed useData hook and accept props from parent component.
interface ExpenseModuleProps {
  expenses: Expense[];
  refresh: () => void;
}

const ExpenseModule: React.FC<ExpenseModuleProps> = ({ expenses, refresh }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const { addToast } = useToast();

  const initialFormState = {
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    note: '',
    date: getLocalDateString()
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) {
      addToast('টাকার পরিমাণ লিখুন।', 'error');
      return;
    }

    const expenseAmount = Number(formData.amount);
    const expenseData = {
      category: formData.category,
      amount: expenseAmount,
      note: formData.note,
      date: formData.date
    };

    try {
      if (editingId) {
        await DataService.updateExpense(expenseData, editingId);
        addToast('খরচ আপডেট হয়েছে!', 'success');
        setEditingId(null);
      } else {
        const newExpense = await DataService.addExpense(expenseData);
        if (newExpense) {
            await DataService.addCashLog({
              type: 'WITHDRAW',
              amount: expenseAmount,
              date: formData.date,
              note: `খরচ: ${formData.category}${formData.note ? ' - ' + formData.note : ''} [ref:expense:${newExpense.id}]`
            });
            addToast('খরচ সংরক্ষিত হয়েছে!', 'success');
        }
      }
      setFormData(initialFormState);
      refresh();
    } catch (error) {
      console.error("Failed to save expense:", error);
    }
  };
  
  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      note: expense.note,
      date: expense.date.split('T')[0]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDelete = async (id: string) => {
    try {
      await DataService.deleteExpense(id);
      addToast('খরচের হিসাব সফলভাবে মোছা হয়েছে!', 'success');
      if (editingId === id) {
        setEditingId(null);
        setFormData(initialFormState);
      }
      refresh();
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const filteredExpenses = useMemo(() => {
    if (!filterDate) return expenses;
    return expenses.filter(e => e.date.split('T')[0] === filterDate);
  }, [expenses, filterDate]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className={`bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border-2 ${editingId ? 'border-orange-500' : 'border-gray-100'} no-print`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            {editingId ? <Edit2 className="w-6 h-6 text-orange-600" /> : <CreditCard className="w-6 h-6 text-red-600" />}
            {editingId ? 'খরচ সংশোধন' : 'নতুন খরচ এন্ট্রি'}
          </h2>
          {editingId && (
            <button 
              onClick={() => { 
                setEditingId(null); 
                setFormData(initialFormState); 
              }} 
              className="text-red-500 font-black flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-xl"
            >
              <X size={18} /> বাতিল
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label htmlFor="expense-date" className="text-xs font-black text-gray-500 uppercase ml-1">তারিখ</label>
            <div className="relative">
              <input 
                id="expense-date"
                type="date" 
                value={formData.date} 
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                className="w-full px-4 py-4 rounded-xl bg-blue-50/50 border-2 border-blue-100 text-blue-700 font-black text-lg outline-none cursor-pointer" 
                required 
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="expense-category" className="text-xs font-black text-gray-500 uppercase ml-1">ধরণ</label>
            <select id="expense-category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 font-bold text-lg outline-none focus:border-red-500">
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="expense-amount" className="text-xs font-black text-gray-500 uppercase ml-1">টাকা</label>
            <input id="expense-amount" type="text" inputMode="decimal" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 font-black text-xl outline-none" placeholder="0" required />
          </div>
          <div className="space-y-1">
            <label htmlFor="expense-note" className="text-xs font-black text-gray-500 uppercase ml-1">নোট</label>
            <input id="expense-note" type="text" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="w-full px-4 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 font-medium outline-none" placeholder="বিবরণ" />
          </div>
          <div className="md:col-span-full pt-2 flex flex-col md:flex-row gap-4">
            <button type="submit" className={`flex-1 text-white py-5 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all ${editingId ? 'bg-orange-600' : 'bg-red-600'}`}>
              {editingId ? 'আপডেট সম্পন্ন করুন' : 'খরচ জমা দিন'}
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
        <div className="p-6 border-b border-gray-100 flex flex-col gap-4">
          <h3 className="font-black text-gray-800 flex items-center gap-2 text-xl">
            <History className="w-6 h-6 text-red-600" /> খরচের তালিকা
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
              <tr className="bg-gray-100/30 text-gray-400 text-[10px] uppercase font-black border-b border-gray-200">
                <th className="px-6 py-4">তারিখ</th>
                <th className="px-6 py-4">ধরণ</th>
                <th className="px-6 py-4">নোট</th>
                <th className="px-6 py-4 text-right">টাকা</th>
                <th className="px-6 py-4 text-center no-print">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="text-base hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5 font-bold text-gray-900">{new Date(e.date).toLocaleDateString('bn-BD')}</td>
                  <td className="px-6 py-5 font-black text-gray-800">{e.category}</td>
                  <td className="px-6 py-5 text-gray-500">{e.note || '-'}</td>
                  <td className="px-6 py-5 text-right font-black text-red-600 text-2xl">৳{e.amount.toLocaleString('bn-BD')}</td>
                  <td className="px-6 py-5 text-center no-print">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => handleEdit(e)} className="text-blue-500 p-2 bg-blue-50 rounded-lg hover:bg-blue-100"><Edit2 size={18} /></button>
                      <HoldToDeleteButton onDelete={() => handleDelete(e.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                    <p className="font-bold">{filterDate ? 'এই তারিখে কোনো খরচ নেই' : 'এখনও কোনো খরচ রেকর্ড করা হয়নি।'}</p>
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

export default ExpenseModule;