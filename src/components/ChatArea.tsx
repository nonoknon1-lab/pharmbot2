import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Sparkles, User, Loader2, Info, Command, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

import NavigatorAvatar from './NavigatorAvatar';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onToggleSidebar?: () => void;
}

export default function ChatArea({ messages, onSendMessage, isLoading, onToggleSidebar }: ChatAreaProps) {
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
      <div className="h-20 border-b border-slate-100/60 flex items-center px-4 sm:px-10 bg-white/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4 w-full">
          {/* Hamburger Menu for Mobile */}
          <button 
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-50 overflow-hidden">
                <NavigatorAvatar className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
            </div>
            <div>
              <h2 className="text-[14px] sm:text-[16px] font-bold text-slate-800 tracking-tight leading-none">Navigator</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Now</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-12 pt-6 sm:pt-10 pb-32 sm:pb-40 space-y-6 sm:space-y-10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 px-4">
            <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white rounded-[32px] sm:rounded-[40px] flex items-center justify-center mb-6 sm:mb-8 shadow-2xl shadow-blue-500/10 border border-slate-50 overflow-hidden">
              <NavigatorAvatar className="w-14 h-14 sm:w-20 sm:h-20" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4 tracking-tight">Hey there! I'm Navigator</h3>
            <p className="text-[14px] sm:text-[16px] text-slate-500 mb-8 sm:mb-10 leading-relaxed font-medium">
              I'm your clinical decision-support assistant. I can help you analyze guidelines, check drug interactions, and more.
            </p>
            <div className="w-full bg-white rounded-2xl p-4 sm:p-5 text-left space-y-3 sm:space-y-4 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Commands</span>
              </div>
              <div className="flex items-center gap-3">
                <code className="bg-slate-50 px-2 py-1 rounded-md text-[11px] sm:text-[13px] font-mono text-blue-700 border border-slate-200/60">/add guideline</code>
                <span className="text-[12px] sm:text-[14px] text-slate-600">Add a new source</span>
              </div>
              <div className="flex items-center gap-3">
                <code className="bg-slate-50 px-2 py-1 rounded-md text-[11px] sm:text-[13px] font-mono text-blue-700 border border-slate-200/60">/list guidelines</code>
                <span className="text-[12px] sm:text-[14px] text-slate-600">View all sources</span>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 sm:gap-5 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500",
                msg.role === 'user' ? "flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-9 h-9 sm:w-11 sm:h-11 rounded-[14px] sm:rounded-[18px] flex items-center justify-center shrink-0 mt-1 shadow-sm border overflow-hidden",
                msg.role === 'user' ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
              )}>
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <NavigatorAvatar className="w-7 h-7 sm:w-9 sm:h-9" />
                )}
              </div>
              
              <div className={cn(
                "flex flex-col gap-1.5 sm:gap-2 min-w-0",
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "px-4 sm:px-7 py-3 sm:py-5 rounded-[24px] sm:rounded-[32px] max-w-[100%] text-[14px] sm:text-[15px] leading-relaxed shadow-sm",
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
                <div className="flex items-center gap-2 px-2 sm:px-3">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {format(new Date(msg.timestamp), 'HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3 sm:gap-5 max-w-4xl mx-auto animate-pulse">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-[14px] sm:rounded-[18px] bg-white border border-slate-100 flex items-center justify-center shrink-0 mt-1 shadow-sm overflow-hidden">
              <NavigatorAvatar className="w-7 h-7 sm:w-9 sm:h-9" mood="sad" color="pink" />
            </div>
            <div className="flex flex-col gap-2 items-start">
              <div className="px-5 sm:px-8 py-3 sm:py-5 rounded-[24px] sm:rounded-[32px] bg-white border border-slate-100 rounded-tl-none shadow-sm flex items-center gap-3 sm:gap-4">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="text-[12px] sm:text-[14px] text-slate-400 font-bold uppercase tracking-widest">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-8 sm:pt-16 pb-6 sm:pb-10 px-4 sm:px-6 z-20">
        <div className="max-w-4xl mx-auto relative">
          <form 
            onSubmit={handleSubmit}
            className="flex items-center gap-2 sm:gap-3 bg-white border border-slate-200/60 rounded-[24px] sm:rounded-[32px] p-2 sm:p-3 shadow-[0_12px_40px_rgba(0,0,0,0.04)] focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500/40 transition-all"
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
              className="flex-1 max-h-32 min-h-[44px] sm:min-h-[48px] bg-transparent border-none focus:ring-0 resize-none py-2.5 sm:py-3 px-4 sm:px-6 text-[14px] sm:text-[15px] font-medium text-slate-700 placeholder:text-slate-400"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all shrink-0 shadow-lg shadow-blue-500/20 active:scale-90"
            >
              <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </form>
          <p className="text-center text-[9px] sm:text-[10px] text-slate-400 mt-4 sm:mt-5 font-bold uppercase tracking-[0.25em]">
            Verified Clinical Intelligence • Navigator AI
          </p>
        </div>
      </div>
    </div>
  );
}
