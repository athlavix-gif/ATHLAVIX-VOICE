import React from "react";
import { UserState, LEVELS } from "../types";
import { Trophy, Award, Star, Zap, Shield, Heart, Sparkles, CheckCircle2 } from "lucide-react";

const BadgeIcon = ({ name, size = 20 }: { name: string; size?: number }) => {
  switch (name) {
    case "shield": return <Shield size={size} />;
    case "award": return <Award size={size} />;
    case "star": return <Star size={size} />;
    case "heart": return <Heart size={size} />;
    case "sparkles": return <Sparkles size={size} />;
    default: return <Star size={size} />;
  }
};
import { motion } from "motion/react";

interface ProgressProps {
  userState: UserState;
}

export const Progress: React.FC<ProgressProps> = ({ userState }) => {
  const currentLevel = LEVELS.find(l => l.level === userState.level) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.level === userState.level + 1);
  const progress = nextLevel 
    ? ((userState.points - currentLevel.threshold) / (nextLevel.threshold - currentLevel.threshold)) * 100 
    : 100;

  const challenges = [
    { id: "daily_mask", name: "Try this mask today!", points: 20, target: 1 },
    { id: "chat_3", name: "Chat 3 times today", points: 30, target: 3 },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-athlavix-accent flex items-center justify-center text-white shadow-inner">
              <Trophy size={24} />
            </div>
            <div>
              <h3 className="font-bold text-athlavix-accent text-lg">{currentLevel.name}</h3>
              <p className="text-sm opacity-70">Level {userState.level}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-athlavix-accent">{userState.points}</span>
            <p className="text-xs uppercase tracking-wider opacity-50 font-bold">Points</p>
          </div>
        </div>

        <div className="relative h-4 bg-white/30 rounded-full overflow-hidden border border-white/20">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-athlavix-accent to-athlavix-accent/60 shadow-[0_0_10px_rgba(93,53,67,0.3)]"
          />
        </div>
        {nextLevel && (
          <div className="flex justify-between mt-2">
            <span className="text-[10px] uppercase tracking-tighter opacity-50 font-bold">{currentLevel.threshold} pts</span>
            <p className="text-xs text-athlavix-accent font-medium">
              {nextLevel.threshold - userState.points} points to {nextLevel.name}
            </p>
            <span className="text-[10px] uppercase tracking-tighter opacity-50 font-bold">{nextLevel.threshold} pts</span>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <h4 className="font-bold text-athlavix-accent mb-4 flex items-center gap-2">
          <Award size={18} /> My Badges
        </h4>
        <div className="grid grid-cols-3 gap-4">
          {userState.badges.length > 0 ? (
            userState.badges.map((badge, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.1 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center text-athlavix-accent border border-athlavix-accent/20 shadow-sm">
                  <BadgeIcon name={badge.icon} size={24} />
                </div>
                <span className="text-[10px] text-center font-bold leading-tight text-athlavix-accent/80">{badge.name}</span>
              </motion.div>
            ))
          ) : (
            <p className="col-span-3 text-center text-sm opacity-50 py-4 italic">
              No badges yet. Keep glowing! ✨
            </p>
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        <h4 className="font-bold text-athlavix-accent mb-4 flex items-center gap-2">
          <Zap size={18} /> Daily Challenges
        </h4>
        <div className="space-y-4">
          {challenges.map(challenge => {
            const isCompleted = userState.completedChallenges?.includes(challenge.id);
            const currentProgress = userState.challengeProgress?.[challenge.id] || (isCompleted ? challenge.target : 0);
            const progressPercent = Math.min((currentProgress / challenge.target) * 100, 100);

            return (
              <div 
                key={challenge.id}
                className={`rounded-xl p-4 border transition-all ${
                  isCompleted 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700" 
                    : "bg-athlavix-accent/10 border-athlavix-accent/20 text-athlavix-accent"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold">{challenge.name}</p>
                    <p className="text-[10px] opacity-70">+{challenge.points} points</p>
                  </div>
                  {isCompleted ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : (
                    <span className="text-xs font-bold opacity-50">{currentProgress}/{challenge.target}</span>
                  )}
                </div>
                
                {!isCompleted && (
                  <div className="relative h-1.5 bg-white/30 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      className="absolute top-0 left-0 h-full bg-athlavix-accent"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
