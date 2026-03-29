import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Sparkles, User, Loader2, Info, Command } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const NAVIGATOR_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=Navigator&backgroundColor=b6e3f4";

export default function ChatArea({ messages, onSendMessage, isLoading }: ChatAreaProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-[#f8fbff] to-[#ffffff] relative overflow-hidden">
      {/* Header */}
      <div className="h-20 border-b border-slate-100/60 flex items-center px-10 bg-white/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-50 overflow-hidden">
              <img src={NAVIGATOR_AVATAR} alt="Navigator" className="w-9 h-9" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-slate-800 tracking-tight">Navigator</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Now</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-12 pt-10 pb-40 space-y-10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto mt-[-60px] animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="w-28 h-28 bg-white rounded-[40px] flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/10 border border-slate-50 overflow-hidden">
              <img src={NAVIGATOR_AVATAR} alt="Navigator" className="w-20 h-20" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Hey there! I'm Navigator</h3>
            <p className="text-[16px] text-slate-500 mb-10 leading-relaxed font-medium">
              I'm your clinical decision-support assistant. I can help you analyze guidelines, check drug interactions, and more.
            </p>
            <div className="w-full grid grid-cols-1 gap-4">
              <div className="p-5 bg-white/60 backdrop-blur-sm rounded-[32px] border border-white shadow-sm flex items-center gap-4 text-left hover:bg-white transition-all cursor-default group">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <Command className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[14px] text-slate-700 font-bold">Add Knowledge</p>
                  <p className="text-[12px] text-slate-500">Type <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-bold">/add guideline</code></p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-5 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500",
                msg.role === 'user' ? "flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-11 h-11 rounded-[18px] flex items-center justify-center shrink-0 mt-1 shadow-sm border overflow-hidden",
                msg.role === 'user' ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
              )}>
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <img src={NAVIGATOR_AVATAR} alt="Navigator" className="w-9 h-9" />
                )}
              </div>
              
              <div className={cn(
                "flex flex-col gap-2 min-w-0",
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "px-7 py-5 rounded-[32px] max-w-[100%] text-[15px] leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-blue-600 text-white rounded-tr-none shadow-blue-500/10" 
                    : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
                )}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-slate font-medium">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {format(new Date(msg.timestamp), 'HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-5 max-w-4xl mx-auto animate-pulse">
            <div className="w-11 h-11 rounded-[18px] bg-white border border-slate-100 flex items-center justify-center shrink-0 mt-1 shadow-sm overflow-hidden">
              <img src={NAVIGATOR_AVATAR} alt="Navigator" className="w-9 h-9 grayscale opacity-50" />
            </div>
            <div className="flex flex-col gap-2 items-start">
              <div className="px-8 py-5 rounded-[32px] bg-white border border-slate-100 rounded-tl-none shadow-sm flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="text-[14px] text-slate-400 font-bold uppercase tracking-widest">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/90 to-transparent pt-16 pb-10 px-6">
        <div className="max-w-4xl mx-auto relative">
          <form 
            onSubmit={handleSubmit}
            className="flex items-center gap-3 bg-white border border-slate-200/60 rounded-[32px] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.04)] focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500/40 transition-all"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask Navigator anything..."
              className="flex-1 max-h-32 min-h-[48px] bg-transparent border-none focus:ring-0 resize-none py-3 px-6 text-[15px] font-medium text-slate-700 placeholder:text-slate-400"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all shrink-0 shadow-lg shadow-blue-500/20 active:scale-90"
            >
              <ArrowUp className="w-6 h-6" />
            </button>
          </form>
          <p className="text-center text-[10px] text-slate-400 mt-5 font-bold uppercase tracking-[0.25em]">
            Verified Clinical Intelligence • Navigator AI
          </p>
        </div>
      </div>
    </div>
  );
}
