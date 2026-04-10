import React, { useState, useRef, useEffect } from "react";
import { Message, UserState } from "../types";
import { Send, Mic, Volume2, VolumeX, Sparkles, User, Bot, X, Image as ImageIcon, Camera, Loader2, Trash2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { getGeminiSpeech } from "../services/geminiService";

interface ChatProps {
  messages: Message[];
  analysisHistory: UserState['analysisHistory'];
  onSendMessage: (text: string, image?: string) => void;
  onClearHistory: () => void;
  onDeleteAnalysis: (id: string) => void;
  onOnboardingSeen: (tipId: string) => void;
  onboardingSeen: string[];
  isTyping: boolean;
  userAvatar: string | null;
  botAvatar: string | null;
  voiceSettings: UserState['voiceSettings'];
}

export const Chat: React.FC<ChatProps> = ({ 
  messages, 
  analysisHistory,
  onSendMessage, 
  onClearHistory, 
  onDeleteAnalysis,
  onOnboardingSeen,
  onboardingSeen,
  isTyping, 
  userAvatar, 
  botAvatar,
  voiceSettings
}) => {
  const [input, setInput] = useState("");
  const [interimInput, setInterimInput] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sttLang, setSttLang] = useState<"en-US" | "bn-BD">("en-US");
  const [view, setView] = useState<"chat" | "history">("chat");
  const [selectedAnalysis, setSelectedAnalysis] = useState<UserState['analysisHistory'][0] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenMessageTimestamps = useRef<Set<number>>(new Set());

  const [activeTip, setActiveTip] = useState<string | null>(null);

  useEffect(() => {
    if (!onboardingSeen.includes('image_upload') && !activeTip) {
      const timer = setTimeout(() => setActiveTip('image_upload'), 2000);
      return () => clearTimeout(timer);
    }
  }, [onboardingSeen]);

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
    if ((!input.trim() && !selectedImage) || isTyping || isAnalyzing) return;
    
    const image = selectedImage || undefined;
    const text = input.trim() || (image ? "Analyze my skin, please! ✨" : "");
    
    if (image) setIsAnalyzing(true);
    
    onSendMessage(text, image);
    setInput("");
    setSelectedImage(null);

    if (image) {
      onOnboardingSeen('image_upload');
      setActiveTip(null);
    }
  };

  useEffect(() => {
    if (!isTyping) setIsAnalyzing(false);
  }, [isTyping]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        if (activeTip === 'image_upload') setActiveTip(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const speak = async (text: string) => {
    if (!isVoiceEnabled) return;

    // Stop ALL existing speech immediately
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Detect if text contains Bengali characters
    const hasBengali = /[\u0980-\u09FF]/.test(text);

    if (hasBengali) {
      // Fallback to browser TTS for Bengali as Gemini TTS might not be optimized for it yet
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSettings.speed;
      
      // Adjust pitch based on preset for a more expressive feel
      if (voiceSettings.preset === 'cheerful') utterance.pitch = 1.2;
      else if (voiceSettings.preset === 'calm') utterance.pitch = 0.8;
      else utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      // Look for Bengali voices specifically
      const preferredVoice = voices.find(v => v.lang.startsWith('bn')) || voices.find(v => v.lang.includes('Bengali'));
      if (preferredVoice) utterance.voice = preferredVoice;
      
      window.speechSynthesis.speak(utterance);
    } else {
      // Use high-quality Gemini TTS for English
      try {
        const voiceMap = {
          soft: 'Kore',
          cheerful: 'Zephyr',
          calm: 'Charon'
        };
        const voiceName = voiceMap[voiceSettings.preset] || 'Kore';
        const audioData = await getGeminiSpeech(text, voiceName, voiceSettings.speed, voiceSettings.preset);
        
        // Check again if voice is still enabled and we haven't started another speech
        if (audioData && isVoiceEnabled) {
          const audio = new Audio(audioData);
          audioRef.current = audio;
          audio.play().catch(err => console.error("Audio playback error:", err));
        } else if (!audioData) {
          throw new Error("No audio data");
        }
      } catch (error) {
        console.error("Gemini TTS failed, falling back to browser:", error);
        // Fallback to browser TTS if Gemini TTS fails
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = voiceSettings.speed;
        if (voiceSettings.preset === 'cheerful') utterance.pitch = 1.2;
        else if (voiceSettings.preset === 'calm') utterance.pitch = 0.8;
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en'));
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "model" && isVoiceEnabled && !spokenMessageTimestamps.current.has(lastMessage.timestamp)) {
      spokenMessageTimestamps.current.add(lastMessage.timestamp);
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
      <div className="p-4 border-b border-white/30 flex items-center justify-between bg-athlavix-accent/10 relative">
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
              onClick={() => setView("chat")}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${view === "chat" ? "bg-athlavix-accent text-white shadow-sm" : "text-athlavix-accent/60 hover:text-athlavix-accent"}`}
            >
              CHAT
            </button>
            <button 
              onClick={() => setView("history")}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${view === "history" ? "bg-athlavix-accent text-white shadow-sm" : "text-athlavix-accent/60 hover:text-athlavix-accent"}`}
            >
              HISTORY
            </button>
          </div>
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
            title={isVoiceEnabled ? "Disable Voice" : "Enable Voice"}
          >
            {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button 
            onClick={() => setShowClearConfirm(true)}
            className="p-2 rounded-full bg-white/50 text-athlavix-accent hover:bg-red-50 hover:text-red-500 transition-all"
            title="Clear All History"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* Clear Confirmation Overlay */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 z-10 bg-white/95 backdrop-blur-md flex items-center justify-between px-6"
            >
              <p className="text-xs font-bold text-athlavix-accent uppercase tracking-widest">Clear all history?</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-athlavix-accent/60 hover:bg-athlavix-accent/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onClearHistory();
                    setShowClearConfirm(false);
                  }}
                  className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-500 text-white shadow-md hover:bg-red-600 transition-all"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Order Notice Banner */}
      <div className="bg-athlavix-accent text-white px-4 py-2 text-[10px] font-bold text-center uppercase tracking-[0.2em] animate-pulse">
        Orders via Facebook Page only • ওয়েবসাইট থেকে অর্ডার আপাতত বন্ধ
      </div>

      {/* Messages or History */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {view === "chat" ? (
          <>
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
                            <Markdown
                              components={{
                                a: ({ node, ...props }) => {
                                  const isStoreLink = props.children?.toString().includes("View on Store");
                                  if (isStoreLink) {
                                    return (
                                      <a
                                        {...props}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-athlavix-accent/10 text-athlavix-accent rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-athlavix-accent hover:text-white transition-all mt-1 no-underline"
                                      >
                                        {props.children}
                                        <ExternalLink size={10} />
                                      </a>
                                    );
                                  }
                                  return <a {...props} target="_blank" rel="noopener noreferrer" className="text-athlavix-accent hover:underline" />;
                                }
                              }}
                            >
                              {msg.text}
                            </Markdown>
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
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-athlavix-accent uppercase tracking-widest">Past Skin Analyses</h3>
              <p className="text-[10px] font-bold text-athlavix-accent/40 uppercase tracking-widest">{analysisHistory.length} Total</p>
            </div>
            
            {analysisHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-athlavix-accent/5 flex items-center justify-center text-athlavix-accent/20">
                  <ImageIcon size={32} />
                </div>
                <p className="text-xs font-medium text-athlavix-accent/40">No analysis history yet. Try scanning your skin!</p>
                <button 
                  onClick={() => {
                    setView("chat");
                    fileInputRef.current?.click();
                  }}
                  className="px-6 py-2 bg-athlavix-accent text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  Start First Scan ✨
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {analysisHistory.map((analysis) => (
                  <motion.div
                    key={analysis.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/60 border border-white/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => setSelectedAnalysis(analysis)}
                  >
                    <div className="flex gap-4 p-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-athlavix-accent/10">
                        <img src={analysis.image} alt="Analysis" className="w-full h-full object-cover" />
                      </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-athlavix-accent/40 uppercase tracking-widest">
                              {new Date(analysis.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAnalysis(analysis.id);
                              }}
                              className="p-1.5 text-athlavix-accent/20 hover:text-red-500 transition-colors"
                              title="Delete Analysis"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <p className="text-xs font-medium text-athlavix-text line-clamp-2 opacity-80">
                            {analysis.result.substring(0, 100)}...
                          </p>
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-athlavix-accent uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                          View Details <Sparkles size={10} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analysis Detail Modal */}
      <AnimatePresence>
        {selectedAnalysis && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedAnalysis(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative h-64 sm:h-80 shrink-0">
                <img src={selectedAnalysis.image} alt="Analysis" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setSelectedAnalysis(null)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full transition-all"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-4 left-4 px-4 py-2 bg-athlavix-accent/90 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2 shadow-lg">
                  <Sparkles size={14} />
                  Analysis Result
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-athlavix-accent">Skin Analysis Report</h3>
                    <p className="text-[10px] font-bold text-athlavix-accent/40 uppercase tracking-widest">
                      {new Date(selectedAnalysis.timestamp).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedAnalysis.result);
                      // Maybe a toast here?
                    }}
                    className="p-2 bg-athlavix-accent/5 text-athlavix-accent hover:bg-athlavix-accent/10 rounded-full transition-all"
                    title="Copy Report"
                  >
                    <Sparkles size={16} />
                  </button>
                </div>
                <div className="markdown-body text-sm leading-relaxed text-athlavix-text">
                  <Markdown
                    components={{
                      a: ({ node, ...props }) => {
                        const isStoreLink = props.children?.toString().includes("View on Store");
                        if (isStoreLink) {
                          return (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 bg-athlavix-accent/10 text-athlavix-accent rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-athlavix-accent hover:text-white transition-all mt-1 no-underline"
                            >
                              {props.children}
                              <ExternalLink size={10} />
                            </a>
                          );
                        }
                        return <a {...props} target="_blank" rel="noopener noreferrer" className="text-athlavix-accent hover:underline" />;
                      }
                    }}
                  >
                    {selectedAnalysis.result}
                  </Markdown>
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setSelectedAnalysis(null)}
                  className="px-8 py-3 bg-athlavix-accent text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-4 bg-white/30 border-t border-white/30 space-y-2">
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-athlavix-accent shadow-2xl group mx-auto mb-2"
          >
            <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all hover:scale-110"
            >
              <X size={14} />
            </button>
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Sparkles size={24} className="text-white mb-1 animate-pulse" />
              <p className="text-[8px] font-black text-white uppercase tracking-widest">Ready to scan</p>
            </div>
          </motion.div>
        )}

        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 bg-athlavix-accent/10 rounded-2xl border border-athlavix-accent/20"
          >
            <div className="relative">
              <Loader2 size={20} className="animate-spin text-athlavix-accent" />
              <div className="absolute inset-0 animate-ping bg-athlavix-accent/20 rounded-full" />
            </div>
            <p className="text-xs font-bold text-athlavix-accent uppercase tracking-widest animate-pulse">
              Analyzing your skin... / আপনার ত্বক বিশ্লেষণ করা হচ্ছে...
            </p>
          </motion.div>
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
          <div className="relative">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-athlavix-accent/10 text-athlavix-accent hover:bg-athlavix-accent/20 rounded-full transition-all group"
              title="Upload skin photo for analysis"
            >
              <Camera size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Scan Skin</span>
            </button>

            {/* Onboarding Tip */}
            <AnimatePresence>
              {activeTip === 'image_upload' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-full left-0 mb-4 w-48 p-3 bg-athlavix-accent text-white rounded-2xl shadow-2xl z-50"
                >
                  <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-athlavix-accent rotate-45" />
                  <p className="text-[10px] font-bold leading-tight">
                    ✨ Scan your skin! Upload a photo for instant analysis.
                  </p>
                  <button 
                    onClick={() => {
                      onOnboardingSeen('image_upload');
                      setActiveTip(null);
                    }}
                    className="mt-2 text-[8px] uppercase tracking-widest font-black opacity-70 hover:opacity-100"
                  >
                    Got it!
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
