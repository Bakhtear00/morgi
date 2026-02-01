import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Calculator, CreditCard, Loader2, LogOut, Package, 
  ShoppingBag, ShoppingCart, Users, Wallet, 
} from 'lucide-react';
import { BENGALI_TEXT } from './constants.tsx';
import { DataService } from './services/dataService';
import { useData } from './hooks/useData';
import PurchaseModule from './components/PurchaseModule';
import SalesModule from './components/SalesModule';
import StockModule from './components/StockModule';
import ExpenseModule from './components/ExpenseModule';
import CashModule from './components/CashModule';
import DueModule from './components/DueModule';
import ReportModule from './components/ReportModule';
import DenominationModule from './components/DenominationModule';
import AuthModule from './components/AuthModule';
import SettingsModule from './components/SettingsModule';
import DatabaseSetupGuide from './components/DatabaseSetupGuide';
import { ToastProvider } from './contexts/ToastContext';
import { supabase } from './services/supabaseClient';

const SplashScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50">
        <Loader2 className="w-16 h-16 text-green-600 animate-spin mb-4" />
        <h1 className="text-2xl font-black text-green-700">{BENGALI_TEXT.appName}</h1>
        <p className="text-gray-500">সংযোগ স্থাপন করা হচ্ছে...</p>
    </div>
);

const AppContent: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  
  useEffect(() => {
    const checkUserAndDb = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userLoggedIn = !!session;
      setIsLoggedIn(userLoggedIn);
      setUserFullName(session?.user?.user_metadata?.full_name || null);

      if (userLoggedIn) {
        const dbOk = await DataService.checkDbSetup();
        if (!dbOk) {
          setIsSettingUp(true);
        }
      }
      setAuthChecked(true);
    };

    checkUserAndDb();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setUserFullName(session?.user?.user_metadata?.full_name || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const data = useData(isLoggedIn, isSettingUp);
  const { loading, refresh } = data;
  const [activeTab, setActiveTab] = useState('purchase');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);
  
  const handleSignOut = async () => {
    await DataService.signOut();
  };

  if (!authChecked) return <SplashScreen />;
  if (isSettingUp) return <DatabaseSetupGuide onSetupComplete={() => window.location.reload()} />;
  if (!isLoggedIn) return <AuthModule onAuthSuccess={() => {}} />;

  const menu = [
    { id: 'purchase', icon: ShoppingBag, label: 'কেনা' },
    { id: 'sales', icon: ShoppingCart, label: 'বেচা' },
    { id: 'stock', icon: Package, label: 'স্টক' },
    { id: 'expense', icon: CreditCard, label: 'খরচ' },
    { id: 'due', icon: Users, label: 'বাকি' },
    { id: 'cash', icon: Wallet, label: 'ক্যাশ' },
    { id: 'calc', icon: Calculator, label: 'ক্যালকুলেটর' },
    { id: 'reports', icon: BarChart3, label: 'রিপোর্ট' },
  ];
  
  const mobileMenu = [...menu, { id: 'logout', icon: LogOut, label: 'লগ আউট' }];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0 lg:pl-64">
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 flex-col shadow-sm z-40">
        <div className="p-6 border-b bg-green-600 text-white shadow-inner">
          <h1 className="font-bold text-xl">{BENGALI_TEXT.appName}</h1>
          <p className="text-xs opacity-80 uppercase font-bold tracking-tighter mt-1">ব্যবহারকারী: {userFullName}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          {menu.map(m => (
            <button key={m.id} onClick={() => setActiveTab(m.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === m.id ? 'bg-green-600 text-white shadow-lg scale-105 font-bold' : 'text-gray-500 hover:bg-green-50'}`}>
              <m.icon size={20} />
              <span>{m.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
            <div className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold ${isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{isOnline ? BENGALI_TEXT.online : BENGALI_TEXT.offline}</span>
            </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all font-bold mt-2">
            <LogOut size={20} />
            <span>লগ আউট</span>
          </button>
        </div>
      </aside>

      <main className="p-4 lg:p-10 max-w-7xl mx-auto">
        <div className="lg:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
           <h1 className="font-bold text-green-700 text-lg">{BENGALI_TEXT.appName}</h1>
           <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} title={isOnline ? BENGALI_TEXT.online : BENGALI_TEXT.offline} />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-green-600">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="font-bold">ডেটা লোড হচ্ছে...</p>
          </div>
        ) : (
          <>
            {activeTab === 'purchase' && <PurchaseModule purchases={data.purchases} refresh={refresh} />}
            {activeTab === 'sales' && <SalesModule sales={data.sales} refresh={refresh} />}
            {activeTab === 'stock' && <StockModule stock={data.stock} purchases={data.purchases} sales={data.sales} resets={data.resets} lotHistory={data.lotHistory} />}
            {activeTab === 'expense' && <ExpenseModule expenses={data.expenses} refresh={refresh} />}
            {activeTab === 'due' && <DueModule dues={data.dues} refresh={refresh} />}
            {activeTab === 'cash' && <CashModule cashLogs={data.cashLogs} refresh={refresh} />}
            {activeTab === 'calc' && <DenominationModule cashLogs={data.cashLogs} refresh={refresh} />}
            {activeTab === 'reports' && <ReportModule purchases={data.purchases} sales={data.sales} expenses={data.expenses} cashLogs={data.cashLogs} />}
          </>
        )}
      </main>

      <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md border border-gray-100 flex justify-around p-2 rounded-3xl shadow-2xl z-50">
        {mobileMenu.map(m => (
          <button key={m.id} onClick={() => m.id === 'logout' ? handleSignOut() : setActiveTab(m.id)} className={`flex flex-col items-center p-2 rounded-xl transition-all w-12 ${activeTab === m.id ? 'text-green-600 bg-green-50 scale-105' : (m.id === 'logout' ? 'text-red-500' : 'text-gray-400')}`}>
            <m.icon size={20} />
            <span className="text-[8px] mt-1 font-bold">{m.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;