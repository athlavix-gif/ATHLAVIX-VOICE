import React, { useState, useEffect } from "react";
import { UserState, SkinType, Message, Badge } from "./types";
import { Chat } from "./components/Chat";
import { Progress } from "./components/Progress";
import { getGeminiResponse } from "./services/geminiService";
import { Sparkles, User as UserIcon, Settings, LogOut, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const DEFAULT_USER_ID = "guest_user_1";

export default function App() {
  const [userState, setUserState] = useState<UserState | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempWhatsapp, setTempWhatsapp] = useState("");
  const [tempSkinType, setTempSkinType] = useState<SkinType | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch(`/api/user/${DEFAULT_USER_ID}`);
        if (res.ok) {
          const data = await res.json();
          setUserState(data);
        } else {
          setIsFirstTime(true);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
        setIsFirstTime(true);
      }
    };
    loadUser();
  }, []);

  const saveUser = async (state: UserState) => {
    try {
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
    } catch (err) {
      console.error("Failed to save user:", err);
    }
  };

  const handleInitialSetup = () => {
    if (tempName.trim() && tempWhatsapp.trim()) {
      const newState: UserState = {
        id: DEFAULT_USER_ID,
        name: tempName.trim(),
        whatsapp: tempWhatsapp.trim(),
        skinType: tempSkinType,
        concerns: [],
        points: 0,
        level: 1,
        badges: [],
        completedChallenges: [],
        history: [{
          role: "model",
          text: `ATHLAVIX VOICE activated! Ready to glow, ${tempName}? 😊`,
          timestamp: Date.now()
        }],
      };
      setUserState(newState);
      setIsFirstTime(false);
      saveUser(newState);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!userState) return;

    const userMsg: Message = { role: "user", text, timestamp: Date.now() };
    const updatedHistory = [...userState.history, userMsg];
    
    // Optimistic update
    const nextState = { 
      ...userState, 
      history: updatedHistory,
      points: userState.points + 10 // 10 points per interaction
    };
    
    // Check for level up and badges
    if (nextState.points >= 500 && nextState.level < 3) {
      nextState.level = 3;
      if (!nextState.badges.some(b => b.id === "rad_boss")) {
        nextState.badges.push({ id: "rad_boss", name: "Radiance Boss ✨", icon: "award" });
      }
    } else if (nextState.points >= 100 && nextState.level < 2) {
      nextState.level = 2;
      if (!nextState.badges.some(b => b.id === "glow_getter")) {
        nextState.badges.push({ id: "glow_getter", name: "Glow Getter ✨", icon: "star" });
      }
    }

    // New Badge: Acne Slayer if they talk about acne/pimples
    if (text.toLowerCase().includes("acne") || text.toLowerCase().includes("pimple") || text.includes("পিম্পল")) {
      if (!nextState.badges.some(b => b.id === "acne_slayer")) {
        nextState.badges.push({ id: "acne_slayer", name: "Acne Slayer Badge ✨", icon: "shield" });
      }
    }

    // Check for challenge completion
    if (text.toLowerCase().includes("mask") || text.toLowerCase().includes("মাস্ক")) {
      if (!nextState.completedChallenges.includes("daily_mask")) {
        nextState.completedChallenges.push("daily_mask");
        nextState.points += 20; // Bonus for challenge
      }
    }

    setUserState(nextState);
    setIsTyping(true);

    try {
      const aiResponse = await getGeminiResponse(nextState, text);
      const modelMsg: Message = { role: "model", text: aiResponse, timestamp: Date.now() };
      const finalState = { ...nextState, history: [...nextState.history, modelMsg] };
      setUserState(finalState);
      saveUser(finalState);
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setIsTyping(false);
    }
  };

  if (isFirstTime) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-athlavix-bg">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card max-w-md w-full p-8 space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-athlavix-accent rounded-full flex items-center justify-center text-white mx-auto shadow-xl mb-4">
              <Sparkles size={40} />
            </div>
            <h1 className="text-3xl font-bold text-athlavix-accent">Welcome to ATHLAVIX</h1>
            <p className="text-athlavix-accent/60 font-medium">Your personal AI beauty coach is ready.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-50">Your Name</label>
              <input 
                type="text" 
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-white/50 border border-athlavix-accent/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-athlavix-accent/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-50">WhatsApp Number</label>
              <input 
                type="tel" 
                value={tempWhatsapp}
                onChange={(e) => setTempWhatsapp(e.target.value)}
                placeholder="e.g. +88017..."
                className="w-full bg-white/50 border border-athlavix-accent/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-athlavix-accent/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-50">Skin Type</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(SkinType).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTempSkinType(type)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                      tempSkinType === type 
                        ? "bg-athlavix-accent text-white border-athlavix-accent" 
                        : "bg-white/50 text-athlavix-accent border-athlavix-accent/10 hover:bg-white/80"
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleInitialSetup}
              disabled={!tempName.trim() || !tempWhatsapp.trim()}
              className="w-full btn-primary py-4 text-lg"
            >
              Start Glowing ✨
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!userState) return null;

  return (
    <div className="min-h-screen bg-athlavix-bg flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden p-4 flex items-center justify-between bg-white/20 backdrop-blur-sm border-b border-white/30">
        <div className="flex items-center gap-2">
          <Sparkles className="text-athlavix-accent" size={24} />
          <span className="font-bold text-athlavix-accent">ATHLAVIX VOICE</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-athlavix-accent">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`fixed md:static inset-y-0 left-0 w-72 z-50 bg-white/10 backdrop-blur-xl border-r border-white/30 p-6 flex flex-col gap-8 ${isSidebarOpen ? 'block' : 'hidden md:flex'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-athlavix-accent rounded-full flex items-center justify-center text-white shadow-lg">
                <Sparkles size={20} />
              </div>
              <h1 className="text-xl font-bold text-athlavix-accent tracking-tight">ATHLAVIX</h1>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <Progress userState={userState} />
            </div>

            <div className="space-y-2 pt-6 border-t border-white/20">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/20 text-athlavix-accent transition-colors">
                <Settings size={20} />
                <span className="font-medium">Settings</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/20 text-athlavix-accent transition-colors">
                <LogOut size={20} />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 flex flex-col h-[calc(100vh-64px)] md:h-screen max-w-5xl mx-auto w-full">
        <div className="flex-1 min-h-0">
          <Chat 
            messages={userState.history} 
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
          />
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
