import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Sparkles, User, Loader2, Info } from 'lucide-react';
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
    <div className="flex-1 flex flex-col h-full bg-[#f5f7fa] relative">
      {/* Header */}
      <div className="h-16 border-b border-slate-200/60 flex items-center px-8 bg-white/60 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h2 className="text-[15px] font-semibold text-slate-800">Clinical Assistant</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-8 pb-32 space-y-8">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto mt-[-40px]">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-slate-100">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">PharmaGuide AI</h3>
            <p className="text-[15px] text-slate-500 mb-8 leading-relaxed">
              Your clinical decision-support assistant. Upload guidelines or paste links to get started.
            </p>
            <div className="w-full bg-white rounded-2xl p-5 text-left space-y-4 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Commands</span>
              </div>
              <div className="flex items-center gap-3">
                <code className="bg-slate-50 px-2 py-1 rounded-md text-[13px] font-mono text-blue-700 border border-slate-200/60">/add guideline</code>
                <span className="text-[14px] text-slate-600">Add a new source</span>
              </div>
              <div className="flex items-center gap-3">
                <code className="bg-slate-50 px-2 py-1 rounded-md text-[13px] font-mono text-blue-700 border border-slate-200/60">/list guidelines</code>
                <span className="text-[14px] text-slate-600">View all sources</span>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-4 max-w-3xl mx-auto",
                msg.role === 'user' ? "flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm",
                msg.role === 'user' ? "bg-slate-800" : "bg-blue-600"
              )}>
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Sparkles className="w-4 h-4 text-white" />
                )}
              </div>
              
              <div className={cn(
                "flex flex-col gap-1.5 min-w-0",
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[13px] font-medium text-slate-700">
                    {msg.role === 'user' ? 'Pharmacist' : 'PharmaGuide AI'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {format(new Date(msg.timestamp), 'HH:mm')}
                  </span>
                </div>
                
                <div className={cn(
                  "px-5 py-4 rounded-[20px] max-w-[100%] text-[15px] leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-slate-800 text-white rounded-tr-sm shadow-sm" 
                    : "bg-white border border-slate-200/60 text-slate-800 rounded-tl-sm shadow-sm"
                )}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4 max-w-3xl mx-auto">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col gap-1.5 items-start">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[13px] font-medium text-slate-700">PharmaGuide AI</span>
              </div>
              <div className="px-5 py-4 rounded-[20px] bg-white border border-slate-200/60 rounded-tl-sm shadow-sm flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-[14px] text-slate-500 font-medium">Analyzing guidelines...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#f5f7fa] via-[#f5f7fa] to-transparent pt-10 pb-6 px-4">
        <div className="max-w-3xl mx-auto relative">
          <form 
            onSubmit={handleSubmit}
            className="flex items-end gap-2 bg-white border border-slate-200/80 rounded-[28px] p-2 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500/50 transition-all"
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
              placeholder="Ask a clinical question or type /add guideline..."
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-[15px] text-slate-800 placeholder:text-slate-400"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-1 mr-1 shadow-sm"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </form>
          <p className="text-center text-[11px] text-slate-400 mt-3 font-medium">
            AI can make mistakes. Always verify with primary clinical sources.
          </p>
        </div>
      </div>
    </div>
  );
}
