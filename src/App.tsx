import React, { useState, useEffect } from "react";
import { UserState, SkinType, Message, Badge } from "./types";
import { Chat } from "./components/Chat";
import { Progress } from "./components/Progress";
import { AdminDashboard } from "./components/AdminDashboard";
import { Celebration } from "./components/Celebration";
import { getGeminiResponse } from "./services/geminiService";
import { Sparkles, User as UserIcon, Settings, LogOut, Menu, X, Database } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const USER_ID_KEY = "athlavix_user_id";

export default function App() {
  const [userState, setUserState] = useState<UserState | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempWhatsapp, setTempWhatsapp] = useState("");
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [tempSkinType, setTempSkinType] = useState<SkinType | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [celebration, setCelebration] = useState<{ isVisible: boolean; title: string; message: string; type: "badge" | "challenge" | "level" }>({
    isVisible: false,
    title: "",
    message: "",
    type: "challenge"
  });

  useEffect(() => {
    const loadUser = async () => {
      const storedId = localStorage.getItem(USER_ID_KEY);
      if (!storedId) {
        setIsFirstTime(true);
        return;
      }

      try {
        const res = await fetch(`/api/user/${storedId}`);
        if (res.ok) {
          const data = await res.json();
          setUserState(data);
        } else {
          // If ID exists in local but not in DB, reset
          localStorage.removeItem(USER_ID_KEY);
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
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newState: UserState = {
        id: newUserId,
        name: tempName.trim(),
        whatsapp: tempWhatsapp.trim(),
        avatar: tempAvatar,
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
      localStorage.setItem(USER_ID_KEY, newUserId);
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
        setCelebration({ isVisible: true, title: "Level Up! 👑", message: "You're now a Radiance Boss! Slay, Queen! ✨", type: "level" });
      }
    } else if (nextState.points >= 100 && nextState.level < 2) {
      nextState.level = 2;
      if (!nextState.badges.some(b => b.id === "glow_getter")) {
        nextState.badges.push({ id: "glow_getter", name: "Glow Getter ✨", icon: "star" });
        setCelebration({ isVisible: true, title: "Level Up! 🌟", message: "You're officially a Glow Getter! Keep shining! ✨", type: "level" });
      }
    }

    // New Badge: Acne Slayer if they talk about acne/pimples
    if (text.toLowerCase().includes("acne") || text.toLowerCase().includes("pimple") || text.includes("পিম্পল")) {
      if (!nextState.badges.some(b => b.id === "acne_slayer")) {
        nextState.badges.push({ id: "acne_slayer", name: "Acne Slayer Badge ✨", icon: "shield" });
        setCelebration({ isVisible: true, title: "New Badge! 🛡️", message: "You've earned the Acne Slayer badge! We're in this together! 💖", type: "badge" });
      }
    }

    // Check for challenge completion
    if (text.toLowerCase().includes("mask") || text.toLowerCase().includes("মাস্ক")) {
      if (!nextState.completedChallenges.includes("daily_mask")) {
        nextState.completedChallenges.push("daily_mask");
        nextState.points += 20; // Bonus for challenge
        setCelebration({ isVisible: true, title: "Challenge Completed! ✨", message: "You've completed your daily mask challenge! +20 points! 💖", type: "challenge" });
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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
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
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="w-24 h-24 bg-athlavix-accent rounded-full flex items-center justify-center text-white shadow-xl overflow-hidden">
                {tempAvatar ? (
                  <img src={tempAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles size={40} />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer text-athlavix-accent hover:bg-gray-50 transition-colors">
                <Settings size={16} />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>
            <h1 className="text-3xl font-bold text-athlavix-accent">Welcome to ATHLAVIX</h1>
            <p className="text-athlavix-accent/60 font-medium">Your personal AI beauty coach is ready.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-50">Your Name / আপনার নাম</label>
              <input 
                type="text" 
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-white/50 border border-athlavix-accent/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-athlavix-accent/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-50">WhatsApp Number / হোয়াটসঅ্যাপ নম্বর</label>
              <input 
                type="tel" 
                value={tempWhatsapp}
                onChange={(e) => setTempWhatsapp(e.target.value)}
                placeholder="e.g. +88017..."
                className="w-full bg-white/50 border border-athlavix-accent/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-athlavix-accent/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-50">Skin Type / ত্বকের ধরণ</label>
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
              Start Glowing ✨ / শুরু করুন ✨
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!userState) return null;

  return (
    <div className="min-h-screen bg-athlavix-bg flex flex-col md:flex-row overflow-hidden">
      <Celebration 
        isVisible={celebration.isVisible}
        onClose={() => setCelebration(prev => ({ ...prev, isVisible: false }))}
        title={celebration.title}
        message={celebration.message}
        type={celebration.type}
      />
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
              <div className="w-12 h-12 bg-athlavix-accent rounded-full flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                {userState.avatar ? (
                  <img src={userState.avatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles size={24} />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-athlavix-accent tracking-tight truncate">{userState.name}</h1>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">Level {userState.level}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <Progress userState={userState} />
            </div>

            <div className="space-y-2 pt-6 border-t border-white/20">
              <button 
                onClick={() => setIsAdminOpen(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/20 text-athlavix-accent transition-colors"
              >
                <Database size={20} />
                <span className="font-medium">Customer Database</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/20 text-athlavix-accent transition-colors">
                <Settings size={20} />
                <span className="font-medium">Settings</span>
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem(USER_ID_KEY);
                  window.location.reload();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/20 text-athlavix-accent transition-colors"
              >
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
            userAvatar={userState.avatar}
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

      {/* Admin Dashboard Overlay */}
      <AnimatePresence>
        {isAdminOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AdminDashboard onClose={() => setIsAdminOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
