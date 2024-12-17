"use client";

import { useState } from "react";
import Image from "next/image";
import { Send } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "anky";
  timestamp: Date;
}

export default function AnkyPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "hello hello",
      sender: "anky",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate Anky's response
    setTimeout(() => {
      const ankyMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "if you are reading this and think this is a good idea, please let @jpfraneto know on a DC why",
        sender: "anky",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, ankyMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-black text-white pb-16 overflow-y-scroll">
      {/* Chat Header */}
      <div className="flex items-center p-4 border-b border-gray-800">
        <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
          <Image
            src="https://github.com/jpfraneto/images/blob/main/anky.png?raw=true"
            alt="Anky"
            width={40}
            height={40}
          />
        </div>
        <div>
          <h1 className="text-lg font-bold">Anky</h1>
          <p className="text-sm text-gray-400">Your writing companion</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.sender === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-white"
              }`}
            >
              <p>{message.text}</p>
              <p className="text-xs text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Write something..."
            className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <button
            onClick={handleSendMessage}
            className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
