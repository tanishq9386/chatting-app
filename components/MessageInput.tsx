'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput = ({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message..." 
}: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxLength = 1000;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled && !isComposing) {
      onSendMessage(message.trim());
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (but allow Shift+Enter for new lines)
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars <= 100;
  const isAtLimit = remainingChars <= 0;

  return (
    <div className="bg-zinc-700 border-t border-zinc-600">
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder={placeholder}
              className={`
                w-full p-3 bg-gray-100 text-black rounded-lg resize-none
                focus:outline-none focus:ring-2 focus:ring-blue-500
                transition-all duration-200 min-h-[44px] max-h-[120px]
                placeholder-gray-500
                ${disabled ? 'bg-gray-200 cursor-not-allowed opacity-60' : 'bg-gray-100'}
                ${isAtLimit ? 'ring-2 ring-red-500' : ''}
              `}
              disabled={disabled}
              maxLength={maxLength}
              rows={1}
            />
            
            {/* Character count */}
            {(isNearLimit || message.length > 0) && (
              <div className={`
                absolute -top-6 right-2 text-xs font-medium
                ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-gray-400'}
              `}>
                {message.length}/{maxLength}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className={`
              p-3 rounded-lg font-medium transition-all duration-200
              flex items-center justify-center min-w-[44px] min-h-[44px]
              ${disabled || !message.trim() || isAtLimit
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 hover:scale-105'
              }
            `}
            disabled={disabled || !message.trim() || isAtLimit}
            title={
              disabled 
                ? 'Chat is disconnected' 
                : !message.trim() 
                  ? 'Enter a message to send'
                  : isAtLimit
                    ? 'Message too long'
                    : 'Send message (Enter)'
            }
          >
            <Send size={20} />
          </button>
        </div>
        
        {/* Keyboard shortcut hint */}
        {!disabled && (
          <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {disabled && (
              <span className="text-red-400">Disconnected</span>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
