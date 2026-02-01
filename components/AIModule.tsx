

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, BrainCircuit, User } from 'lucide-react';
import { BENGALI_TEXT } from '../constants.tsx';
import { AIService } from '../services/aiService';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

const AIModule: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'স্বাগতম! আমি আপনার পোল্ট্রি ব্যবসার এআই কনসালট্যান্ট। আপনি আমাকে আপনার স্টক বা লাভ বাড়ানোর বিষয়ে জিজ্ঞাসা করতে পারেন।' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
        const response = await AIService.askGemini(userMsg);
        setMessages(prev => [...prev, { role: 'bot', text: response }]);
    } catch (e) {
        setMessages(prev => [...prev, { role: 'bot', text: 'একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] lg:h-[700px] bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{BENGALI_TEXT.aiAssistant}</h3>
            {/* FIX: Updated "Powered by" text to be more generic and accurate to the model being used. */}
            <p className="text-xs opacity-70">Gemini দ্বারা চালিত</p>
          </div>
        </div>
        <Sparkles className="w-6 h-6 animate-pulse text-yellow-300" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-100 text-indigo-600'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-gray-50 border-t">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={BENGALI_TEXT.aiAskPlaceholder}
            className="flex-1 px-6 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 shadow-inner bg-white text-lg outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-600 text-white p-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIModule;