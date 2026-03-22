import React, { useState, useEffect } from "react";
import { UserState, Challenge, AVAILABLE_CHALLENGES, LEVELS } from "../types";
import { Trophy, Zap, Award, Star, CheckCircle2, Users, ArrowUp, Medal, Share2, Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GamificationProps {
  userState: UserState;
  onUpdate: (updatedData: Partial<UserState>) => void;
}

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string | null;
  points: number;
  level: number;
}

export const Gamification: React.FC<GamificationProps> = ({ userState, onUpdate }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [activeTab, setActiveTab] = useState<"challenges" | "leaderboard" | "rewards">("challenges");
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data);
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      }
    };
    fetchLeaderboard();
  }, []);

  const currentLevel = LEVELS.find(l => l.level === userState.level) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.level === userState.level + 1);
  const progress = nextLevel 
    ? ((userState.points - currentLevel.threshold) / (nextLevel.threshold - currentLevel.threshold)) * 100 
    : 100;

  const handleShare = () => {
    const text = `I'm glowing with ATHLAVIX! ✨ I'm Level ${userState.level} (${currentLevel.name}) with ${userState.points} points and a ${userState.streak}-day streak! Join my skincare journey! 💖`;
    navigator.clipboard.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
    
    // Task completion for share
    if (!userState.completedChallenges.includes("share_progress")) {
      onUpdate({
        completedChallenges: [...userState.completedChallenges, "share_progress"],
        points: userState.points + 15
      });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Stats */}
      <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2">
          <button 
            onClick={handleShare}
            className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors text-athlavix-accent flex items-center gap-2"
          >
            <Share2 size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{showCopied ? "Copied!" : "Share"}</span>
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-athlavix-accent flex items-center justify-center text-white shadow-xl">
              <Trophy size={32} />
            </div>
            {userState.streak > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg border-2 border-white">
                <Flame size={10} fill="currentColor" />
                {userState.streak}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-athlavix-accent">{currentLevel.name}</h2>
            <p className="text-sm opacity-70">Level {userState.level} • {userState.points} Points</p>
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <div className="flex items-center gap-2 text-athlavix-accent font-bold">
            <Star size={20} fill="currentColor" />
            <span className="text-3xl">{userState.points}</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Total Glow Points</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
        {[
          { id: "challenges", label: "Challenges", icon: Zap },
          { id: "leaderboard", label: "Leaderboard", icon: Users },
          { id: "rewards", label: "Rewards", icon: Award }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
              activeTab === tab.id 
                ? "bg-athlavix-accent text-white shadow-lg" 
                : "text-athlavix-accent hover:bg-white/30"
            }`}
          >
            <tab.icon size={18} />
            <span className="font-bold text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
        <AnimatePresence mode="wait">
          {activeTab === "challenges" && (
            <motion.div
              key="challenges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_CHALLENGES.map(challenge => {
                  const isCompleted = userState.completedChallenges?.includes(challenge.id);
                  const currentProgress = userState.challengeProgress?.[challenge.id] || (isCompleted ? challenge.durationDays : 0);
                  const progressPercent = Math.min((currentProgress / challenge.durationDays) * 100, 100);

                  return (
                    <div 
                      key={challenge.id}
                      className={`glass-card p-5 border-2 transition-all relative overflow-hidden ${
                        isCompleted 
                          ? "border-emerald-500/30 bg-emerald-500/5" 
                          : "border-white/30 hover:border-athlavix-accent/30"
                      }`}
                    >
                      {isCompleted && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-widest">
                          Completed
                        </div>
                      )}
                      
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{challenge.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-bold text-athlavix-accent text-lg">{challenge.title}</h3>
                          <p className="text-sm opacity-70 mb-4">{challenge.description}</p>
                          
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-athlavix-accent">
                              Progress: {currentProgress}/{challenge.durationDays} days
                            </span>
                            {!isCompleted && (
                              <button 
                                onClick={() => {
                                  const newProgress = (userState.challengeProgress?.[challenge.id] || 0) + 1;
                                  const updatedProgress = { ...userState.challengeProgress, [challenge.id]: newProgress };
                                  const updatedChallenges = [...userState.completedChallenges];
                                  let pointsToAdd = 0;
                                  
                                  if (newProgress >= challenge.durationDays) {
                                    updatedChallenges.push(challenge.id);
                                    pointsToAdd = challenge.points;
                                  }
                                  
                                  onUpdate({
                                    challengeProgress: updatedProgress,
                                    completedChallenges: updatedChallenges,
                                    points: userState.points + pointsToAdd
                                  });
                                }}
                                className="text-[10px] bg-athlavix-accent text-white px-2 py-1 rounded-lg hover:bg-athlavix-accent/80 transition-colors"
                              >
                                Log Day
                              </button>
                            )}
                            <span className="text-xs font-bold text-athlavix-accent/60">
                              +{challenge.points} XP
                            </span>
                          </div>
                          
                          <div className="relative h-2 bg-white/30 rounded-full overflow-hidden border border-white/10">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              className={`absolute top-0 left-0 h-full ${
                                isCompleted ? "bg-emerald-500" : "bg-athlavix-accent"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="glass-card overflow-hidden">
                <div className="bg-athlavix-accent p-4 text-white flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2">
                    <Medal size={20} /> Top Glow Getters
                  </h3>
                  <span className="text-xs opacity-80 uppercase tracking-widest">Global Ranking</span>
                </div>
                
                <div className="divide-y divide-white/10">
                  {leaderboard.map((user, index) => (
                    <div 
                      key={user.id}
                      className={`flex items-center gap-4 p-4 transition-colors ${
                        user.id === userState.id ? "bg-athlavix-accent/10" : "hover:bg-white/10"
                      }`}
                    >
                      <div className="w-8 text-center font-bold text-athlavix-accent opacity-50">
                        {index + 1}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-athlavix-accent/20 flex items-center justify-center text-athlavix-accent overflow-hidden border border-white/30">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <Trophy size={16} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-athlavix-accent truncate">
                          {user.name} {user.id === userState.id && "(You)"}
                        </h4>
                        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Level {user.level}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-athlavix-accent">{user.points}</div>
                        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 text-center text-sm opacity-60 italic">
                Keep engaging to climb the leaderboard! 🚀
              </div>
            </motion.div>
          )}

          {activeTab === "rewards" && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {userState.badges.map((badge, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    className="glass-card p-4 flex flex-col items-center gap-3 border-2 border-athlavix-accent/20"
                  >
                    <div className="w-16 h-16 rounded-full bg-athlavix-accent/10 flex items-center justify-center text-athlavix-accent border border-athlavix-accent/30 shadow-inner">
                      <Award size={32} />
                    </div>
                    <div className="text-center">
                      <h4 className="font-bold text-athlavix-accent text-sm leading-tight">{badge.name}</h4>
                      <p className="text-[10px] opacity-50 mt-1">Earned ✨</p>
                    </div>
                  </motion.div>
                ))}
                
                {/* Locked Badges Placeholder */}
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card p-4 flex flex-col items-center gap-3 opacity-40 grayscale">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 border border-dashed border-gray-400">
                      <Star size={32} />
                    </div>
                    <div className="text-center">
                      <h4 className="font-bold text-gray-500 text-sm">Locked</h4>
                      <p className="text-[10px] mt-1">Keep going!</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="glass-card p-6 bg-gradient-to-br from-athlavix-accent to-athlavix-accent/80 text-white">
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <ArrowUp size={24} /> Level Up Rewards
                </h3>
                <p className="text-sm opacity-90 mb-6">Unlock exclusive perks as you level up your skincare journey.</p>
                
                <div className="space-y-4">
                  {LEVELS.map(level => (
                    <div 
                      key={level.level}
                      className={`flex items-center gap-4 p-3 rounded-xl border ${
                        userState.level >= level.level 
                          ? "bg-white/20 border-white/30" 
                          : "bg-black/10 border-white/10 opacity-50"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white text-athlavix-accent flex items-center justify-center font-bold">
                        {level.level}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold">{level.name}</h4>
                        <p className="text-xs opacity-80">{level.threshold} Points Required</p>
                      </div>
                      {userState.level >= level.level && (
                        <CheckCircle2 size={20} className="text-white" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
