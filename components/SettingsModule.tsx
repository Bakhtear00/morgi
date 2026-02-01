import React from 'react';
import { User, Link, Info } from 'lucide-react';

interface SettingsModuleProps {
    user: string | null;
    syncKey: string | null;
}

const SettingsModule: React.FC<SettingsModuleProps> = ({ user, syncKey }) => {
    return (
        <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                <h2 className="text-2xl font-black text-gray-800 mb-6 border-b pb-4">সেটিংস</h2>
                <div className="space-y-4">
                    <InfoRow icon={<User className="text-blue-500" />} label="ব্যবহারকারীর নাম" value={user} />
                    <InfoRow icon={<Link className="text-purple-500" />} label="Supabase প্রজেক্ট URL" value={syncKey} />
                </div>
                 <div className="mt-8 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <div className="flex items-start gap-3">
                        <Info className="w-6 h-6 text-green-700 flex-shrink-0 mt-1" />
                         <p className="text-sm text-green-800">
                            <strong className="font-black">অ্যাপটি এখন ক্লাউড মোডে চলছে।</strong> আপনার সমস্ত ডেটা Supabase-এ নিরাপদে সিঙ্ক করা আছে। আপনি যেকোনো ডিভাইস থেকে লগইন করে আপনার ডেটা দেখতে পারবেন।
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface InfoRowProps {
    icon: React.ReactNode;
    label: string;
    value: string | null;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
        <div className="flex items-center gap-4">
            {icon}
            <div>
                <p className="text-xs text-gray-500 font-bold">{label}</p>
                <p className="text-lg font-black text-gray-900 break-all">{value || 'N/A'}</p>
            </div>
        </div>
    </div>
);

export default SettingsModule;
