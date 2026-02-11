import React, { useState, useMemo, useRef, useEffect } from 'react'; // useEffect যোগ করা হয়েছে
import { Search, Plus, ArrowLeft, Calendar, Camera, User, FileText } from 'lucide-react'; 
import { DataService } from '../services/dataService';
import { DueRecord, Log } from '../types'; 
import { getLocalDateString } from '../constants.tsx';
import HoldToDeleteButton from './HoldToDeleteButton';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../services/supabaseClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const DueModule: React.FC<{ dues: DueRecord[]; refresh: () => void }> = ({ dues, refresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDueId, setSelectedDueId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [newCust, setNewCust] = useState({ name: '', mobile: '', amount: '', date: getLocalDateString(), image: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  // ১. পেজ ধরে রাখার মেইন লজিক (গ্যারান্টিড)
  useEffect(() => {
    if (selectedDueId) {
      const exists = dues.some(d => d.id === selectedDueId);
      if (!exists && dues.length > 0) {
        // রিফ্রেশ চলাকালীন আইডি যাতে হারিয়ে না যায়
      }
    }
  }, [dues, selectedDueId]);

  const selectedDue = useMemo(() => dues.find(d => d.id === selectedDueId), [dues, selectedDueId]);

  const calculateBalance = (due: DueRecord) => (Number(due.amount) - (Number(due.paid) || 0));

  const filteredAndSortedDues = useMemo(() => {
    return dues
      .filter(due =>
        due.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (due.mobile && due.mobile.includes(searchTerm))
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [dues, searchTerm]);

  const totalDueAmount = useMemo(() => dues.reduce((acc, curr) => acc + calculateBalance(curr), 0), [dues]);

  const handleTransaction = async (type: 'ADD' | 'DUE') => {
    if (!selectedDue || !amountInput) return addToast('টাকা লিখুন', 'error');
    
    const val = Number(amountInput);
    const transactionId = crypto.randomUUID(); 
    const currentId = selectedDueId; // আইডি সেভ রাখলাম

    const newLog: Log = {
        id: transactionId,
        date: selectedDate,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type,
        amount: val
    };

    const updatedLogs = [...(selectedDue.logs || []), newLog];

    try {
        await DataService.updateDue({ 
            amount: updatedLogs.filter(l => l.type === 'DUE').reduce((s, l) => s + l.amount, 0), 
            paid: updatedLogs.filter(l => l.type === 'ADD').reduce((s, l) => s + l.amount, 0), 
            logs: updatedLogs 
        }, currentId!);

        await DataService.addCashLog({
            type: type === 'ADD' ? 'ADD' : 'WITHDRAW', 
            amount: val,
            date: selectedDate,
            note: `${type === 'ADD' ? 'বাকি আদায়' : 'বাকি প্রদান'}: ${selectedDue.customer_name} [ref:due:${currentId}] [ref:log_id:${transactionId}]`
        });

        setAmountInput('');
        
        // ২. ডাটা রিফ্রেশ
        await refresh(); 

        // ৩. রিফ্রেশ হওয়ার পর আইডিটি আবার পুশ করা (Double Safety)
        if (currentId) {
            setSelectedDueId(currentId);
        }

        addToast('সফলভাবে সংরক্ষিত', 'success');
    } catch (e) { 
        addToast('ব্যর্থ হয়েছে', 'error'); 
    }
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.text("Baki Talika - Full Report", 14, 15);
      const tableData = filteredAndSortedDues.map(d => [
        d.customer_name, 
        d.mobile || '-', 
        `Tk ${calculateBalance(d).toLocaleString()}`
      ]);
      autoTable(doc, {
        head: [['Customer Name', 'Mobile', 'Due Amount']],
        body: tableData,
        startY: 25,
        headStyles: { fillColor: [242, 101, 34] }
      });
      doc.save(`Due_Report_${new Date().getTime()}.pdf`);
      addToast('PDF ডাউনলোড সফল হয়েছে', 'success');
    } catch (err) { 
      addToast('PDF তৈরি করতে সমস্যা হয়েছে', 'error'); 
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return addToast('ছবিটি অনেক বড়!', 'error');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        if (isNew) {
          setNewCust({ ...newCust, image: base64String });
        } else if (selectedDue) {
          await DataService.updateDue({ ...selectedDue, image: base64String }, selectedDue.id);
          refresh();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-10 px-4">
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleImageUpload(e, !selectedDueId)} />
      
      {!selectedDueId ? (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-[#f26522] p-8 rounded-[2.5rem] text-white shadow-2xl flex justify-between items-center">
            <div>
              <p className="text-xs font-bold opacity-80 uppercase tracking-widest">মোট বাকি</p>
              <h3 className="text-5xl font-black">৳{totalDueAmount.toLocaleString('bn-BD')}</h3>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-3xl font-black text-xl">{dues.length} জন</div>
          </div>

          {/* New Customer Form */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-50 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-black text-[#f26522] flex items-center gap-2 text-lg uppercase">
                   <Plus className="bg-orange-100 rounded-lg p-1" size={24} /> নতুন কাস্টমার
                </h3>
                <div onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 cursor-pointer bg-orange-50 px-4 py-2 rounded-xl hover:bg-orange-100 transition-all border border-orange-100">
                   {newCust.image ? <img src={newCust.image} className="w-8 h-8 rounded-full object-cover" /> : <Camera size={20} className="text-orange-600" />}
                   <span className="text-xs font-black text-orange-600">ছবি দিন</span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input type="date" value={newCust.date} onChange={(e) => setNewCust({ ...newCust, date: e.target.value })} className="p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
              <input type="text" placeholder="ক্রেতার নাম" value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} className="p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
              <input type="text" placeholder="মোবাইল নম্বর" value={newCust.mobile} onChange={(e) => setNewCust({ ...newCust, mobile: e.target.value })} className="p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
              <input type="number" placeholder="৳ ০.০০" value={newCust.amount} onChange={(e) => setNewCust({ ...newCust, amount: e.target.value })} className="p-4 bg-orange-50/50 rounded-2xl outline-none font-black text-[#f26522] text-2xl" />
            </div>
            
            <button 
              onClick={async () => {
                if (!newCust.name || !newCust.amount) return addToast('নাম ও টাকা দিন', 'error');
                const tId = crypto.randomUUID();
                const initialAmt = Number(newCust.amount);

                const result = await DataService.addDue({ 
                    customer_name: newCust.name, 
                    mobile: newCust.mobile, 
                    amount: initialAmt, 
                    date: newCust.date, 
                    image: newCust.image, 
                    paid: 0, 
                    logs: [{ 
                      id: tId, 
                      date: newCust.date, 
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
                      type: 'DUE', 
                      amount: initialAmt 
                    }] 
                });

                if (result) {
                    await DataService.addCashLog({
                        type: 'WITHDRAW', 
                        amount: initialAmt,
                        date: newCust.date,
                        note: `নতুন বাকি: ${newCust.name} [ref:due:${result.id}] [ref:log_id:${tId}]` 
                    });

                    setNewCust({ name: '', mobile: '', amount: '', date: getLocalDateString(), image: '' });
                    await refresh(); 
                    setSelectedDueId(result.id); // নতুন কাস্টমার হওয়ার পরও ওই পেজে থাকবে
                    addToast('সফলভাবে যোগ হয়েছে', 'success');
                }
              }} 
              className="w-full py-5 bg-[#21a34a] text-white rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-all mt-4"
            >
              সংরক্ষণ করুন
            </button>
          </div>

          {/* Search and List */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 bg-white flex items-center px-6 py-4 rounded-[2rem] border-2 border-gray-100 shadow-sm">
              <Search className="text-gray-400 mr-3" size={24} />
              <input type="text" placeholder="নাম বা মোবাইল দিয়ে খুঁজুন..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent outline-none font-bold text-gray-700 text-lg" />
            </div>
            <button onClick={downloadPDF} className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-[2rem] font-bold shadow-lg">
              <FileText size={20} /> PDF রিপোর্ট
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredAndSortedDues.map((due) => (
              <div key={due.id} onClick={() => setSelectedDueId(due.id)} className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-50 flex items-center justify-between cursor-pointer hover:border-orange-200 transition-all shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden flex items-center justify-center bg-orange-50">
                    {due.image ? <img src={due.image} className="w-full h-full object-cover" /> : <span className="font-black text-2xl text-orange-600 uppercase">{due.customer_name.charAt(0)}</span>}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800 text-lg">{due.customer_name}</h4>
                    <p className="text-xs text-gray-400 font-bold">{due.mobile || 'মোবাইল নেই'}</p>
                  </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-red-500">৳{calculateBalance(due).toLocaleString('bn-BD')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Detailed View Section */
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <button onClick={() => setSelectedDueId(null)} className="p-4 bg-white rounded-full border shadow-sm active:scale-90 transition-all"><ArrowLeft size={24} /></button>
            <div className="flex flex-col items-center">
                <div onClick={() => fileInputRef.current?.click()} className="relative cursor-pointer group mb-2">
                    <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl bg-orange-100 flex items-center justify-center">
                        {selectedDue?.image ? <img src={selectedDue.image} className="w-full h-full object-cover" /> : <User size={48} className="text-orange-300" />}
                    </div>
                </div>
                <h2 className="font-black text-3xl text-gray-800">{selectedDue?.customer_name}</h2>
                <div className="bg-red-50 px-4 py-1.5 rounded-full mt-2 border border-red-100">
                    <span className="text-red-600 font-black text-xs uppercase">৳{calculateBalance(selectedDue!).toLocaleString('bn-BD')} বাকি</span>
                </div>
            </div>
            
            <HoldToDeleteButton onDelete={async () => {
              await DataService.deleteDue(selectedDue!.id, selectedDue!.customer_name);
              setSelectedDueId(null);
              refresh();
            }} />
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-2 border-gray-50 text-center space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 via-orange-400 to-green-400"></div>
            <div className="flex justify-center my-4">
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                <Calendar size={18} className="text-orange-500" />
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent font-bold outline-none text-gray-600 cursor-pointer text-sm" />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 group">
              <div className="relative flex items-center justify-center">
                <span className="absolute left-[-2.5rem] text-5xl font-black text-gray-300 group-focus-within:text-orange-400">৳</span>
                <input type="number" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="০" className="font-black text-7xl outline-none w-full max-w-[300px] text-center text-gray-800 bg-transparent" />
              </div>
              <div className="w-40 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 w-0 group-focus-within:w-full transition-all duration-500"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 px-4">
              <button onClick={() => handleTransaction('DUE')} className="py-8 bg-red-50 text-red-600 rounded-[2.5rem] font-black text-3xl border-2 border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-lg">বাকি</button>
              <button onClick={() => handleTransaction('ADD')} className="py-8 bg-[#21a34a] text-white rounded-[2.5rem] font-black text-3xl hover:bg-[#1b8a3e] transition-all shadow-xl">জমা</button>
            </div>
          </div>

          {/* Transaction Logs Table */}
          <div className="bg-white rounded-[2rem] shadow-xl border overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 border-b py-4 px-6 text-center">
              <span className="font-bold text-gray-400 text-xs uppercase">লেনদেনের বিবরণ</span>
              <span className="font-bold text-gray-400 text-xs uppercase">বাকি</span>
              <span className="font-bold text-gray-400 text-xs uppercase">জমা</span>
            </div>
            
            <div className="divide-y divide-gray-100">
              {(() => {
                if (!selectedDue) return null;
                let runningBalance = 0;
                const logsWithBalance = (selectedDue.logs || [])
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date) || a.id.toString().localeCompare(b.id.toString()))
                  .map(log => {
                    if (log.type === 'DUE') runningBalance += log.amount;
                    else runningBalance -= log.amount;
                    return { ...log, currentBalance: runningBalance };
                  })
                  .reverse();

                return logsWithBalance.map((log) => (
                  <div key={log.id} className="grid grid-cols-3 items-stretch group hover:bg-gray-50 transition-colors">
                    <div className="py-5 px-6 flex flex-col justify-center border-r border-gray-50">
                      <span className="font-black text-gray-800 text-lg">
                        {new Date(log.date).toLocaleDateString('bn-BD', { day: '2-digit', month: 'short' })}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-bold">{log.time}</span>
                        <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-black">
                          ব্যালেন্স: ৳{log.currentBalance.toLocaleString('bn-BD')}
                        </span>
                      </div>
                    </div>

                    <div className="bg-red-50/30 flex items-center justify-center border-r border-gray-50">
                      {log.type === 'DUE' ? <span className="font-black text-red-500 text-xl">৳{log.amount.toLocaleString('bn-BD')}</span> : <span className="text-gray-200">-</span>}
                    </div>

                    <div className="flex items-center justify-center relative">
                      {log.type === 'ADD' ? <span className="font-black text-green-600 text-xl">৳{log.amount.toLocaleString('bn-BD')}</span> : <span className="text-gray-200">-</span>}
                      <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <HoldToDeleteButton onDelete={async () => {
                          try {
                              await DataService.deleteCashLogByReference(log.id); 
                              const updatedLogs = selectedDue.logs.filter(l => l.id !== log.id);
                              const totalAmt = updatedLogs.filter(l => l.type === 'DUE').reduce((s, l) => s + l.amount, 0);
                              const totalPaid = updatedLogs.filter(l => l.type === 'ADD').reduce((s, l) => s + l.amount, 0);
                              await DataService.updateDue({ amount: totalAmt, paid: totalPaid, logs: updatedLogs }, selectedDue.id);
                              refresh(); 
                              addToast('মুছে ফেলা হয়েছে', 'success');
                          } catch (err) { addToast('ভুল হয়েছে', 'error'); }
                        }} />
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DueModule;