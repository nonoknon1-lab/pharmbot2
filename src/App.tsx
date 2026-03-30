/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import GuidelineModal from './components/GuidelineModal';
import ErrorBoundary from './components/ErrorBoundary';
import { Guideline, Message } from './types';
import { generateClinicalResponse } from './lib/gemini';
import { File, FileText, Link2, X, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logOut, 
  handleFirestoreError, 
  OperationType 
} from './lib/firebase';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

import { get, set } from 'idb-keyval';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [localGuidelines, setLocalGuidelines] = useState<Guideline[]>([]);
  const [globalGuidelines, setGlobalGuidelines] = useState<Guideline[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuideline, setSelectedGuideline] = useState<Guideline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load Local Guidelines on mount
  useEffect(() => {
    const loadLocal = async () => {
      try {
        const saved = await get<Guideline[]>('local_guidelines');
        if (saved) setLocalGuidelines(saved);
      } catch (err) {
        console.error("Failed to load local guidelines:", err);
      }
    };
    loadLocal();
  }, []);

  // Handle Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      // If user is logged in, save their profile to Firestore
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          lastLogin: serverTimestamp()
        }, { merge: true }).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Guidelines from Firestore
  useEffect(() => {
    if (!isAuthReady || !user?.uid) {
      setGuidelines([]);
      return;
    }

    const uid = user.uid;
    const guidelinesPath = `users/${uid}/guidelines`;
    const q = query(collection(db, guidelinesPath), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as Guideline);
      setGuidelines(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, guidelinesPath);
    });

    return () => unsubscribe();
  }, [user?.uid, isAuthReady]);

  // Sync Global Guidelines from Firestore
  useEffect(() => {
    const globalPath = 'global_guidelines';
    const q = query(collection(db, globalPath), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as Guideline);
      setGlobalGuidelines(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, globalPath);
    });

    return () => unsubscribe();
  }, []);

  const allGuidelines = [...globalGuidelines, ...guidelines, ...localGuidelines];
  const isAdmin = user?.email === "nonoknon1@gmail.com";

  const handleLogin = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        addBotMessage("⚠️ การเข้าสู่ระบบถูกยกเลิกเนื่องจากหน้าต่างถูกปิดก่อนเสร็จสิ้นครับ กรุณาลองใหม่อีกครั้งหากต้องการใช้งานฟีเจอร์ที่ต้องระบุตัวตน");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore this one as it usually happens when multiple popups are opened
      } else {
        console.error("Auth Error:", error);
        addBotMessage(`⚠️ เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ${error.message}`);
      }
    }
  };

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
      if (!user) {
        addBotMessage("กรุณาเข้าสู่ระบบก่อนเพิ่ม Guideline ครับ");
        return;
      }
      setTimeout(() => {
        addBotMessage("กรุณาอัปโหลดไฟล์ (PDF/TXT), วางข้อความ, หรือใส่ Link ของ Guideline ที่ต้องการเพิ่มได้เลยครับ ระบบจะบันทึกและใช้เป็นแหล่งข้อมูลสำหรับการตอบคำถามทันที");
        setIsModalOpen(true);
      }, 500);
      return;
    }

    // Command: List Guidelines
    if (lowerText === '/list guidelines' || lowerText === 'ดู guideline ที่มี') {
      setTimeout(() => {
        if (!user) {
          addBotMessage("กรุณาเข้าสู่ระบบเพื่อดู Guideline ของคุณครับ");
          return;
        }
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
      if (!user) {
        addBotMessage("กรุณาเข้าสู่ระบบก่อนลบ Guideline ครับ");
        return;
      }
      const nameToRemove = text.substring('/remove guideline'.length).trim();
      setTimeout(() => {
        const target = guidelines.find(g => g.name.toLowerCase() === nameToRemove.toLowerCase());
        if (target) {
          handleRemoveGuideline(target.id);
        } else {
          addBotMessage(`ไม่พบ Guideline ชื่อ **${nameToRemove}** ในระบบครับ\n\nพิมพ์ \`/list guidelines\` เพื่อดูรายชื่อทั้งหมด`);
        }
      }, 500);
      return;
    }

    // Normal Chat Flow
    setIsLoading(true);
    try {
      const historyForAI = messages.filter(m => !m.text.startsWith('/'));
      const responseText = await generateClinicalResponse(text, historyForAI, allGuidelines);
      addBotMessage(responseText);
    } catch (error: any) {
      console.error("Error generating response:", error);
      const errorMessage = error?.message || String(error);
      
      if (errorMessage === "API_KEY_MISSING" || errorMessage.includes("process is not defined")) {
        addBotMessage("⚠️ **ข้อผิดพลาด:** ไม่พบ API Key ในระบบ");
      } else if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        addBotMessage("⚠️ **โควต้าการใช้งาน API เต็ม (Quota Exceeded)**");
      } else {
        addBotMessage(`⚠️ **เกิดข้อผิดพลาดในการเชื่อมต่อ AI:**\n\`${errorMessage}\``);
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

  const handleAddGuideline = async (guideline: Guideline, isGlobal: boolean = false) => {
    if (isGlobal && !isAdmin) return;

    if (isGlobal) {
      const path = `global_guidelines/${guideline.id}`;
      try {
        await setDoc(doc(db, path), guideline);
        addBotMessage(`เพิ่ม Guideline **${guideline.name}** เข้าสู่ฐานข้อมูลกลางเรียบร้อยแล้วครับ`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      return;
    }

    // If user is logged in, save to Firestore
    if (user) {
      const path = `users/${user.uid}/guidelines/${guideline.id}`;
      try {
        await setDoc(doc(db, path), guideline);
        addBotMessage(`เพิ่ม Guideline **${guideline.name}** เข้าสู่ระบบเรียบร้อยแล้วครับ`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      // Guest Mode: Save to Local Storage (IndexedDB)
      const updatedLocal = [...localGuidelines, guideline];
      try {
        await set('local_guidelines', updatedLocal);
        setLocalGuidelines(updatedLocal);
        addBotMessage(`[Guest Mode] บันทึก Guideline **${guideline.name}** ไว้ในเครื่องของคุณเรียบร้อยแล้วครับ ข้อมูลนี้จะยังคงอยู่แม้คุณจะปิดเบราว์เซอร์ (แต่จะไม่ซิงค์กับเครื่องอื่นจนกว่าจะเข้าสู่ระบบ)`);
      } catch (err) {
        console.error("Failed to save local guideline:", err);
        addBotMessage("⚠️ ไม่สามารถบันทึกข้อมูลลงในเครื่องได้ กรุณาตรวจสอบพื้นที่ว่างในเบราว์เซอร์ครับ");
      }
    }
  };

  const handleRemoveGuideline = async (id: string) => {
    const target = allGuidelines.find(g => g.id === id);
    if (!target) return;

    // Check if it's a local guideline
    if (localGuidelines.some(g => g.id === id)) {
      const updatedLocal = localGuidelines.filter(g => g.id !== id);
      try {
        await set('local_guidelines', updatedLocal);
        setLocalGuidelines(updatedLocal);
        if (selectedGuideline?.id === id) setSelectedGuideline(null);
        addBotMessage(`ลบ Guideline **${target.name}** ออกจากเครื่องเรียบร้อยแล้วครับ`);
      } catch (err) {
        console.error("Failed to remove local guideline:", err);
      }
      return;
    }

    const isGlobal = globalGuidelines.some(g => g.id === id);
    
    if (isGlobal && !isAdmin) {
      addBotMessage("คุณไม่มีสิทธิ์ลบ Guideline จากฐานข้อมูลกลางครับ");
      return;
    }

    const path = isGlobal
      ? `global_guidelines/${id}`
      : `users/${user?.uid}/guidelines/${id}`;

    try {
      await deleteDoc(doc(db, path));
      if (selectedGuideline?.id === id) setSelectedGuideline(null);
      addBotMessage(`ลบ Guideline **${target.name}** ออกจาก${isGlobal ? 'ฐานข้อมูลกลาง' : 'ระบบ'}เรียบร้อยแล้วครับ`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleViewGuideline = (id: string) => {
    const target = allGuidelines.find(g => g.id === id);
    if (target) {
      setSelectedGuideline(target);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-[#f0f4f8] relative">
        {/* Mobile Sidebar Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <Sidebar 
          guidelines={allGuidelines} 
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
          user={user}
          onLogin={handleLogin}
          onLogout={logOut}
          isAdmin={isAdmin}
        />
        
        <ChatArea 
          messages={messages} 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          user={user}
        />
        
        <GuidelineModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onAdd={handleAddGuideline} 
          isAdmin={isAdmin}
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
    </ErrorBoundary>
  );
}
