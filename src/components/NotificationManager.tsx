import React, { useEffect, useCallback } from 'react';
import { UserState } from '../types';
import { Bell } from 'lucide-react';

interface NotificationManagerProps {
  userState: UserState;
  onUpdate: (updatedData: Partial<UserState>) => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ userState, onUpdate }) => {
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted" && userState.notificationSettings.enabled) {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
      onUpdate({ lastNotificationAt: Date.now() });
    }
  }, [userState.notificationSettings.enabled, onUpdate]);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      onUpdate({ 
        notificationSettings: { 
          ...userState.notificationSettings, 
          enabled: true 
        } 
      });
      sendNotification("Notifications Enabled! ✨", {
        body: "You'll now receive daily skin tips and important updates."
      });
    } else {
      onUpdate({ 
        notificationSettings: { 
          ...userState.notificationSettings, 
          enabled: false 
        } 
      });
    }
  };

  useEffect(() => {
    if (!userState.notificationSettings.enabled) return;

    const checkNotifications = () => {
      const now = Date.now();
      const lastNotify = userState.lastNotificationAt || 0;
      const twelveHours = 12 * 60 * 60 * 1000;
      const oneDay = 24 * 60 * 60 * 1000;

      // Daily Alert Logic
      if (userState.notificationSettings.dailyAlerts) {
        const lastNotifyDate = new Date(lastNotify).toDateString();
        const todayDate = new Date(now).toDateString();
        
        if (lastNotifyDate !== todayDate) {
          sendNotification("Daily Skin Check-in! 🧴", {
            body: "Don't forget your skincare routine today. How's your skin feeling?",
            tag: 'daily-alert'
          });
          return; // Don't send multiple at once
        }
      }

      // 12h Update Alert Logic
      if (userState.notificationSettings.updateAlerts) {
        if (now - lastNotify > twelveHours) {
          // Check if there are "new" messages or if it's been 12h since last analysis
          const lastMessage = userState.history[userState.history.length - 1];
          const lastAnalysis = userState.analysisHistory[0];
          
          if (lastMessage && lastMessage.role === 'model' && (now - lastMessage.timestamp) > twelveHours) {
            sendNotification("New Tips Available! ✨", {
              body: "ATHLAVIX has some new insights for your skin journey. Come take a look!",
              tag: 'update-alert'
            });
          } else if (lastAnalysis && (now - lastAnalysis.timestamp) > twelveHours) {
            sendNotification("Ready for an update? 📸", {
              body: "It's been 12 hours since your last skin analysis. Let's see your progress!",
              tag: 'analysis-update'
            });
          }
        }
      }
    };

    // Check immediately on mount/state change
    checkNotifications();

    // Set up interval to check every hour
    const interval = setInterval(checkNotifications, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userState.notificationSettings, userState.lastNotificationAt, userState.history, sendNotification]);

  // Show a permission prompt if enabled in settings but permission not granted
  if (userState.notificationSettings.enabled && "Notification" in window && Notification.permission === "default") {
    return (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm">
        <div className="bg-athlavix-accent text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <Bell size={20} className="animate-bounce" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest mb-1">Enable Notifications?</p>
            <p className="text-[10px] opacity-80 leading-tight">Stay updated with daily skin tips and analysis results.</p>
          </div>
          <div className="flex flex-col gap-1">
            <button 
              onClick={requestPermission}
              className="px-3 py-1.5 bg-white text-athlavix-accent rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all"
            >
              Allow
            </button>
            <button 
              onClick={() => onUpdate({ notificationSettings: { ...userState.notificationSettings, enabled: false } })}
              className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-all"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
