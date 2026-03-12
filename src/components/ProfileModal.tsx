import React, { useState } from "react";
import { UserState, SkinType, SKIN_CONCERNS } from "../types";
import { X, Camera, Save, User, Phone, Bot, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userState: UserState;
  onUpdate: (updatedState: Partial<UserState>) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userState, onUpdate }) => {
  const [name, setName] = useState(userState.name);
  const [whatsapp, setWhatsapp] = useState(userState.whatsapp);
  const [avatar, setAvatar] = useState(userState.avatar);
  const [botAvatar, setBotAvatar] = useState(userState.botAvatar);
  const [skinType, setSkinType] = useState(userState.skinType);
  const [concerns, setConcerns] = useState<string[]>(userState.concerns || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [botPrompt, setBotPrompt] = useState("A cute, friendly, Gen Z aesthetic girl avatar for a beauty and skincare brand, high quality, digital art, vibrant colors");

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBotAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBotAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleConcern = (concern: string) => {
    setConcerns(prev => 
      prev.includes(concern) 
        ? prev.filter(c => c !== concern) 
        : [...prev, concern]
    );
  };

  const generateBotAvatar = async () => {
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: botPrompt }],
        },
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setBotAvatar(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (err) {
      console.error("Failed to generate avatar:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    onUpdate({
      name,
      whatsapp,
      avatar,
      botAvatar,
      skinType,
      concerns
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-card max-w-lg w-full p-8 space-y-6 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-athlavix-accent/50 hover:text-athlavix-accent transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-athlavix-accent">Edit Profile</h2>
              <p className="text-athlavix-accent/60 text-sm">Keep your bestie updated! ✨</p>
            </div>

            <div className="flex justify-center gap-8">
              <div className="space-y-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Your Avatar</p>
                <div className="relative w-20 h-20 mx-auto">
                  <div className="w-20 h-20 bg-athlavix-accent rounded-full flex items-center justify-center text-white shadow-xl overflow-hidden border-4 border-white/50">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer text-athlavix-accent hover:bg-gray-50 transition-colors border border-athlavix-accent/10">
                    <Camera size={14} />
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="space-y-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Bot Avatar</p>
                <div className="relative w-20 h-20 mx-auto">
                  <div className="w-20 h-20 bg-athlavix-accent/20 rounded-full flex items-center justify-center text-athlavix-accent shadow-xl overflow-hidden border-4 border-white/50">
                    {botAvatar ? (
                      <img src={botAvatar} alt="Bot Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Bot size={32} />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer text-athlavix-accent hover:bg-gray-50 transition-colors border border-athlavix-accent/10">
                    <Camera size={14} />
                    <input type="file" accept="image/*" onChange={handleBotAvatarUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-athlavix-accent/5 rounded-2xl border border-athlavix-accent/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-50 flex items-center gap-2">
                    <Sparkles size={12} /> Generate Bot Avatar
                  </label>
                  {isGenerating && <Loader2 size={16} className="animate-spin text-athlavix-accent" />}
                </div>
                <textarea 
                  value={botPrompt}
                  onChange={(e) => setBotPrompt(e.target.value)}
                  placeholder="Describe your bot's look..."
                  className="w-full bg-white/50 border border-athlavix-accent/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-athlavix-accent/20 outline-none transition-all resize-none h-16"
                />
                <button 
                  onClick={generateBotAvatar}
                  disabled={isGenerating || !botPrompt.trim()}
                  className="w-full py-2 bg-athlavix-accent text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? "Generating..." : "Generate with AI ✨"}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest opacity-50 flex items-center gap-2">
                  <User size={12} /> Name / নাম
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/50 border border-athlavix-accent/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-athlavix-accent/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest opacity-50 flex items-center gap-2">
                  <Phone size={12} /> WhatsApp / হোয়াটসঅ্যাপ
                </label>
                <input 
                  type="tel" 
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-white/50 border border-athlavix-accent/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-athlavix-accent/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest opacity-50">Skin Type / ত্বকের ধরণ</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(SkinType).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSkinType(type)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                        skinType === type 
                          ? "bg-athlavix-accent text-white border-athlavix-accent" 
                          : "bg-white/50 text-athlavix-accent border-athlavix-accent/10 hover:bg-white/80"
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest opacity-50">Skin Concerns / ত্বকের সমস্যা</label>
                <div className="flex flex-wrap gap-2">
                  {SKIN_CONCERNS.map((concern) => (
                    <button
                      key={concern}
                      onClick={() => toggleConcern(concern)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                        concerns.includes(concern)
                          ? "bg-athlavix-accent text-white border-athlavix-accent"
                          : "bg-athlavix-accent/5 text-athlavix-accent border-athlavix-accent/10 hover:bg-athlavix-accent/10"
                      }`}
                    >
                      {concerns.includes(concern) && <CheckCircle2 size={10} />}
                      {concern}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2 text-lg"
            >
              <Save size={20} /> Save Changes / সেভ করুন
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
