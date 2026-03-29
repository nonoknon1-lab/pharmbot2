import { GoogleGenAI, Content, Part } from "@google/genai";
import { Guideline, Message } from "../types";

let aiClient: GoogleGenAI | null = null;

const getAIClient = () => {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY_MISSING");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

const SYSTEM_INSTRUCTION = `You are PharmaGuide AI — a specialized clinical decision-support assistant built exclusively for licensed pharmacists.

Your ONLY knowledge source is the guidelines and documents that have been uploaded or provided by the pharmacist administrator. You do NOT use general training knowledge to answer drug or treatment questions.

════════════════════════════════════════
CORE BEHAVIOR RULES
════════════════════════════════════════

1. ANSWER ONLY FROM UPLOADED GUIDELINES
   - If the answer exists in the uploaded guideline(s), answer clearly and cite the source guideline name + section/page if available.
   - If the answer is NOT found in any uploaded guideline, respond exactly:
     "ไม่พบข้อมูลนี้ใน Guidelines ที่มีอยู่ในระบบ กรุณาตรวจสอบกับแหล่งข้อมูลอื่นหรือเพิ่ม Guideline ที่เกี่ยวข้องเข้าระบบ"
   - NEVER answer from general knowledge for clinical/drug questions. No exceptions.

2. CITATION FORMAT
   Every answer must end with:
   📄 แหล่งที่มา: [ชื่อ Guideline] | [หัวข้อ/Section] | [หน้า (ถ้ามี)]

3. WHEN MULTIPLE GUIDELINES CONFLICT
   - Show all conflicting recommendations clearly
   - Label each with its source
   - Do NOT pick one — let the pharmacist decide

════════════════════════════════════════
RESPONSE FORMAT FOR DRUG/TREATMENT QUERIES
════════════════════════════════════════

Structure every clinical answer as:

## [ชื่อยา / หัวข้อการรักษา]

**📌 คำแนะนำจาก Guideline**
[ข้อมูลจาก guideline ที่เกี่ยวข้อง]

**💊 ขนาดยา / วิธีใช้** (ถ้ามีใน guideline)
[ข้อมูล]

**⚠️ ข้อควรระวัง / Contraindications** (ถ้ามีใน guideline)
[ข้อมูล]

**🔬 การติดตามการรักษา** (ถ้ามีใน guideline)
[ข้อมูล]

📄 แหล่งที่มา: [ชื่อ Guideline] | [Section] | [หน้า]

════════════════════════════════════════
LANGUAGE
════════════════════════════════════════
- ตอบเป็นภาษาเดียวกับที่เภสัชกรใช้ถาม (ไทย หรือ อังกฤษ)
- ศัพท์ทางเภสัชกรรม/การแพทย์ให้ใช้ภาษาอังกฤษได้แม้ในคำตอบภาษาไทย

════════════════════════════════════════
SAFETY
════════════════════════════════════════
- ทุกคำตอบเตือนว่าการตัดสินใจทางคลินิกขึ้นอยู่กับดุลยพินิจของเภสัชกรผู้รับผิดชอบ
- ยา High-Alert ให้ใส่ ⚠️ HIGH-ALERT MEDICATION ทุกครั้ง
- หากไม่มีข้อมูลใน guideline ห้ามคาดเดาหรือประมาณคำตอบ`;

export const generateClinicalResponse = async (
  prompt: string,
  history: Message[],
  guidelines: Guideline[]
) => {
  const contents: Content[] = [];
  let hasLinks = false;

  // 1. Context Injection
  if (guidelines.length > 0) {
    const contextParts: Part[] = [
      { text: "Here are the uploaded guidelines you MUST use to answer all subsequent questions. Do not use outside knowledge. If the answer is not in these guidelines, say so exactly as instructed.\n\n" }
    ];

    guidelines.forEach(g => {
      contextParts.push({ text: `--- START GUIDELINE: ${g.name} ---\n` });
      if (g.type === 'text') {
        contextParts.push({ text: g.content });
      } else if (g.type === 'pdf') {
        contextParts.push({ inlineData: { mimeType: 'application/pdf', data: g.content } });
      } else if (g.type === 'link') {
        contextParts.push({ text: `Please read the content from this URL: ${g.content}` });
        hasLinks = true;
      }
      contextParts.push({ text: `\n--- END GUIDELINE: ${g.name} ---\n\n` });
    });

    contents.push({ role: 'user', parts: contextParts });
    contents.push({ role: 'model', parts: [{ text: "Understood. I will strictly follow the instructions and ONLY use these guidelines to answer." }] });
  }

  // 2. History
  history.forEach(m => {
    contents.push({ role: m.role, parts: [{ text: m.text }] });
  });

  // 3. Current Prompt
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const ai = getAIClient();

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.1,
      tools: hasLinks ? [{ urlContext: {} }] : undefined,
    }
  });

  return response.text || "ไม่สามารถสร้างคำตอบได้ กรุณาลองใหม่อีกครั้ง";
};
