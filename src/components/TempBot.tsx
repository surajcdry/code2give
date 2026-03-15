"use client";

import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#FFCC10] p-4 flex justify-between items-center">
            <span className="font-bold text-gray-900">LemonAid Assistant</span>
            <button onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>
          <div className="flex-1 p-4 bg-gray-50 overflow-y-auto text-sm text-gray-600">
            Hi! How can I help you with food resources today?
          </div>
          <div className="p-3 border-t bg-white flex gap-2">
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="flex-1 text-xs border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button className="bg-purple-600 text-white p-2 rounded-lg">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-black text-[#FFCC10] rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}