export interface Guideline {
  id: string;
  name: string;
  type: 'text' | 'pdf' | 'link';
  content: string;
  date: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
