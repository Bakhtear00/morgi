import React, { useState } from 'react';
import { Bot, Loader2, Key, Clipboard, Mail, User } from 'lucide-react';
import { DataService } from '../services/dataService';
import { useToast } from '../contexts/ToastContext';
import { BENGALI_TEXT } from '../constants.tsx';

interface AuthModuleProps {
  onAuthSuccess: () => void;
}

const AuthModule: React.FC<AuthModuleProps> = ({ onAuthSuccess }) => {
  const [viewMode, setViewMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { addToast } = useToast();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await DataService.signInWithUsername(username, password);
      // onAuthStateChange will handle the rest
    } catch (error: any) {
      addToast(error.message || 'আপনার ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়।', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side length check removed as '.dokan' is appended automatically,
    // which satisfies Supabase's 6-character minimum.
    setLoading(true);
    try {
      await DataService.signUp(name, email, password, username);
      addToast('আপনার একাউন্ট তৈরি হয়েছে! অনুগ্রহ করে আপনার ইমেইল চেক করে ভেরিফাই করুন।', 'success');
      setViewMode('login');
    } catch (error: any)
      {
      // The error message from Supabase might be helpful, so we show it.
      // Example: "User already registered"
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        await DataService.resetPassword(email);
        addToast(BENGALI_TEXT.resetPasswordEmailSent, 'success');
    } catch(error: any) {
        addToast(error.message, 'error');
    } finally {
        setLoading(false);
    }
  };
  
  const renderContent = () => {
    switch(viewMode) {
      case 'signup':
        return (
          <>
            <h1 className="text-2xl font-black text-center text-green-800 mb-2">নতুন একাউন্ট খুলুন</h1>
            <p className="text-center text-gray-500 mb-6 text-sm">আপনার ব্যবসার জন্য একটি নতুন একাউন্ট তৈরি করুন</p>
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <Input id="name" type="text" label="আপনার নাম" value={name} onChange={setName} required Icon={User} />
              <Input id="username-signup" type="text" label="ইউজারনেম (ইংলিশ)" value={username} onChange={setUsername} required Icon={User}/>
              <Input id="email-signup" type="email" label="ইমেইল" value={email} onChange={setEmail} required Icon={Mail}/>
              <Input id="password-signup" type="password" label="পাসওয়ার্ড" value={password} onChange={setPassword} required Icon={Key}/>
              <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center disabled:bg-gray-400">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'একাউন্ট খুলুন'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              আপনার কি একাউন্ট আছে?
              <button onClick={() => setViewMode('login')} className="text-green-600 font-bold ml-1 hover:underline">
                লগইন করুন
              </button>
            </p>
          </>
        );
      case 'forgot':
        return (
           <>
            <h1 className="text-2xl font-black text-center text-green-800 mb-2">পাসওয়ার্ড পুনরুদ্ধার</h1>
            <p className="text-center text-gray-500 mb-6 text-sm">আপনার রেজিস্টার করা ইমেইলটি দিন</p>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <Input id="email-forgot" type="email" label="ইমেইল" value={email} onChange={setEmail} required Icon={Mail}/>
              <button type="submit" disabled={loading} className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center disabled:bg-gray-400">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'রিসেট লিঙ্ক পাঠান'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              <button onClick={() => setViewMode('login')} className="text-green-600 font-bold ml-1 hover:underline">
                লগইন পেজে ফিরে যান
              </button>
            </p>
          </>
        );
      case 'login':
      default:
        return (
          <>
            <h1 className="text-2xl font-black text-center text-green-800 mb-2">স্বাগতম!</h1>
            <p className="text-center text-gray-500 mb-6 text-sm">আপনার ব্যবসার হিসাব শুরু করুন</p>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <Input id="username-login" type="text" label="ইউজারনেম" value={username} onChange={setUsername} required Icon={User}/>
              <div>
                <Input id="password-login" type="password" label="পাসওয়ার্ড" value={password} onChange={setPassword} required Icon={Key}/>
                <div className="text-right mt-1">
                    <button type="button" onClick={() => { setViewMode('forgot'); setPassword(''); }} className="text-xs font-bold text-green-600 hover:underline">
                        পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center disabled:bg-gray-400">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'লগইন করুন'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              আপনার কোনো একাউন্ট নেই?
              <button onClick={() => setViewMode('signup')} className="text-green-600 font-bold ml-1 hover:underline">
                একাউন্ট খুলুন
              </button>
            </p>
          </>
        );
    }
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-green-100">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
             {viewMode === 'login' && <Bot className="w-10 h-10 text-green-600" />}
             {viewMode === 'signup' && <Mail className="w-10 h-10 text-green-600" />}
             {viewMode === 'forgot' && <Key className="w-10 h-10 text-green-600" />}
          </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

interface InputProps {
    id: string;
    label: string;
    type: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    Icon: React.ElementType;
}

const Input: React.FC<InputProps> = ({ id, label, type, value, onChange, required = false, Icon }) => (
    <div>
      <label htmlFor={id} className="text-xs font-bold text-gray-500 mb-1 block">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50/50 outline-none focus:border-green-500 transition-all font-bold text-gray-900"
            required={required}
            autoComplete="off"
        />
       </div>
    </div>
);

export default AuthModule;