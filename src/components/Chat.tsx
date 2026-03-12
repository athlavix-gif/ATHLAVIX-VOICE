import React, { useState, useRef, useEffect } from "react";
import { Message, UserState } from "../types";
import { Send, Mic, Volume2, VolumeX, Sparkles, User, Bot, X, Image as ImageIcon, Camera } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { getGeminiSpeech } from "../services/geminiService";

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string, image?: string) => void;
  isTyping: boolean;
  userAvatar: string | null;
  botAvatar: string | null;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isTyping, userAvatar, botAvatar }) => {
  const [input, setInput] = useState("");
  const [interimInput, setInterimInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sttLang, setSttLang] = useState<"en-US" | "bn-BD">("en-US");
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = sttLang;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput(prev => prev + (prev ? " " : "") + finalTranscript);
          setInterimInput("");
        } else {
          setInterimInput(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'no-speech') {
          // Ignore no-speech error to keep listening if continuous
          return;
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        // Only reset if we didn't stop it manually or if it crashed
        if (isListening) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            setIsListening(false);
          }
        }
      };
    }
  }, [sttLang, isListening]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimInput("");
    } else {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = sttLang;
          recognitionRef.current.start();
          setIsListening(true);
        }
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (input.trim() || selectedImage) {
      onSendMessage(input.trim(), selectedImage || undefined);
      setInput("");
      setSelectedImage(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const speak = async (text: string) => {
    if (!isVoiceEnabled) return;

    // Stop existing audio if any
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Detect if text contains Bengali characters
    const hasBengali = /[\u0980-\u09FF]/.test(text);

    if (hasBengali) {
      // Fallback to browser TTS for Bengali as Gemini TTS might not be optimized for it yet
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('bn'));
      if (preferredVoice) utterance.voice = preferredVoice;
      window.speechSynthesis.speak(utterance);
    } else {
      // Use high-quality Gemini TTS for English
      const audioData = await getGeminiSpeech(text);
      if (audioData) {
        const audio = new Audio(audioData);
        audioRef.current = audio;
        audio.play().catch(err => console.error("Audio playback error:", err));
      } else {
        // Fallback to browser TTS if Gemini TTS fails
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes('en'));
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "model" && isVoiceEnabled) {
      speak(lastMessage.text);
    }
  }, [messages, isVoiceEnabled]);

  const formatDateSeparator = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) return "Today";
    if (messageDate.getTime() === yesterday.getTime()) return "Yesterday";
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/30 flex items-center justify-between bg-athlavix-accent/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-athlavix-accent flex items-center justify-center text-white shadow-lg">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-bold text-athlavix-accent">ATHLAVIX VOICE</h2>
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">Expert Specialist</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/50 rounded-lg p-1 border border-athlavix-accent/10">
            <button 
              onClick={() => setSttLang("en-US")}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${sttLang === "en-US" ? "bg-athlavix-accent text-white shadow-sm" : "text-athlavix-accent/60 hover:text-athlavix-accent"}`}
            >
              EN
            </button>
            <button 
              onClick={() => setSttLang("bn-BD")}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${sttLang === "bn-BD" ? "bg-athlavix-accent text-white shadow-sm" : "text-athlavix-accent/60 hover:text-athlavix-accent"}`}
            >
              BN
            </button>
          </div>
          <button 
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`p-2 rounded-full transition-all ${isVoiceEnabled ? 'bg-athlavix-accent text-white shadow-md' : 'bg-white/50 text-athlavix-accent'}`}
          >
            {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        <AnimatePresence>
          {messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const showDateSeparator = !prevMsg || 
              new Date(prevMsg.timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
            
            return (
              <React.Fragment key={idx}>
                {showDateSeparator && (
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 rounded-full bg-athlavix-accent/5 text-[10px] font-bold uppercase tracking-widest text-athlavix-accent/40 border border-athlavix-accent/5">
                      {formatDateSeparator(new Date(msg.timestamp))}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-md border-2 ${msg.role === "user" ? "bg-white text-athlavix-accent border-white" : "bg-athlavix-accent text-white border-athlavix-accent/20"}`}>
                    {msg.role === "user" ? (
                      userAvatar ? <img src={userAvatar} alt="User" className="w-full h-full object-cover" /> : <User size={20} />
                    ) : (
                      botAvatar ? <img src={botAvatar} alt="Bot" className="w-full h-full object-cover" /> : <Bot size={20} />
                    )}
                  </div>
                  <div className={`max-w-[75%] space-y-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`p-4 rounded-2xl shadow-sm ${
                      msg.role === "user" 
                        ? "bg-athlavix-accent text-white rounded-tr-none" 
                        : "bg-white/90 text-athlavix-text rounded-tl-none border border-white/50"
                    }`}>
                      {msg.image && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-white/20 shadow-sm relative group">
                          <img src={msg.image} alt="Skin Concern" className="w-full max-h-64 object-cover" />
                          <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full text-[8px] font-bold text-white uppercase tracking-widest flex items-center gap-1">
                            <Sparkles size={10} className="text-athlavix-accent" />
                            Skin Analysis
                          </div>
                        </div>
                      )}
                      <div className="markdown-body text-sm leading-relaxed">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>
                    <p className={`text-[9px] font-bold uppercase tracking-widest opacity-40 px-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })}
        </AnimatePresence>
        {isTyping && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-athlavix-accent/50 text-xs font-medium"
          >
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-athlavix-accent rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-athlavix-accent rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-athlavix-accent rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            ATHLAVIX is thinking...
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white/30 border-t border-white/30 space-y-2">
        {selectedImage && (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-athlavix-accent shadow-md">
            <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-1 right-1 p-0.5 bg-athlavix-accent text-white rounded-full shadow-sm"
            >
              <X size={12} />
            </button>
          </div>
        )}
        {isListening && interimInput && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2 bg-athlavix-accent/5 rounded-xl border border-athlavix-accent/10 text-xs text-athlavix-accent/60 italic"
          >
            {interimInput}
          </motion.div>
        )}
        <div className="flex items-center gap-2 bg-white/80 rounded-full p-2 shadow-inner border border-white/50">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-athlavix-accent/10 text-athlavix-accent hover:bg-athlavix-accent/20 rounded-full transition-all group"
            title="Upload skin photo for analysis"
          >
            <Camera size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Scan Skin</span>
          </button>
          <button 
            onClick={toggleListening}
            className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'text-athlavix-accent hover:bg-athlavix-accent/10'}`}
          >
            <Mic size={20} />
          </button>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isListening ? (sttLang === "en-US" ? "Listening..." : "শুনছি...") : (sttLang === "en-US" ? "Ask anything about your skin..." : "আপনার ত্বক সম্পর্কে কিছু জিজ্ঞাসা করুন...")}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 placeholder:text-athlavix-accent/30"
          />
          {input && (
            <button 
              onClick={() => setInput("")}
              className="p-1 text-athlavix-accent/30 hover:text-athlavix-accent transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <button 
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isTyping}
            className="p-2 bg-athlavix-accent text-white rounded-full hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-md"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
