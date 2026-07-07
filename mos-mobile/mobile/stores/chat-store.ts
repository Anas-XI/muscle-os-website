import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  addMessage: (msg: Message) => void;
  setMessages: (msgs: Message[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  loading: false,
  error: null,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
}));
