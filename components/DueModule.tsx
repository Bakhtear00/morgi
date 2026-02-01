import React, { useState, useMemo } from 'react';
import { Users, Plus, Trash2, X, Edit2, TrendingUp, Calendar, Search } from 'lucide-react';
import { DataService } from '../services/dataService';
import { DueRecord } from '../types';
import { getLocalDateString } from '../constants.tsx';
import HoldToDeleteButton from './HoldToDeleteButton';
import { useToast } from '../contexts/ToastContext';

// FIX: Removed useData hook and accept props from parent component.
interface DueModuleProps {
  dues: DueRecord[];
  refresh: () => void;
}

const DueModule: React.FC<DueModuleProps> = ({ dues, refresh }) => {
  const [filterDate, setFilterDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { addToast } = useToast();
  
  const initialFormState = {
    customer_name: '',
    mobile: '',
    address: '',
    amount: '',
    date: getLocalDateString()
  };
  const [formData, setFormData] = useState(initialFormState);

  const totalOutstanding = useMemo(() => {
    return dues.reduce((sum, due) => sum + (Number(due.amount || 0) - Number(due.paid || 0)), 0);
  }, [dues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(formData.amount);
    
    if (!formData.customer_name || isNaN(amountNum) || amountNum <= 0) {
      addToast('ক্রেতার নাম এবং সঠিক বাকির পরিমাণ লিখুন।', 'error');
      return;
    }

    const dueData = {
      customer_name: formData.customer_name,
      mobile: formData.mobile,
      address: formData.address,
      amount: amountNum,
      date: formData.date
    };

    try {
      if (editingId) {
        const existingDue = dues.find(d => d.id === editingId);
        if (existingDue) {
          await DataService.updateDue({ ...dueData, paid: existingDue.paid }, editingId);
          setEditingId(null);
          addToast('হিসাব আপডেট হয়েছে!', 'success');
        }
      } else {
        await DataService.addDue({ ...dueData, paid: 0 });
        await DataService.addCashLog({
          type: 'WITHDRAW',
          amount: amountNum,
          date: formData.date,
          note: `বাকি বিক্রয়: ${formData.customer_name}`
        });
        addToast('বাকি এন্ট্রি হয়েছে এবং ক্যাশ থেকে বিয়োগ করা হয়েছে!', 'success');
      }
      setFormData(initialFormState);
      refresh();
    } catch (error) {
      console.error("Failed to save due:", error);
    }
  };

  const handleEdit = (due: DueRecord) => {
    setEditingId(due.id);
    setFormData({
      customer_name: due.customer_name,
      mobile: due.mobile || '',
      address: due.address || '',
      amount: due.amount.toString(),
      date: due.date.split('T')[0]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePartialPayment = async (due: DueRecord) => {
    const amountToPay = Number(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      addToast('সঠিক টাকার পরিমাণ লিখুন!', 'error');
      return;
    }
    
    try {
      const updatedPaid = Number(due.paid || 0) + amountToPay;
      await DataService.updateDue({ paid: updatedPaid }, due.id);
      
      await DataService.addCashLog({
        type: 'ADD',
        amount: amountToPay,
        date: getLocalDateString(),
        note: `বাকি জমা: ${due.customer_name}`
      });

      setActivePaymentId(null);
      setPaymentAmount('');
      addToast('টাকা জমা নেওয়া হয়েছে এবং ক্যাশ বক্সে যোগ হয়েছে!', 'success');
      refresh();
    } catch (error) {
      console.error("Failed to process partial payment:", error);
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      await DataService.deleteDue(id);
      addToast('বাকি হিসাব সফলভাবে মোছা হয়েছে!', 'success');
      if (editingId === id) {
        setEditingId(null);
        setFormData(initialFormState);
      }
      refresh();
    } catch (error) {
      console.error("Failed to delete due:", error);
    }
  };

  const filteredDues = useMemo(() => {
    return dues.filter(due => {
      const matchesDate = filterDate ? due.date.split('T')[0] === filterDate : true;
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = searchTerm 
        ? due.customer_name.toLowerCase().includes(lowerSearchTerm) || (due.mobile && due.mobile.includes(searchTerm))
        : true;
      return matchesDate && matchesSearch;
    });
  }, [dues, filterDate, searchTerm]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <TrendingUp className="w-10 h-10 opacity-40" />
          <div>
            <p className="text-orange-100 text-xs font-black uppercase mb-1">মোট বাকি</p>
            <h2 className="text-4xl font-black">৳ {totalOutstanding.toLocaleString('bn-BD')}</h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{dues.length.toLocaleString('bn-BD')} জন</p>
        </div>
      </div>

      <div className={`bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border-2 ${editingId ? 'border-orange-500' : 'border-gray-100'} no-print transition-all`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Plus className="w-6 h-6 text-orange-600" /> {editingId ? 'বাকি হিসাব সংশোধন' : 'নতুন বাকি'}
          </h2>
          {editingId && <button onClick={() => { setEditingId(null); setFormData(initialFormState); }} className="text-red-500 font-bold"><X size={20} /></button>}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="space-y-1">
            <label htmlFor="due-date" className="text-xs font-black text-gray-500 uppercase">তারিখ</label>
            <div className="relative">
              <input 
                id="due-date"
                type="date" 
                value={formData.date} 
                onChange={(e) => setFormData({...formData, date: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 bg-blue-50/20 text-blue-700 font-bold outline-none cursor-pointer" 
                required 
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none w-4 h-4" />
            </div>
          </div>
          <InputGroup id="due-customer" label="ক্রেতা" value={formData.customer_name} onChange={(val: string) => setFormData({...formData, customer_name: val})} placeholder="নাম" />
          <InputGroup id="due-mobile" label="মোবাইল" value={formData.mobile} onChange={(val: string) => setFormData({...formData, mobile: val})} placeholder="নম্বর" required={false} />
          <InputGroup id="due-amount" label="বাকি টাকা" type="number" value={formData.amount} onChange={(val: string) => setFormData({...formData, amount: val})} placeholder="০" />
          
          <div className="lg:col-span-3 flex flex-col md:flex-row gap-4">
             <button type="submit" className={`flex-1 text-white py-4 rounded-xl font-black text-lg shadow-lg active:scale-95 transition-all ${editingId ? 'bg-orange-600' : 'bg-green-600'}`}>
                {editingId ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
             </button>
             {editingId && (
                <HoldToDeleteButton
                  onDelete={() => handleDelete(editingId)}
                  className="bg-red-600 text-white py-4 px-5 rounded-xl font-black text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 relative overflow-hidden select-none"
                >
                  <Trash2 size={20} />
                  <span>মুছুন</span>
                </HoldToDeleteButton>
             )}
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div className="flex flex-col gap-4 w-full">
            <h3 className="text-lg font-black text-gray-700 flex items-center gap-2">বাকি তালিকা</h3>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                <Search className="w-4 h-4 text-gray-400" />
                <input type="text" placeholder="খুঁজুন..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent outline-none text-xs font-bold w-24 text-gray-900" />
              </div>

              <div className="relative no-print">
                <input 
                  type="date" 
                  value={filterDate} 
                  onChange={(e) => setFilterDate(e.target.value)} 
                  className="px-3 py-1.5 rounded-xl border-2 border-blue-100 bg-blue-50 text-blue-700 font-black text-[10px] cursor-pointer outline-none" 
                />
                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none w-3 h-3" />
                {filterDate && (
                  <button onClick={() => setFilterDate('')} className="absolute -right-6 top-1/2 -translate-y-1/2 text-red-500">
                    <X size={14} strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredDues.map(due => {
            const remaining = due.amount - due.paid;
            return (
              <div key={due.id} className="bg-white rounded-[2rem] shadow-sm border-2 border-gray-100 p-6 hover:border-orange-200 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-black text-gray-800">{due.customer_name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold">{due.mobile || 'নম্বর নেই'}</p>
                    <p className="text-[9px] text-gray-400 mt-1">{new Date(due.date).toLocaleDateString('bn-BD')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-black">অবশিষ্ট বাকি</p>
                    <p className="text-2xl font-black text-orange-700">৳{remaining.toLocaleString('bn-BD')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setActivePaymentId(due.id)} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg active:scale-95 transition-all">টাকা জমা নিন</button>
                   <button onClick={() => handleEdit(due)} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-blue-500"><Edit2 size={16}/></button>
                   <HoldToDeleteButton onDelete={() => handleDelete(due.id)} />
                </div>
                {activePaymentId === due.id && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-2xl flex gap-2 animate-in slide-in-from-top-2">
                    <input 
                      type="text" 
                      inputMode="decimal"
                      value={paymentAmount} 
                      onChange={(e) => setPaymentAmount(e.target.value)} 
                      className="flex-1 p-3 border-2 border-blue-200 rounded-xl outline-none text-gray-900 font-black text-lg" 
                      placeholder="টাকার পরিমাণ" 
                      autoFocus 
                    />
                    <button onClick={() => handlePartialPayment(due)} className="bg-green-600 text-white px-6 rounded-xl font-black shadow-md">জমা</button>
                    <button onClick={() => setActivePaymentId(null)} className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400"><X size={18}/></button>
                  </div>
                )}
              </div>
            );
          })}
          {filteredDues.length === 0 && (
            <div className="lg:col-span-2 text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-gray-400">
              <p className="font-bold">{filterDate || searchTerm ? 'আপনার ফিল্টারে কোনো বাকি রেকর্ড নেই' : 'এখনও কোনো বাকি রেকর্ড করা হয়নি।'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InputGroup: React.FC<{id: string, label:string, value:string, onChange:(v:string)=>void, type?:string, placeholder?:string, required?:boolean}> = ({ id, label, value, onChange, type = "text", placeholder = "", required = true }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="text-xs font-black text-gray-500 uppercase ml-1">{label}</label>
    <input 
      id={id}
      type={type === 'number' ? 'text' : type}
      inputMode={type === 'number' ? 'decimal' : undefined}
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder} 
      className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50/50 outline-none focus:border-orange-500 font-bold text-gray-900 placeholder-gray-400" 
      required={required} 
    />
  </div>
);

export default DueModule;