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

export const extractTextWithAI = async (file: File): Promise<string> => {
  const ai = getAIClient();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: file.type, data: base64 } },
          { text: "Extract all text from this document accurately. Preserve the original structure, formatting, and language (especially Thai). Do not add any conversational filler, just return the extracted text." }
        ]
      }
    ]
  });
  return response.text || "";
};

export const generateClinicalResponse = async (
  prompt: string,
  history: Message[],
  guidelines: Guideline[]
) => {
  const contents: Content[] = [];
  let hasLinks = false;

  // 1. Context Injection - Simple RAG (Keyword Match)
  // Always include the 2 most recent guidelines
  const recentGuidelines = guidelines.slice(0, 2);
  
  // Filter guidelines to only include those relevant to the prompt to save tokens and avoid quota issues
  const keywords = prompt.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  const relevantGuidelines = guidelines.filter(g => {
    // Always include if prompt is short or no keywords extracted
    if (keywords.length === 0) return true;
    
    const nameMatch = keywords.some(k => g.name.toLowerCase().includes(k));
    const contentMatch = (g.type === 'text' || (g.type === 'pdf' && !g.content.startsWith('JVBERi'))) && keywords.some(k => g.content.toLowerCase().includes(k));
    
    return nameMatch || contentMatch;
  });

  // Combine recent and relevant, deduplicate, and limit to 5
  const contextGuidelines = Array.from(new Set([...recentGuidelines, ...relevantGuidelines])).slice(0, 5);

  if (contextGuidelines.length > 0) {
    const contextParts: Part[] = [
      { text: "Here are the relevant uploaded guidelines you MUST use to answer all subsequent questions. Do not use outside knowledge. If the answer is not in these guidelines, say so exactly as instructed.\n\n" }
    ];

    for (const g of contextGuidelines) {
      contextParts.push({ text: `--- START GUIDELINE: ${g.name} ---\n` });
      
      let contentToUse = g.content || "";
      if (!contentToUse && g.storageUrl) {
        try {
          const res = await fetch(g.storageUrl);
          contentToUse = await res.text();
        } catch (err) {
          console.error(`Failed to fetch content for ${g.name} from storage:`, err);
          contentToUse = "[Error: Could not load content from storage]";
        }
      }

      if (g.type === 'text' || g.type === 'pdf') {
        // Truncate very long text guidelines to save tokens
        // Gemini 3 Flash has a 2M token limit, so we can allow more text, e.g. 500,000 chars
        const truncatedContent = contentToUse.length > 500000 ? contentToUse.substring(0, 500000) + "... [truncated]" : contentToUse;
        contextParts.push({ text: truncatedContent });
      } else if (g.type === 'link') {
        contextParts.push({ text: `Please read the content from this URL: ${contentToUse}` });
        hasLinks = true;
      }
      contextParts.push({ text: `\n--- END GUIDELINE: ${g.name} ---\n\n` });
    }

    contents.push({ role: 'user', parts: contextParts });
    contents.push({ role: 'model', parts: [{ text: "Understood. I will strictly follow the instructions and ONLY use these relevant guidelines to answer." }] });
  }

  // 2. History
  history.forEach(m => {
    contents.push({ role: m.role, parts: [{ text: m.text }] });
  });

  // 3. Current Prompt
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const ai = getAIClient();

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.1,
      tools: hasLinks ? [{ urlContext: {} }] : undefined,
    }
  });

  return response.text || "ไม่สามารถสร้างคำตอบได้ กรุณาลองใหม่อีกครั้ง";
};
