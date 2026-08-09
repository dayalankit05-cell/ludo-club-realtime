import React, { useState } from 'react';
import { ChatMessage, PlayerColor } from '../types';
import { MessageSquare, Send, Smile } from 'lucide-react';
import { playSound } from '../lib/audio';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, emoji?: string) => void;
}

const QUICK_EMOJIS = ['🎲', '👑', '😂', '🔥', '😭', '🎯', '👏', '⚡'];

const COLOR_NAME_CLASSES: Record<PlayerColor, string> = {
  red: 'text-red-400',
  green: 'text-emerald-400',
  yellow: 'text-amber-300',
  blue: 'text-cyan-400',
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText);
    playSound.chat();
    setInputText('');
  };

  const handleEmojiClick = (emoji: string) => {
    onSendMessage(emoji, emoji);
    playSound.chat();
  };

  return (
    <div className="w-full max-w-[620px]">
      {/* Toggle Bar / Emoji Row */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-900/80 border border-white/20 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
        >
          <MessageSquare className="w-4 h-4 text-amber-300" />
          <span>Chat ({messages.length})</span>
        </button>

        {/* Quick Reaction Emojis */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 active:scale-95 text-base flex items-center justify-center transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Chat Log Drawer */}
      {isOpen && (
        <div className="mt-2 p-3 rounded-2xl bg-slate-950/90 border border-white/20 backdrop-blur-2xl flex flex-col gap-3 max-h-60 shadow-2xl">
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 text-xs">
            {messages.length === 0 ? (
              <span className="text-white/40 text-center py-4">No messages yet. Say hi! 👋</span>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`font-bold ${COLOR_NAME_CLASSES[msg.senderColor]}`}>
                      {msg.senderName}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-white/90 font-medium">{msg.text}</span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white text-xs focus:outline-none focus:border-amber-300"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
