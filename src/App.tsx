/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import GuidelineModal from './components/GuidelineModal';
import { Guideline, Message } from './types';
import { generateClinicalResponse } from './lib/gemini';
import { File, FileText, Link2, X } from 'lucide-react';

const GUIDELINES_STORE_KEY = 'pharmaguide_guidelines';

export default function App() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuideline, setSelectedGuideline] = useState<Guideline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load guidelines from IndexedDB on startup
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedGuidelines = await get<Guideline[]>(GUIDELINES_STORE_KEY);
        
        if (storedGuidelines && storedGuidelines.length > 0) {
          setGuidelines(storedGuidelines);
        }
      } catch (error) {
        console.error("Failed to load data from storage:", error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadData();
  }, []);

  // Save guidelines to IndexedDB whenever they change
  useEffect(() => {
    if (isInitialized) {
      set(GUIDELINES_STORE_KEY, guidelines).catch(err => {
        console.error("Failed to save guidelines to storage:", err);
      });
    }
  }, [guidelines, isInitialized]);

  // We are NOT saving messages anymore as requested

  // Intercept commands
  const handleSendMessage = async (text: string) => {
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    
    const lowerText = text.trim().toLowerCase();

    // Command: Add Guideline
    if (lowerText === '/add guideline' || lowerText === 'เพิ่ม guideline') {
      setTimeout(() => {
        addBotMessage("กรุณาอัปโหลดไฟล์ (PDF/TXT), วางข้อความ, หรือใส่ Link ของ Guideline ที่ต้องการเพิ่มได้เลยครับ ระบบจะบันทึกและใช้เป็นแหล่งข้อมูลสำหรับการตอบคำถามทันที");
        setIsModalOpen(true);
      }, 500);
      return;
    }

    // Command: List Guidelines
    if (lowerText === '/list guidelines' || lowerText === 'ดู guideline ที่มี') {
      setTimeout(() => {
        if (guidelines.length === 0) {
          addBotMessage("ขณะนี้ยังไม่มี Guideline ในระบบครับ\n\nสามารถพิมพ์ `/add guideline` เพื่อเพิ่มข้อมูลได้เลยครับ");
        } else {
          const list = guidelines.map(g => `- **${g.name}** (เพิ่มเมื่อ ${new Date(g.date).toLocaleDateString()})`).join('\n');
          addBotMessage(`**Guidelines ที่มีอยู่ในระบบ:**\n\n${list}`);
        }
      }, 500);
      return;
    }

    // Command: Remove Guideline
    if (lowerText.startsWith('/remove guideline')) {
      const nameToRemove = text.substring('/remove guideline'.length).trim();
      setTimeout(() => {
        const target = guidelines.find(g => g.name.toLowerCase() === nameToRemove.toLowerCase());
        if (target) {
          setGuidelines(prev => prev.filter(g => g.id !== target.id));
          addBotMessage(`ลบ Guideline **${target.name}** ออกจากระบบเรียบร้อยแล้วครับ`);
        } else {
          addBotMessage(`ไม่พบ Guideline ชื่อ **${nameToRemove}** ในระบบครับ\n\nพิมพ์ \`/list guidelines\` เพื่อดูรายชื่อทั้งหมด`);
        }
      }, 500);
      return;
    }

    // Normal Chat Flow
    setIsLoading(true);
    try {
      // Filter out command messages from history to keep context clean
      const historyForAI = messages.filter(m => !m.text.startsWith('/'));
      
      const responseText = await generateClinicalResponse(text, historyForAI, guidelines);
      addBotMessage(responseText);
    } catch (error: any) {
      console.error("Error generating response:", error);
      const errorMessage = error?.message || String(error);
      
      if (errorMessage === "API_KEY_MISSING" || errorMessage.includes("process is not defined")) {
        addBotMessage("⚠️ **ข้อผิดพลาด:** ไม่พบ API Key ในระบบ\n\nหากคุณนำระบบนี้ไป Deploy บน Vercel กรุณาตั้งค่า Environment Variables โดยเพิ่มตัวแปรชื่อ `GEMINI_API_KEY` และใส่ค่า API Key ของคุณครับ\n\n**(สำคัญ: หลังจากเพิ่มตัวแปรใน Vercel แล้ว ต้องไปที่แท็บ Deployments แล้วกด Redeploy ด้วยครับ)**");
      } else if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        addBotMessage("⚠️ **โควต้าการใช้งาน API เต็ม (Quota Exceeded):**\n\nAPI Key ของคุณใช้งานเกินขีดจำกัดฟรีที่ Google กำหนดไว้สำหรับโมเดลนี้ (หรือบัญชีของคุณยังไม่เปิดใช้งาน Billing)\n\n**วิธีแก้ไข:**\n1. ลองสร้าง API Key ใหม่จากบัญชี Google อื่น\n2. หรือเข้าไปตั้งค่าผูกบัตรเครดิตใน Google AI Studio เพื่อปลดล็อกโควต้าครับ");
      } else {
        addBotMessage(`⚠️ **เกิดข้อผิดพลาดในการเชื่อมต่อ AI:**\n\`${errorMessage}\`\n\nกรุณาตรวจสอบการตั้งค่า API Key หรือลองใหม่อีกครั้งครับ`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(),
      role: 'model',
      text,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleAddGuideline = (guideline: Guideline) => {
    setGuidelines(prev => [...prev, guideline]);
    addBotMessage(`เพิ่ม Guideline **${guideline.name}** เข้าระบบเรียบร้อยแล้วครับ ตอนนี้คุณสามารถถามคำถามที่เกี่ยวข้องได้เลย`);
  };

  const handleRemoveGuideline = (id: string) => {
    const target = guidelines.find(g => g.id === id);
    if (target) {
      setGuidelines(prev => prev.filter(g => g.id !== id));
      if (selectedGuideline?.id === id) setSelectedGuideline(null);
      addBotMessage(`ลบ Guideline **${target.name}** ออกจากระบบเรียบร้อยแล้วครับ`);
    }
  };

  const handleViewGuideline = (id: string) => {
    const target = guidelines.find(g => g.id === id);
    if (target) {
      setSelectedGuideline(target);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f4f8] relative">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        guidelines={guidelines} 
        onAddClick={() => {
          setIsModalOpen(true);
          setIsSidebarOpen(false);
        }} 
        onRemove={handleRemoveGuideline}
        onView={(id) => {
          handleViewGuideline(id);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <ChatArea 
        messages={messages} 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading} 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <GuidelineModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddGuideline} 
      />

      {/* Guideline Content Viewer */}
      {selectedGuideline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] sm:rounded-[40px] w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col shadow-2xl shadow-slate-900/20 animate-in zoom-in-95 duration-300">
            <div className="p-6 sm:p-10 border-b border-slate-50 flex justify-between items-start bg-gradient-to-br from-blue-50/50 to-white">
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md border border-slate-100 shrink-0">
                  {selectedGuideline.type === 'pdf' ? (
                    <File className="w-5 h-5 sm:w-7 sm:h-7 text-rose-500" />
                  ) : selectedGuideline.type === 'link' ? (
                    <Link2 className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-500" />
                  ) : (
                    <FileText className="w-5 h-5 sm:w-7 sm:h-7 text-blue-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight mb-0.5 sm:mb-1 truncate">{selectedGuideline.name}</h3>
                  <p className="text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                    Added on {new Date(selectedGuideline.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedGuideline(null)}
                className="p-2 sm:p-3 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-all text-slate-400 hover:text-slate-600 active:scale-90"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-6 sm:p-10 overflow-y-auto text-slate-600 leading-relaxed font-medium text-[14px] sm:text-[16px]">
              {selectedGuideline.type === 'image' ? (
                <div className="flex justify-center">
                  <img src={selectedGuideline.content} alt={selectedGuideline.name} className="max-w-full h-auto rounded-xl sm:rounded-2xl shadow-lg border border-slate-100" />
                </div>
              ) : selectedGuideline.type === 'pdf' ? (
                <div className="w-full h-[50vh] sm:h-[60vh] rounded-xl sm:rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
                  <iframe
                    src={`data:application/pdf;base64,${selectedGuideline.content}`}
                    className="w-full h-full"
                    title={selectedGuideline.name}
                  />
                </div>
              ) : (
                <div className="whitespace-pre-wrap">
                  {selectedGuideline.content}
                </div>
              )}
            </div>
            <div className="p-6 sm:p-8 bg-slate-50/50 border-t border-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedGuideline(null)}
                className="w-full sm:w-auto px-8 py-3 bg-slate-800 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 active:scale-95"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
