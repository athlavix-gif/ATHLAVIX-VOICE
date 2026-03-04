import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Award, Star, Trophy } from "lucide-react";

interface CelebrationProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "badge" | "challenge" | "level";
}

export const Celebration: React.FC<CelebrationProps> = ({ isVisible, onClose, title, message, type = "challenge" }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-athlavix-accent/20 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 20, opacity: 0 }}
            className="glass-card max-w-sm w-full p-8 text-center space-y-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated Background Sparkles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0], 
                    scale: [0, 1.5, 0],
                    x: Math.random() * 200 - 100,
                    y: Math.random() * 200 - 100
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    delay: i * 0.3 
                  }}
                  className="absolute left-1/2 top-1/2 text-athlavix-accent/30"
                >
                  <Sparkles size={24} />
                </motion.div>
              ))}
            </div>

            <div className="w-20 h-20 bg-athlavix-accent rounded-full flex items-center justify-center text-white mx-auto shadow-xl relative z-10">
              {type === "badge" && <Award size={40} />}
              {type === "challenge" && <Zap size={40} className="fill-current" />}
              {type === "level" && <Trophy size={40} />}
            </div>

            <div className="space-y-2 relative z-10">
              <h2 className="text-2xl font-bold text-athlavix-accent">{title}</h2>
              <p className="text-athlavix-accent/70 font-medium">{message}</p>
            </div>

            <button
              onClick={onClose}
              className="w-full btn-primary py-3 relative z-10"
            >
              Slay, Bestie! ✨
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import { Zap } from "lucide-react";
