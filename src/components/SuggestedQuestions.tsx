import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
  className?: string;
}

const QUESTIONS = [
  "ผู้ป่วยเด็กเป็นหูชั้นในอักเสบคนไหนควรได้ยาปฏิชีวนะ?",
  "ขนาดยา Amoxicillin สำหรับเด็กที่เป็น Acute Otitis Media คือเท่าไหร่?",
  "First-line treatment สำหรับ Acute Bacterial Rhinosinusitis (ABRS) คืออะไร?",
  "ผู้ป่วยแพ้ Penicillin แบบ Anaphylaxis ใช้ยาอะไรแทนในโรค Pharyngitis?",
  "ข้อบ่งชี้ในการสั่งจ่าย Oseltamivir ในผู้ป่วยไข้หวัดใหญ่มีอะไรบ้าง?",
  "ระยะเวลาในการให้ยาปฏิชีวนะสำหรับ Strep throat คือกี่วัน?"
];

export default function SuggestedQuestions({ onSelectQuestion, className }: SuggestedQuestionsProps) {
  return (
    <div className={cn("w-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]", className)}>
      <div className="flex items-center gap-2 px-1 w-max mx-auto sm:mx-0">
        {QUESTIONS.map((q, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectQuestion(q)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-full shadow-sm hover:bg-white hover:border-slate-300 hover:shadow-md transition-all whitespace-nowrap group"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 group-hover:text-emerald-600" />
            <span className="text-[13px] font-medium text-slate-600 group-hover:text-slate-800">{q}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
