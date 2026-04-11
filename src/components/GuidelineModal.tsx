import React, { useState, useRef } from 'react';
import { X, Upload, Link2, FileText, File, Loader2 } from 'lucide-react';
import { Guideline } from '../types';
import { extractTextFromPDF } from '../lib/pdf';
import { storage } from '../lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { User } from 'firebase/auth';
import { extractTextWithAI } from '../lib/gemini';

interface GuidelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (guideline: Guideline, isGlobal: boolean) => void;
  isAdmin: boolean;
  user?: User | null;
}

export default function GuidelineModal({ isOpen, onClose, onAdd, isAdmin, user }: GuidelineModalProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'text' | 'link' | 'image'>('file');
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useAIOCR, setUseAIOCR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const MAX_TEXT_SIZE = 700 * 1024; // 700KB limit for text/base64 to stay under Firestore's 1MB limit for Guest
  const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB limit for PDFs
  const MAX_AI_OCR_SIZE = 15 * 1024 * 1024; // 15MB limit for AI OCR

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.type === 'application/pdf') {
      if (file.size > MAX_PDF_SIZE) {
        setError(`ไฟล์ PDF "${file.name}" มีขนาดใหญ่เกินไป (${(file.size / (1024 * 1024)).toFixed(1)}MB). ระบบจำกัดขนาดไฟล์ PDF ไม่เกิน 50MB ครับ`);
        return;
      }

      if (useAIOCR && file.size > MAX_AI_OCR_SIZE) {
        setError(`ไฟล์ PDF สำหรับการใช้ AI ช่วยอ่าน ต้องมีขนาดไม่เกิน 15MB ครับ (ขนาดไฟล์ปัจจุบัน: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
        return;
      }

      setIsProcessing(true);
      try {
        let extractedText = "";
        
        if (useAIOCR) {
          extractedText = await extractTextWithAI(file);
        } else {
          extractedText = await extractTextFromPDF(file);
          // Fallback to AI OCR if text is empty (likely scanned PDF)
          if (extractedText.trim().length < 50 && file.size <= MAX_AI_OCR_SIZE) {
            console.log("PDF seems to be scanned. Falling back to AI OCR...");
            extractedText = await extractTextWithAI(file);
          } else if (extractedText.trim().length < 50) {
            throw new Error("ไฟล์ PDF ดูเหมือนจะเป็นรูปภาพสแกน แต่มีขนาดใหญ่เกินกว่าที่ AI จะช่วยอ่านได้ (จำกัด 15MB)");
          }
        }

        const id = Date.now().toString();
        let storageUrl = undefined;
        let content: string | undefined = extractedText;

        const textBlobSize = new Blob([extractedText]).size;

        if (user) {
          if (textBlobSize > 800 * 1024) {
            // Only use Storage if text is > 800KB to bypass Firestore 1MB limit
            const storagePath = isGlobal ? `global_guidelines/${id}.txt` : `users/${user.uid}/guidelines/${id}.txt`;
            const textRef = ref(storage, storagePath);
            await uploadString(textRef, extractedText);
            storageUrl = await getDownloadURL(textRef);
            content = undefined; 
          }
        } else {
          if (textBlobSize > MAX_TEXT_SIZE) {
            setError(`เนื้อหาในไฟล์ PDF มีปริมาณมากเกินไป (${(textBlobSize / 1024).toFixed(0)}KB). ระบบจำกัดขนาดข้อความไม่เกิน 700KB สำหรับผู้ใช้ทั่วไป (Guest) ครับ กรุณาเข้าสู่ระบบเพื่ออัปโหลดไฟล์ขนาดใหญ่`);
            setIsProcessing(false);
            return;
          }
        }

        onAdd({
          id,
          name: file.name,
          type: 'pdf',
          content,
          storageUrl,
          date: new Date().toISOString()
        }, isGlobal);
        onClose();
      } catch (err: any) {
        console.error("PDF Upload/Extraction Error:", err);
        if (err?.code?.startsWith('storage/')) {
          setError(`เกิดข้อผิดพลาดในการอัปโหลดไปยัง Cloud Storage: ${err.message} (กรุณาตรวจสอบการตั้งค่า Firebase Storage Rules)`);
        } else {
          setError(`ไม่สามารถอ่านข้อความจากไฟล์ PDF ได้ อาจเป็นไฟล์ที่ถูกล็อคหรือเป็นไฟล์รูปภาพสแกนครับ (${err.message || 'Unknown Error'})`);
        }
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Handle TXT files
      const reader = new FileReader();
      reader.onload = async (event) => {
        const extractedText = event.target?.result as string;
        const id = Date.now().toString();
        let storageUrl = undefined;
        let content: string | undefined = extractedText;

        setIsProcessing(true);
        try {
          const textBlobSize = new Blob([extractedText]).size;

          if (user) {
            if (textBlobSize > 800 * 1024) {
              const storagePath = isGlobal ? `global_guidelines/${id}.txt` : `users/${user.uid}/guidelines/${id}.txt`;
              const textRef = ref(storage, storagePath);
              await uploadString(textRef, extractedText);
              storageUrl = await getDownloadURL(textRef);
              content = undefined;
            }
          } else {
            if (file.size > MAX_TEXT_SIZE) {
              setError(`ไฟล์ "${file.name}" มีขนาดใหญ่เกินไป (${(file.size / 1024).toFixed(0)}KB). ระบบจำกัดขนาดไฟล์ไม่เกิน 700KB สำหรับผู้ใช้ทั่วไป (Guest) ครับ กรุณาเข้าสู่ระบบเพื่ออัปโหลดไฟล์ขนาดใหญ่`);
              setIsProcessing(false);
              return;
            }
          }

          onAdd({
            id,
            name: file.name,
            type: 'text',
            content,
            storageUrl,
            date: new Date().toISOString()
          }, isGlobal);
          onClose();
        } catch (err: any) {
          console.error("TXT Upload Error:", err);
          if (err?.code?.startsWith('storage/')) {
            setError(`เกิดข้อผิดพลาดในการอัปโหลดไปยัง Cloud Storage: ${err.message} (กรุณาตรวจสอบการตั้งค่า Firebase Storage Rules)`);
          } else {
            setError(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์ข้อความ (${err.message || 'Unknown Error'})`);
          }
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > MAX_TEXT_SIZE) {
      setError(`รูปภาพ "${file.name}" มีขนาดใหญ่เกินไป (${(file.size / 1024).toFixed(0)}KB). ระบบจำกัดขนาดไฟล์ไม่เกิน 700KB ครับ`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      onAdd({
        id: Date.now().toString(),
        name: file.name,
        type: 'image',
        content: event.target?.result as string,
        date: new Date().toISOString()
      }, isGlobal);
      onClose();
    };
    reader.readAsDataURL(file);
  };

  const handleAddText = () => {
    if (!textName.trim() || !textContent.trim()) return;
    setError(null);

    // Calculate approximate size (UTF-8)
    const size = new Blob([textContent]).size;
    if (size > MAX_TEXT_SIZE) {
      setError(`ข้อความมีขนาดใหญ่เกินไป (${(size / 1024).toFixed(0)}KB). ระบบจำกัดขนาดข้อมูลไม่เกิน 700KB ครับ`);
      return;
    }

    onAdd({
      id: Date.now().toString(),
      name: textName.trim() + '.txt',
      type: 'text',
      content: textContent.trim(),
      date: new Date().toISOString()
    }, isGlobal);
    setTextName('');
    setTextContent('');
    onClose();
  };

  const handleAddLink = () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    onAdd({
      id: Date.now().toString(),
      name: linkName.trim(),
      type: 'link',
      content: linkUrl.trim(),
      date: new Date().toISOString()
    }, isGlobal);
    setLinkName('');
    setLinkUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/60">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100/80">
          <h3 className="text-lg font-semibold text-slate-900">Add Guideline</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="flex p-1 bg-slate-100/80 rounded-xl mb-6 overflow-x-auto">
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setActiveTab('file'); setError(null); }}
            >
              Upload File
            </button>
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'image' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setActiveTab('image'); setError(null); }}
            >
              Upload Image
            </button>
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'link' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setActiveTab('link'); setError(null); }}
            >
              Web Link
            </button>
            <button
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setActiveTab('text'); setError(null); }}
            >
              Paste Text
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="text-rose-500 shrink-0 mt-0.5">⚠️</span>
              <p className="text-xs font-bold text-rose-600 leading-relaxed">{error}</p>
            </div>
          )}

          {isAdmin && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <input
                type="checkbox"
                id="isGlobal"
                checked={isGlobal}
                onChange={(e) => setIsGlobal(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isGlobal" className="text-sm font-bold text-slate-700 cursor-pointer">
                Add to Global Database (Shared with everyone)
              </label>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-10 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => !isProcessing && fileInputRef.current?.click()}>
                <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  {isProcessing ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin" /> : <Upload className="w-5 h-5 text-blue-600" />}
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {isProcessing ? 'กำลังประมวลผลไฟล์...' : 'Click to upload document'}
                </p>
                <p className="text-xs text-slate-500">Supports PDF (Max 50MB), TXT</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                <input 
                  type="checkbox" 
                  checked={useAIOCR} 
                  onChange={(e) => setUseAIOCR(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  disabled={isProcessing}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700">ใช้ AI ช่วยอ่านไฟล์สแกน (OCR)</span>
                  <span className="text-xs text-slate-500">สำหรับไฟล์ PDF ที่เป็นรูปภาพสแกน (จำกัดขนาดไฟล์ไม่เกิน 15MB) อาจใช้เวลานานขึ้น</span>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-10 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => imageInputRef.current?.click()}>
              <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <File className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1">Click to upload image</p>
              <p className="text-xs text-slate-500">Supports PNG, JPG, WEBP</p>
              <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
          )}

          {activeTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Guideline Name</label>
                <input
                  type="text"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="e.g. AHA Hypertension 2024"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">URL Link</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Link2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleAddLink}
                disabled={!linkName.trim() || !linkUrl.trim()}
                className="w-full py-2.5 mt-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Add Link Guideline
              </button>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Guideline Name</label>
                <input
                  type="text"
                  value={textName}
                  onChange={(e) => setTextName(e.target.value)}
                  placeholder="e.g. Local Hospital Protocol"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Content</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste guideline text here..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl h-40 resize-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              <button
                onClick={handleAddText}
                disabled={!textName.trim() || !textContent.trim()}
                className="w-full py-2.5 mt-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Save Text Guideline
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
