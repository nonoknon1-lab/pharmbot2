/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import GuidelineModal from './components/GuidelineModal';
import { Guideline, Message } from './types';
import { generateClinicalResponse } from './lib/gemini';

export default function App() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      addBotMessage(`ลบ Guideline **${target.name}** ออกจากระบบเรียบร้อยแล้วครับ`);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7fa]">
      <Sidebar 
        guidelines={guidelines} 
        onAddClick={() => setIsModalOpen(true)} 
        onRemove={handleRemoveGuideline}
      />
      
      <ChatArea 
        messages={messages} 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading} 
      />
      
      <GuidelineModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddGuideline} 
      />
    </div>
  );
}
