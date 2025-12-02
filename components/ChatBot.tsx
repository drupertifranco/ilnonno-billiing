import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { X, Send, Sparkles, Bot, Loader2 } from 'lucide-react';
import { Employee, Transaction } from '../types';

interface ChatBotProps {
  employees: Employee[];
  transactions: Transaction[];
  currentUser: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const ChatBot: React.FC<ChatBotProps> = ({ employees, transactions, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'model', text: `Buon giorno, ${currentUser}! I am your IlNonno Assistant. Ask me about debts, reports, or credits.` }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Initialize Chat Session with Data Context when opened
  useEffect(() => {
    if (isOpen && !chatSessionRef.current) {
      initChat();
    }
  }, [isOpen]);

  const initChat = () => {
    try {
      if (!process.env.API_KEY) return;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const empSummary = employees.map(e => 
        `${e.name} (${e.department}): Balance $${e.currentBalance}/${e.creditLimit}`
      ).join('\n');

      const recentTx = transactions.slice(0, 20).map(t => 
        `${t.timestamp}: ${t.type} $${t.amount} for ${t.note} by ${t.performedBy}`
      ).join('\n');

      const systemInstruction = `You are the AI Assistant for "IlNonno", an artisanal canteen. 
      Your tone should be helpful, professional, but with a slight touch of Italian warmth.
      
      CURRENT DATABASE CONTEXT:
      Employees:
      ${empSummary}

      Recent Transactions:
      ${recentTx}

      RULES:
      1. Use 'gemini-3-pro-preview' intelligence.
      2. If asked for a report, structure it professionally.
      3. Be concise.
      `;

      chatSessionRef.current = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: systemInstruction,
        },
      });
    } catch (error) {
      console.error("Failed to init chat", error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chatSessionRef.current) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const result = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
      
      let fullResponse = '';
      const botMsgId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '' }]);

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullResponse += c.text;
          setMessages(prev => 
            prev.map(m => m.id === botMsgId ? { ...m, text: fullResponse } : m)
          );
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Connection error. Prego, try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-terracotta text-white p-4 rounded-full shadow-2xl hover:bg-terracotta-dark transition duration-300 z-50 flex items-center justify-center group"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-crema rounded-2xl shadow-2xl flex flex-col border border-espresso/20 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-espresso text-crema p-4 rounded-t-2xl flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-terracotta p-1.5 rounded-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm font-serif">IlNonno AI</h3>
                <p className="text-[10px] text-sage flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Powered by Gemini
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="hover:bg-white/10 p-1 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-crema">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-terracotta text-white rounded-br-none'
                      : 'bg-white text-espresso border border-sage/20 rounded-bl-none'
                  }`}
                >
                   <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            ))}
            {isTyping && (
               <div className="flex justify-start">
                 <div className="bg-white border border-sage/20 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-sage" />
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-espresso/10 rounded-b-2xl">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask IlNonno..."
                className="w-full pl-4 pr-12 py-3 bg-crema border-none rounded-xl focus:ring-2 focus:ring-terracotta text-sm text-espresso placeholder-sage/50 transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="absolute right-2 p-2 bg-terracotta text-white rounded-lg hover:bg-terracotta-dark disabled:opacity-50 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};