

export const BENGALI_TEXT = {
  appName: 'সহজ পোল্ট্রি হিসাব',
  purchase: 'কেনা (Purchase)',
  sales: 'বেচা (Sales)',
  stock: 'স্টক (Stock)',
  expenses: 'খরচ',
  cash: 'ক্যাশ বক্স',
  due: 'বাকি হিসাব',
  reports: 'রিপোর্ট',
  total: 'মোট টাকা',
  save: 'জমা দিন',
  delete: 'মুছুন',
  date: 'তারিখ',
  customer: 'ক্রেতার নাম',
  amount: 'টাকার পরিমাণ',
  type: 'ধরণ',
  pieces: 'পিস (সংখ্যা)',
  kg: 'ওজন (কেজি)',
  rate: 'দর (রেট)',
  mortality: 'মৃত্যু',
  daily: 'দৈনিক',
  weekly: 'সাপ্তাহিক',
  monthly: 'মাসিক',
  yearly: 'বার্ষিক',
  openingCash: 'শুরু ক্যাশ',
  ownerAdd: 'মালিক জমা',
  ownerWithdraw: 'মালিক উত্তোলন',
  customerName: 'ক্রেতার নাম',
  mobile: 'মোবাইল',
  address: 'ঠিকানা',
  product: 'পণ্যের বিবরণ',
  paid: 'পরিশোধ',
  denomination: 'নোট গণনা',
  syncKey: 'শপ আইডি (Sync Key)',
  syncDesc: 'এই আইডিটি অন্য মোবাইলে দিলে সব হিসাব এক হয়ে যাবে।',
  online: 'অনলাইন (সিঙ্ক হচ্ছে)',
  offline: 'অফলাইন (ফোনে জমা হচ্ছে)',
  saveToCash: 'ক্যাশ ক্লোজিং (হিসাব মেলান)',
  cashAddedSuccess: 'ক্যাশ হিসাব সফলভাবে মেলানো হয়েছে!',
  systemBalance: 'খাতার হিসাব (ব্যালেন্স)',
  physicalCash: 'হাতের নগদ (আসল)',
  cashGap: 'পার্থক্য (কম/বেশি)',
  shortage: 'ক্যাশ শর্ট (লস)',
  excess: 'অতিরিক্ত (লাভ)',
  matched: 'হিসাব মিলে গেছে',
  cashAdjustment: 'ক্যাশ সমন্বয় (লাভ/লস)',
  dbSetup: 'ডাটাবেস সেটআপ',
  aiAssistant: 'এআই সহকারী',
  aiAskPlaceholder: 'আপনার প্রশ্ন এখানে লিখুন...',
  dbSetupTitle: 'ডাটাবেস সেটআপ প্রয়োজন',
  dbSetupInstructions: 'অনুগ্রহ করে নিচের SQL কোডটি কপি করে আপনার Supabase প্রজেক্টের SQL Editor-এ রান করুন।',
  resetPasswordEmailSent: 'পাসওয়ার্ড রিসেট করার জন্য আপনার ইমেইলে একটি লিঙ্ক পাঠানো হয়েছে। অনুগ্রহ করে আপনার ইনবক্স চেক করুন।'
};

export const POULTRY_TYPES = ['ব্রয়লার', 'সোনালী', 'লেয়ার', 'দেশী', 'কক'];
export const EXPENSE_CATEGORIES = ['খাবার', 'ঔষধ', 'কারেন্ট বিল', 'অন্যান্য'];
export const NOTES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export const getLocalDateString = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};