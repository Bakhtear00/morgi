import { Purchase, Sale, DueRecord, Expense, CashLog, LotArchive } from '../types';
import { POULTRY_TYPES, getLocalDateString } from '../constants.tsx';
import { supabase } from './supabaseClient';

const showToast = (message: string, type: 'success' | 'error' | 'info') => {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

const rebuildAllLotArchivesForType = async (type: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('lot_archives').delete().eq('user_id', user.id).eq('type', type);

    const { data: resets } = await supabase.from('user_resets').select('last_reset_time').eq('user_id', user.id).eq('poultry_type', type).order('last_reset_time', { ascending: true });
    if (!resets || resets.length === 0) return;

    const { data: allPurchases } = await supabase.from('purchases').select('created_at, total').eq('user_id', user.id).eq('type', type);
    const { data: allSales } = await supabase.from('sales').select('created_at, total').eq('user_id', user.id).eq('type', type);
    if (!allPurchases || !allSales) return;

    // FIX: The type for new lot archives was missing the 'user_id' property,
    // causing a type error when creating new archive objects. A local type
    // alias `NewArchivePayload` has been created to correctly type the array.
    type NewArchivePayload = Omit<LotArchive, 'id' | 'purchaseIds' | 'saleIds'> & { user_id: string };
    const newArchives: NewArchivePayload[] = [];
    let startTime = new Date(0).toISOString();

    for (const reset of resets) {
        const endTime = reset.last_reset_time;
        const startTimeMs = new Date(startTime).getTime();
        const endTimeMs = new Date(endTime).getTime();

        const lotPurchases = allPurchases.filter(p => {
            if (!p.created_at) return false;
            const itemTimeMs = new Date(p.created_at).getTime();
            return itemTimeMs > startTimeMs && itemTimeMs <= endTimeMs;
        });
        const lotSales = allSales.filter(s => {
            if (!s.created_at) return false;
            const itemTimeMs = new Date(s.created_at).getTime();
            return itemTimeMs > startTimeMs && itemTimeMs <= endTimeMs;
        });

        if (lotPurchases.length > 0 || lotSales.length > 0) {
            const totalBuy = lotPurchases.reduce((sum, p) => sum + p.total, 0);
            const totalSell = lotSales.reduce((sum, s) => sum + s.total, 0);

            newArchives.push({
                user_id: user.id,
                type: type,
                date: endTime,
                total_purchase: totalBuy,
                total_sale: totalSell,
                profit: totalSell - totalBuy
            });
        }
        startTime = endTime;
    }
    
    if (newArchives.length > 0) {
        const { error } = await supabase.from('lot_archives').insert(newArchives);
        if (error) throw error;
    }
};


const checkAndTriggerAutoSave = async (type: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: resetsData } = await supabase.from('user_resets').select('last_reset_time').eq('user_id', user.id).eq('poultry_type', type).single();
    const lastSaveTime = resetsData ? new Date(resetsData.last_reset_time).toISOString() : new Date(0).toISOString();

    const { data: purchases } = await supabase.from('purchases').select('pieces, total').eq('user_id', user.id).eq('type', type).gt('created_at', lastSaveTime);
    const { data: sales } = await supabase.from('sales').select('pieces, mortality, total').eq('user_id', user.id).eq('type', type).gt('created_at', lastSaveTime);

    if (!purchases || !sales) return;

    const totalPurchasePieces = purchases.reduce((sum, p) => sum + (Number(p.pieces) || 0), 0);
    const totalSaleAndDeadPieces = sales.reduce((sum, s) => sum + (Number(s.pieces) || 0) + (Number(s.mortality) || 0), 0);
    
    if ((totalPurchasePieces > 0) && (totalPurchasePieces - totalSaleAndDeadPieces <= 0)) {
        const totalBuy = purchases.reduce((sum, p) => sum + p.total, 0);
        const totalSell = sales.reduce((sum, s) => sum + s.total, 0);
        
        if (totalBuy === 0 && totalSell === 0) return;

        const newHistoryEntry = {
            user_id: user.id,
            type: type,
            total_purchase: totalBuy,
            total_sale: totalSell,
            profit: totalSell - totalBuy
        };
        
        const { error: archiveError } = await supabase.from('lot_archives').insert([newHistoryEntry]);
        if (archiveError) throw archiveError;

        const { error: resetError } = await supabase.from('user_resets').upsert({ user_id: user.id, poultry_type: type, last_reset_time: new Date().toISOString() }, { onConflict: 'user_id, poultry_type' });
        if (resetError) throw resetError;

        showToast(`${type} -এর স্টক শেষ হওয়ায় লটের হিসাবটি স্বয়ংক্রিয়ভাবে সেভ হয়েছে।`, 'info');
    }
};

export const DataService = {
  // --- Auth ---
  signUp: async (name: string, email: string, password: string, username: string) => {
    // Append '.dokan' to the password as requested by the user for simplicity.
    const finalPassword = password + '.dokan';
    const { data: authData, error } = await supabase.auth.signUp({ email, password: finalPassword, options: { data: { full_name: name } } });
    if (error) throw error;
    if (!authData.user) throw new Error("Signup successful but no user returned.");

    const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        username: username,
        full_name: name
    });

    if (profileError) {
        // In a real app, you might want to try and delete the auth user here for cleanup.
        throw profileError;
    }
  },
  signInWithUsername: async (username: string, password: string) => {
    if (!password) {
        // Trigger Supabase's standard required field error
        const { error } = await supabase.auth.signInWithPassword({ email: '', password: '' });
        if (error) throw error;
        return;
    }

    // Call the RPC function to get the email for the given username
    const { data: email, error: rpcError } = await supabase.rpc('get_email_for_username', { p_username: username });

    if (rpcError) throw rpcError;
    if (!email) throw new Error("ইউজারনেমটি খুঁজে পাওয়া যায়নি।");
    
    // Append '.dokan' to match the password format during signup.
    const finalPassword = password + '.dokan';
    const { error } = await supabase.auth.signInWithPassword({ email: email, password: finalPassword });
    if (error) throw error;
  },
  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if(error) throw error;
  },
  signOut: async () => await supabase.auth.signOut(),
  getUser: async () => (await supabase.auth.getUser()).data.user,
  
  // --- Setup Check ---
  checkDbSetup: async () => {
    try {
        const { error } = await supabase.from('purchases').select('id').limit(0);
        return !error;
    } catch (e) {
        return false;
    }
  },

  // --- Data Access ---

  getPurchases: async (): Promise<Purchase[]> => {
    const { data, error } = await supabase.from('purchases').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
addPurchase: async (p: Omit<Purchase, 'id' | 'created_at'>): Promise<Purchase> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data, error } = await supabase
        .from('purchases')
        .insert([{ ...p, user_id: user.id }])
        .select() // এই লাইনটি ডাটা ফেরত পাওয়ার জন্য জরুরি
        .single();

    if (error) throw error;
    return data as Purchase; // এখন এটি আইডি সহ ডাটা রিটার্ন করবে
},
deleteCashLogByReference: async (transactionId: string) => {
    const { error } = await supabase
        .from('cash_logs')
        .delete()
        .or(`note.ilike.%[ref:log_id:${transactionId}]%,note.ilike.%[ref:due_log_id:${transactionId}]%`);

    if (error) throw error;
},

  updatePurchase: async (p: Omit<Purchase, 'id' | 'created_at' | 'user_id'>, id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: originalPurchase, error: fetchError } = await supabase.from('purchases').select('created_at, type, is_credit').eq('id', id).single();
    if (fetchError || !originalPurchase || !originalPurchase.created_at) throw fetchError || new Error("Original purchase not found");

    const { data: futureResets } = await supabase.from('user_resets').select('last_reset_time').eq('user_id', user.id).eq('poultry_type', originalPurchase.type).gt('last_reset_time', originalPurchase.created_at).limit(1);
    const isArchived = futureResets && futureResets.length > 0;

    const { error: updateError } = await supabase.from('purchases').update(p).eq('id', id);
    if (updateError) throw updateError;
    
    const { data: originalCashLog } = await supabase.from('cash_logs').select('id').like('note', `%[ref:purchase:${id}]%`).single();
    const wasCash = !originalPurchase.is_credit;
    const isNowCash = !p.is_credit;

    if (wasCash && !isNowCash) {
      if (originalCashLog) await supabase.from('cash_logs').delete().eq('id', originalCashLog.id);
    } else if (!wasCash && isNowCash) {
      if (!originalCashLog) await DataService.addCashLog({ type: 'WITHDRAW', amount: p.total, date: p.date, note: `মাল ক্রয়: ${p.type} [ref:purchase:${id}]` });
    } else if (wasCash && isNowCash) {
      const cashLogData = { amount: p.total, date: p.date, note: `মাল ক্রয়: ${p.type} [ref:purchase:${id}]` };
      if (originalCashLog) await supabase.from('cash_logs').update(cashLogData).eq('id', originalCashLog.id);
      else await DataService.addCashLog({ type: 'WITHDRAW', ...cashLogData });
    }

    if (isArchived) {
      await rebuildAllLotArchivesForType(originalPurchase.type);
      showToast('পুরোনো হিসাব আপডেট হয়েছে এবং লট ইতিহাস পুনরায় গণনা করা হয়েছে।', 'info');
    }
    await checkAndTriggerAutoSave(p.type);
  },
  deletePurchase: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: purchaseToDelete, error: fetchError } = await supabase.from('purchases').select('created_at, type, is_credit').eq('id', id).single();
    if (fetchError || !purchaseToDelete || !purchaseToDelete.created_at) return;

    const { data: futureResets } = await supabase.from('user_resets').select('last_reset_time').eq('user_id', user.id).eq('poultry_type', purchaseToDelete.type).gt('last_reset_time', purchaseToDelete.created_at).limit(1);
    const isArchived = futureResets && futureResets.length > 0;

    if (!purchaseToDelete.is_credit) {
      const { data: cashLog } = await supabase.from('cash_logs').select('id').like('note', `%[ref:purchase:${id}]%`).single();
      if (cashLog) await supabase.from('cash_logs').delete().eq('id', cashLog.id);
    }
    
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) throw error;
    
    if (isArchived) {
        await rebuildAllLotArchivesForType(purchaseToDelete.type);
        showToast('পুরোনো হিসাব মোছা হয়েছে এবং লট ইতিহাস পুনরায় গণনা করা হয়েছে।', 'info');
    }
    await checkAndTriggerAutoSave(purchaseToDelete.type);
  },

  getSales: async (): Promise<Sale[]> => {
    const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
  addSale: async (s: Omit<Sale, 'id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");
    const { data, error } = await supabase.from('sales').insert([{ ...s, user_id: user.id }]).select().single();
    if (error) throw error;
    await checkAndTriggerAutoSave(s.type);
    return data;
  },
  updateSale: async (s: Omit<Sale, 'id' | 'created_at' | 'user_id'>, id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: originalSale, error: fetchError } = await supabase.from('sales').select('created_at, type').eq('id', id).single();
    if (fetchError || !originalSale || !originalSale.created_at) throw fetchError || new Error("Original sale not found");

    const { data: futureResets } = await supabase.from('user_resets').select('last_reset_time').eq('user_id', user.id).eq('poultry_type', originalSale.type).gt('last_reset_time', originalSale.created_at).limit(1);
    const isArchived = futureResets && futureResets.length > 0;

    const { error: updateError } = await supabase.from('sales').update(s).eq('id', id);
    if (updateError) throw updateError;
    
    const { data: originalCashLog } = await supabase.from('cash_logs').select('id').like('note', `%[ref:sale:${id}]%`).single();
    const cashLogData = { amount: s.total, date: s.date, note: `বিক্রয় থেকে আয়: ${s.type} [ref:sale:${id}]` };
    if (originalCashLog) await supabase.from('cash_logs').update(cashLogData).eq('id', originalCashLog.id);
    else await DataService.addCashLog({ type: 'ADD', ...cashLogData });

    if (isArchived) {
        await rebuildAllLotArchivesForType(originalSale.type);
        showToast('পুরোনো হিসাব আপডেট হয়েছে এবং লট ইতিহাস পুনরায় গণনা করা হয়েছে।', 'info');
    }
    await checkAndTriggerAutoSave(s.type);
  },
  deleteSale: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: saleToDelete, error: fetchError } = await supabase.from('sales').select('created_at, type').eq('id', id).single();
    if (fetchError || !saleToDelete || !saleToDelete.created_at) return;
    
    const { data: futureResets } = await supabase.from('user_resets').select('last_reset_time').eq('user_id', user.id).eq('poultry_type', saleToDelete.type).gt('last_reset_time', saleToDelete.created_at).limit(1);
    const isArchived = futureResets && futureResets.length > 0;

    const { data: cashLog } = await supabase.from('cash_logs').select('id').like('note', `%[ref:sale:${id}]%`).single();
    if (cashLog) await supabase.from('cash_logs').delete().eq('id', cashLog.id);

    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) throw error;
    
    if (isArchived) {
        await rebuildAllLotArchivesForType(saleToDelete.type);
        showToast('পুরোনো হিসাব মোছা হয়েছে এবং লট ইতিহাস পুনরায় গণনা করা হয়েছে।', 'info');
    }
    await checkAndTriggerAutoSave(saleToDelete.type);
  },
  
  getExpenses: async (): Promise<Expense[]> => {
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
  addExpense: async (e: Omit<Expense, 'id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");
    const { data, error } = await supabase.from('expenses').insert([{ ...e, user_id: user.id }]).select().single();
    if (error) throw error;
    return data;
  },
  updateExpense: async (e: Omit<Expense, 'id' | 'created_at' | 'user_id'>, id: string) => {
    const { data: originalCashLog } = await supabase.from('cash_logs').select('id').like('note', `%[ref:expense:${id}]%`).single();
    
    const { error } = await supabase.from('expenses').update(e).eq('id', id);
    if (error) throw error;

    const note = `খরচ: ${e.category}${e.note ? ' - ' + e.note : ''} [ref:expense:${id}]`;
    const cashLogData = { amount: e.amount, date: e.date, note };
    if (originalCashLog) {
        await supabase.from('cash_logs').update(cashLogData).eq('id', originalCashLog.id);
    } else {
        await DataService.addCashLog({ type: 'WITHDRAW', ...cashLogData });
    }
  },
  deleteExpense: async (id: string) => {
    const { data: cashLog } = await supabase.from('cash_logs').select('id').like('note', `%[ref:expense:${id}]%`).single();
    if (cashLog) await supabase.from('cash_logs').delete().eq('id', cashLog.id);

    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },

  getDues: async (): Promise<DueRecord[]> => {
    const { data, error } = await supabase.from('dues').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
addDue: async (d: Omit<DueRecord, 'id' | 'created_at'>): Promise<DueRecord> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data, error } = await supabase
        .from('dues')
        .insert([{ ...d, user_id: user.id }])
        .select() // এই .select() ডাটা ফেরত দিবে
        .single();

    if (error) throw error;
    return data as DueRecord;
},
updateDue: async (d: Partial<Omit<DueRecord, 'id' | 'created_at' | 'user_id'>>, id: string) => {
  // শুধুমাত্র ডিউ প্রোফাইল আপডেট হবে
  // কারণ ক্যাশ লগের এন্ট্রি আমরা সরাসরি DueModule.tsx থেকে দিচ্ছি
  const { error } = await supabase.from('dues').update(d).eq('id', id);
  if (error) throw error;
},
// DataService.ts er vitor deleteDue function
// DataService.ts এর ভেতর
// ১. পুরো কাস্টমার প্রোফাইল এবং তার সব ক্যাশ লগ ডিলিট

    // ... অন্যান্য ফাংশন
    
  deleteDue: async (id: string, customerName: string) => {
    // ১. কাস্টমারের আইডি দিয়ে রেফারেন্স করা লগগুলো মুছবে
    // ২. অথবা নোটে কাস্টমারের নাম আছে এমন সব লগ মুছবে
    const { error: logError } = await supabase.from('cash_logs')
        .delete()
        .or(`note.ilike.%[ref:due:${id}]%,note.ilike.%[ref:due_log_id:${id}]%,note.ilike.%বাকি: ${customerName}%`);

    if (logError) console.error("Cash log deletion error:", logError);

    // ৩. সবশেষে কাস্টমার প্রোফাইল মুছবে
    const { error } = await supabase.from('dues').delete().eq('id', id);
    if (error) throw error;
},
  getCashLogs: async (): Promise<CashLog[]> => {
    const { data, error } = await supabase.from('cash_logs').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  addCashLog: async (c: Omit<CashLog, 'id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");
    const { error } = await supabase.from('cash_logs').insert([{ ...c, user_id: user.id }]);
    if (error) throw error;
  },
  updateCashLog: async (c: Omit<CashLog, 'id'|'created_at'|'user_id'>, id: string) => {
    const { error } = await supabase.from('cash_logs').update(c).eq('id', id);
    if (error) throw error;
  },
  deleteCashLog: async (id: string) => {
    const { error } = await supabase.from('cash_logs').delete().eq('id', id);
    if (error) throw error;
  },

  getLotHistory: async (): Promise<LotArchive[]> => {
    const { data, error } = await supabase.from('lot_archives').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  
// Ln 403 থেকে এভাবে লিখুন
getResets: async (): Promise<{ [key: string]: string }> => {
  const { data, error } = await supabase.from('user_resets').select('poultry_type, last_reset_time');
  if (error) throw error;

  // data চেক যোগ করা হয়েছে এবং acc এর টাইপ ডিফাইন করা হয়েছে
  return (data || []).reduce((acc: { [key: string]: string }, curr: any) => {
    acc[curr.poultry_type] = curr.last_reset_time;
    return acc;
  }, {});
},

  calculateStock: (purchases: Purchase[], sales: Sale[], resets: { [key: string]: string }) => {
    const stockByType: { [key: string]: { pieces: number; kg: number; dead: number; } } = {};
    POULTRY_TYPES.forEach(type => {
      stockByType[type] = { pieces: 0, kg: 0, dead: 0 };
      const lastResetTime = resets[type] ? new Date(resets[type]).getTime() : 0;

      const typePurchases = purchases.filter(p => {
        if (p.type !== type) return false;
        const itemTime = p.created_at ? new Date(p.created_at).getTime() : new Date(p.date).getTime();
        return itemTime > lastResetTime;
      });

      const typeSales = sales.filter(s => {
        if (s.type !== type) return false;
        const itemTime = s.created_at ? new Date(s.created_at).getTime() : new Date(s.date).getTime();
        return itemTime > lastResetTime;
      });

      typePurchases.forEach(p => {
        stockByType[type].pieces += Number(p.pieces) || 0;
        stockByType[type].kg += Number(p.kg) || 0;
      });
      
      typeSales.forEach(s => {
        stockByType[type].pieces -= (Number(s.pieces) || 0) + (Number(s.mortality) || 0);
        stockByType[type].dead += Number(s.mortality) || 0;
      });
    });
    return stockByType;
  }
};