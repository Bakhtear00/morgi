import React, { useState, useMemo } from 'react';
import { 
  Calculator, RotateCcw, Banknote, Save, History, 
  Edit2, Trash2
} from 'lucide-react';
import { NOTES, getLocalDateString } from '../constants.tsx';
import { DataService } from '../services/dataService';
import { CashLog } from '../types';
import HoldToDeleteButton from './HoldToDeleteButton';
import { useToast } from '../contexts/ToastContext';

// FIX: Removed useData hook and accept props from parent component.
interface DenominationModuleProps {
  cashLogs: CashLog[];
  refresh: () => void;
}

const DenominationModule: React.FC<DenominationModuleProps> = ({ cashLogs, refresh }) => {
  const [counts, setCounts] = useState<{ [key: number]: string }>(
    Object.fromEntries(NOTES.map(n => [n, '']))
  );
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const { addToast } = useToast();

  const systemBalance = useMemo(() => {
    return cashLogs.reduce((sum, log) => {
      // When a denomination log is being edited, its effect should be temporarily
      // removed from the system balance to reflect the state *before* that adjustment.
      if (log.id === editingLogId) {
        return sum;
      }
      
      if (log.type === 'WITHDRAW') {
        return sum - log.amount;
      }
      // This covers 'ADD' and 'OPENING' types.
      return sum + log.amount;
    }, 0);
  }, [cashLogs, editingLogId]);

  const physicalTotal = useMemo(() => {
    return NOTES.reduce((sum, note) => sum + (note * (Number(counts[note]) || 0)), 0);
  }, [counts]);

  const gap = physicalTotal - systemBalance;

  const historyList = useMemo(() => {
    // The cashLogs are already sorted newest first from the data service.
    // We just need to filter for the ones that are denomination calculations.
    return cashLogs.filter(log => log.denominations && Object.keys(log.denominations).length > 0);
  }, [cashLogs]);

  const handleClear = () => {
    setCounts(Object.fromEntries(NOTES.map(n => [n, ''])));
    setEditingLogId(null);
    addToast('ফর্ম রিসেট করা হয়েছে।', 'info');
  };

  const handleInputChange = (note: number, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setCounts({ ...counts, [note]: value });
    }
  };

  const handleSave = async () => {
    if (physicalTotal <= 0) {
      addToast('অনুগ্রহ করে নোটের সংখ্যা লিখুন।', 'error');
      return;
    }

    // Create a cleaned up denominations object that only includes notes with a count.
    const denominationsToSave = Object.fromEntries(
      Object.entries(counts).filter(([_, value]) => Number(value) > 0)
    );

    if (Object.keys(denominationsToSave).length === 0) {
      addToast('গণনা করার জন্য কোনো নোটের সংখ্যা দেওয়া হয়নি।', 'error');
      return;
    }
    
    const logDate = getLocalDateString();
    // FIX: Explicitly type logData and cast denominations to match the expected CashLog type.
    // The type of denominationsToSave is inferred incorrectly as having `unknown` values.
    const logData: Omit<CashLog, 'id'> = {
        type: gap >= 0 ? 'ADD' : 'WITHDRAW',
        amount: Math.abs(gap),
        date: logDate,
        note: gap === 0 ? 'ক্যাশ হিসাব মেলানো হয়েছে' : `ক্যাশ সমন্বয় (${gap > 0 ? 'বেশি' : 'কম'} ৳${Math.abs(gap).toLocaleString('bn-BD')})`,
        denominations: denominationsToSave as { [key: string]: string }
    };

    try {
      if (editingLogId) {
          await DataService.updateCashLog(logData, editingLogId);
          addToast('হিসাব সফলভাবে আপডেট হয়েছে!', 'success');
      } else {
          await DataService.addCashLog(logData);
          addToast('ক্যাশ হিসাব সফলভাবে সেভ হয়েছে!', 'success');
      }
      
      setEditingLogId(null);
      setCounts(Object.fromEntries(NOTES.map(n => [n, ''])));
      refresh();
    } catch (error) {
      console.error("Failed to save denomination:", error);
    }
  };

  const handleEdit = (log: CashLog) => {
    if (log.denominations) {
        const initialCounts = Object.fromEntries(NOTES.map(n => [n, '']));
        const hydratedCounts = { ...initialCounts, ...log.denominations };
        setCounts(hydratedCounts);
        setEditingLogId(log.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      await DataService.deleteCashLog(id);
      addToast('হিসাব সফলভাবে মোছা হয়েছে!', 'success');
      if (editingLogId === id) {
          setCounts(Object.fromEntries(NOTES.map(n => [n, ''])));
          setEditingLogId(null);
      }
      refresh();
    } catch (error) {
      console.error("Failed to delete denomination log:", error);
    }
  };


  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <InfoCard title="ক্যাশ এ আছে" description="এটি আপনার খাতার হিসাব বা সিস্টেম ব্যালেন্স দেখাবে।" amount={systemBalance} color="bg-blue-100 text-blue-800" />
          <InfoCard title="হিসাব করা টাকার পরিমান" description="এটি আপনি হাতে গুনে যে টাকার পরিমাণ ইনपुट দিয়েছেন, তা দেখাবে।" amount={physicalTotal} color="bg-emerald-100 text-emerald-800" />
          <GapCard title="পার্থক্য (কম/বেশি)" description="এই দুটি হিসাবের মধ্যে পার্থক্য দেখাবে।" gap={gap} />
        </div>

        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border-2 border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b pb-4">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
              <Calculator className="w-7 h-7 text-indigo-600" />
              {editingLogId ? 'হিসাব সংশোধন' : 'নোট গণনা করুন'}
            </h3>
            <div className="flex items-center gap-2">
               <HoldToDeleteButton
                onDelete={handleClear}
                holdDuration={1000}
                className="flex items-center gap-2 bg-gray-100 text-gray-600 font-bold px-4 py-2 rounded-xl text-xs active:scale-95 transition-all relative overflow-hidden select-none hover:bg-gray-200"
              >
                <RotateCcw size={14} />
                <span>{editingLogId ? 'বাতিল করুন' : 'রিসেট করুন'}</span>
              </HoldToDeleteButton>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {NOTES.map(note => (
              <div key={note} className="bg-gray-50/70 p-3 rounded-xl border border-gray-200">
                <label htmlFor={`note-${note}`} className="text-sm font-black text-gray-700 flex items-center gap-2 mb-1.5">
                  <Banknote size={16} className="text-gray-400" /> ৳{note.toLocaleString('bn-BD')}
                </label>
                <input
                  id={`note-${note}`}
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  value={counts[note]}
                  onChange={(e) => handleInputChange(note, e.target.value)}
                  className="w-full bg-white text-center font-black text-lg text-gray-900 py-2 rounded-lg border-2 border-gray-200 outline-none focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-4 mt-8">
            <button onClick={handleSave} className={`flex-1 flex items-center justify-center gap-2 text-white py-4 rounded-xl font-black text-lg shadow-lg active:scale-95 transition-all ${editingLogId ? 'bg-orange-600' : 'bg-green-600'}`}>
              <Save size={20} /> {editingLogId ? 'আপডেট করুন' : 'হিসাব সেভ করুন'}
            </button>
            {editingLogId && (
                <HoldToDeleteButton
                  onDelete={() => handleDelete(editingLogId)}
                  className="bg-red-600 text-white py-4 px-5 rounded-xl font-black text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 relative overflow-hidden select-none"
                >
                    <Trash2 size={20} />
                    <span>মুছুন</span>
                </HoldToDeleteButton>
             )}
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border-2 border-gray-100">
        <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" /> পূর্বের হিসাব তালিকা
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black">
                <th className="px-4 py-3 text-left">তারিখ</th>
                <th className="px-4 py-3 text-left">ফলাফল</th>
                <th className="px-4 py-3 text-right">গণনা করা টাকা</th>
                <th className="px-4 py-3 text-right">নোটের বিবরণ</th>
                <th className="px-4 py-3 text-center no-print">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historyList.map(log => {
                const physical = Object.entries(log.denominations || {}).reduce((sum, [note, count]) => sum + (Number(note) * Number(count)), 0);

                return (
                  <tr key={log.id} className="text-sm hover:bg-gray-50/50">
                    <td className="px-4 py-4 font-bold text-gray-700 align-top">{new Date(log.date).toLocaleDateString('bn-BD')}</td>
                    <td className="px-4 py-4 font-bold text-gray-500 align-top">{log.note}</td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-indigo-700 align-top">৳{physical.toLocaleString('bn-BD')}</td>
                    <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap gap-1.5 justify-end max-w-[250px] ml-auto">
                          {NOTES.filter(note => Number((log.denominations || {})[note] || '0') > 0).map(note => {
                            const count = Number((log.denominations || {})[note] || '0');
                            return (
                              <div key={note} className="bg-gray-100 px-2 py-1 rounded-md text-xs">
                                <span className="font-bold text-gray-600">{note.toLocaleString('bn-BD')}</span>
                                <span className="font-black text-indigo-600"> x {count.toLocaleString('bn-BD')}</span>
                              </div>
                            );
                          })}
                        </div>
                    </td>
                    <td className="px-4 py-4 text-center no-print align-top">
                        <div className="flex items-center justify-center gap-2">
                           <button onClick={() => handleEdit(log)} className="p-2 bg-blue-50 text-blue-500 rounded-lg"><Edit2 size={16} /></button>
                           <HoldToDeleteButton onDelete={() => handleDelete(log.id)} />
                        </div>
                    </td>
                  </tr>
                );
              })}
              {historyList.length === 0 && (
                 <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                        <p className="font-bold">কোনো হিসাব সেভ করা নেই।</p>
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

const InfoCard = ({ title, description, amount, color }: { title: string, description: string, amount: number, color: string }) => (
  <div className={`p-6 rounded-[2rem] shadow-sm ${color}`}>
    <p className="text-sm font-black uppercase opacity-90">{title}</p>
    <p className="text-[11px] opacity-70 leading-tight mb-2">{description}</p>
    <p className="text-4xl font-black text-right">৳ {amount.toLocaleString('bn-BD')}</p>
  </div>
);

const GapCard = ({ title, description, gap }: { title: string, description: string, gap: number }) => {
  const isZero = gap === 0;
  const isPositive = gap > 0;
  const color = isZero ? 'bg-gray-100 text-gray-800' : isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  const text = isZero ? 'হিসাব মিলে গেছে' : isPositive ? `বেশি (+) ৳${gap.toLocaleString('bn-BD')}` : `কম (-) ৳${Math.abs(gap).toLocaleString('bn-BD')}`;

  return (
    <div className={`p-6 rounded-[2rem] shadow-sm ${color}`}>
      <p className="text-sm font-black uppercase">{title}</p>
      <p className="text-[11px] opacity-70 leading-tight mb-2">{description}</p>
      <p className="text-3xl font-black text-right">{text}</p>
    </div>
  );
};

export default DenominationModule;