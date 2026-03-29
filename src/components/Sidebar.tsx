import React from 'react';
import { Activity, Plus, Trash2, FileText, File, Link2, BookOpen, Eye, Image as ImageIcon, X } from 'lucide-react';
import { Guideline } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface SidebarProps {
  guidelines: Guideline[];
  onAddClick: () => void;
  onRemove: (id: string) => void;
  onView: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ guidelines, onAddClick, onRemove, onView, isOpen, onClose }: SidebarProps) {
  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 w-[300px] bg-white border-r border-slate-100 flex flex-col h-full shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50 transition-transform duration-300 lg:relative lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-8 border-b border-slate-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[18px] flex items-center justify-center shadow-lg shadow-blue-200/50">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg tracking-tight">PharmaGuide</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mt-0.5">Navigator AI</p>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-8">
        <div>
          <div className="flex items-center justify-between mb-5 px-2">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Knowledge Base</h2>
            <button
              onClick={onAddClick}
              className="p-2 bg-slate-50 text-slate-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all active:scale-90 shadow-sm"
              title="Add Guideline"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {guidelines.length === 0 ? (
            <div className="text-center py-12 px-6 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200/60">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-4" />
              <p className="text-[13px] text-slate-500 font-medium">No guidelines yet</p>
              <button
                onClick={onAddClick}
                className="mt-3 text-[13px] text-blue-600 font-bold hover:text-blue-700 transition-colors"
              >
                + Add Source
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {guidelines.map((g) => (
                <div 
                  key={g.id} 
                  onClick={() => onView(g.id)}
                  className="group relative flex items-center p-4 bg-white rounded-[24px] border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-[0_8px_20px_rgba(59,130,246,0.06)] transition-all cursor-pointer"
                >
                  <div className="mr-4 w-11 h-11 rounded-[16px] bg-slate-50 group-hover:bg-white flex items-center justify-center shrink-0 border border-slate-100 transition-colors">
                    {g.type === 'pdf' ? (
                      <File className="w-5 h-5 text-rose-500" />
                    ) : g.type === 'link' ? (
                      <Link2 className="h-5 w-5 text-emerald-500" />
                    ) : g.type === 'image' ? (
                      <ImageIcon className="w-5 h-5 text-amber-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-slate-800 truncate leading-tight mb-1" title={g.name}>{g.name}</p>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{format(new Date(g.date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(g.id);
                      }}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-8 border-t border-slate-50 bg-slate-50/20">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-[16px] bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-slate-200">
            PH
          </div>
          <div>
            <p className="text-[14px] font-bold text-slate-800">Pharmacist</p>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
