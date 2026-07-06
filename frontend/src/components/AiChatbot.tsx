'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, MessageSquare, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'model';
  parts: string;
}

export const AiChatbot = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: "Hi there! I'm FinanceFlow AI, your smart financial guide. I have access to your accounts, budgets, and transactions in real-time. Ask me things like:\n\n* *'How much did I spend on food last month?'*\n* *'What are my largest expenses?'*\n* *'Give me tips to save money!'*",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = [
    'How much did I spend on food last month?',
    'Show my largest expenses.',
    'Am I on track with my budgets?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', parts: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Pass the conversation history (excluding the first welcome message to keep it clean)
      const chatHistory = messages
        .slice(1)
        .map((m) => ({ role: m.role, parts: m.parts }));

      const res = await api.post('/ai/chat', {
        prompt: text,
        history: [...chatHistory, { role: 'user', parts: text }],
      });

      const modelReply = res.data.data.reply;
      setMessages((prev) => [...prev, { role: 'model', parts: modelReply }]);
    } catch (err) {
      console.error('AI chat failed:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'model', parts: 'Sorry, I had trouble processing that request. Please verify that your Gemini API Key is configured correctly.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'model',
        parts: "Chat history cleared. I'm ready to answer any new questions about your spending and budgets!",
      },
    ]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/25 backdrop-blur-xs z-40" onClick={onClose} />

          {/* Chat drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#7C5CFF] flex items-center justify-center text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">FinanceFlow AI Assistant</h3>
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Online & Learning
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  title="Clear conversation"
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/50 dark:border-slate-800'
                      }`}
                    >
                      {/* Very simple markdown renderer helper for chatbot formatting */}
                      <div className="space-y-1 whitespace-pre-line">
                        {m.parts.split('\n').map((line, lIdx) => {
                          let processed = line;
                          // Handle bold formatting (*text*)
                          const boldMatch = processed.match(/\*(.*?)\*/g);
                          if (boldMatch) {
                            return (
                              <p key={lIdx} className="m-0">
                                {processed.split('*').map((part, pIdx) => 
                                  pIdx % 2 === 1 ? <strong key={pIdx}>{part}</strong> : part
                                )}
                              </p>
                            );
                          }
                          // Handle bullet lists
                          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                            return (
                              <li key={lIdx} className="ml-3 list-disc">
                                {line.substring(2)}
                              </li>
                            );
                          }
                          return <p key={lIdx} className="m-0">{line}</p>;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                    <Bot className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-400 p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-1 border border-slate-200/50 dark:border-slate-800">
                    FinanceFlow AI is thinking
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse delay-75">.</span>
                    <span className="animate-pulse delay-150">.</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Suggestions */}
            {messages.length < 3 && (
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 bg-slate-50/50 dark:bg-slate-900/30">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/50 text-left transition"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                placeholder="Ask FinanceFlow AI about your spending..."
                className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-slate-800 dark:text-white"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={isLoading || !input.trim()}
                className="bg-[#7C5CFF] hover:bg-[#6c4ef2] disabled:opacity-50 text-white p-2 rounded-xl transition flex items-center justify-center flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
