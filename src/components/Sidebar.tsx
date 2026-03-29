import React from 'react';
import { Activity, Plus, Trash2, FileText, File, Link2, BookOpen } from 'lucide-react';
import { Guideline } from '../types';
import { format } from 'date-fns';

interface SidebarProps {
  guidelines: Guideline[];
  onAddClick: () => void;
  onRemove: (id: string) => void;
}

export default function Sidebar({ guidelines, onAddClick, onRemove }: SidebarProps) {
  return (
    <div className="w-[280px] bg-[#f8fafc] border-r border-slate-200/60 flex flex-col h-full shrink-0">
      <div className="p-5 border-b border-slate-200/60 flex items-center gap-3 bg-white/50">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-600/20">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-900 text-[15px] leading-tight">PharmaGuide</h1>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">Clinical AI</p>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Knowledge Base</h2>
          <button
            onClick={onAddClick}
            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Add Guideline"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {guidelines.length === 0 ? (
          <div className="text-center py-8 px-4 bg-white rounded-xl border border-dashed border-slate-200 mt-2">
            <BookOpen className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-[13px] text-slate-500">No guidelines added</p>
            <button
              onClick={onAddClick}
              className="mt-2 text-[13px] text-blue-600 font-medium hover:text-blue-700"
            >
              + Add Source
            </button>
          </div>
        ) : (
          <div className="space-y-1.5 mt-2">
            {guidelines.map((g) => (
              <div key={g.id} className="group flex items-center p-2.5 bg-white rounded-xl border border-slate-200/60 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="mr-3 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  {g.type === 'pdf' ? (
                    <File className="w-4 h-4 text-rose-500" />
                  ) : g.type === 'link' ? (
                    <Link2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate" title={g.name}>{g.name}</p>
                  <p className="text-[11px] text-slate-400">{format(new Date(g.date), 'MMM dd, yyyy')}</p>
                </div>
                <button
                  onClick={() => onRemove(g.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-slate-200/60 bg-white/50">
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <p className="text-[11px] text-amber-700 leading-relaxed text-center font-medium">
            For licensed pharmacists only. Always verify with primary sources.
          </p>
        </div>
      </div>
    </div>
  );
}
