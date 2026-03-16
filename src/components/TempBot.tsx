"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useApp } from "@/components/layout/AppLayout";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function ChatBot() {
  const { role } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! Looking to make an impact? I can help you find where donations are needed most." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const greetings: Record<string, string> = {
      internal: "Hi! What would you like to know about system health or pantry data?",
      government: "Hi! How can I help you explore food access coverage and gaps?",
      donor: "Hi! Looking to make an impact? I can help you find where donations are needed most.",
      provider: "Hi! How can I help you with your pantry's performance and insights?",
      client: "Hi! Looking for food resources near you? I can help you find nearby pantries.",
    };
    setMessages([{ role: "assistant", content: greetings[role] ?? "Hi! How can I help you with food resources today?" }]);
  }, [role]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.slice(-6), role }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-9999">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-[#FFCC10] p-4 flex justify-between items-center">
            <span className="font-bold text-gray-900">LemonAid Assistant</span>
            <button onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>
          <div className="flex-1 p-4 bg-gray-50 overflow-y-auto text-sm text-gray-600 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`px-3 py-2 rounded-xl max-w-[80%] text-xs ${m.role === "user" ? "bg-purple-600 text-white" : "bg-white border text-gray-700"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-gray-400">Typing...</div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t bg-white flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              className="flex-1 text-xs border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button onClick={sendMessage} className="bg-purple-600 text-white p-2 rounded-lg">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-black text-[#FFCC10] rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}