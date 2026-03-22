export enum SkinType {
  OILY = "oily",
  DRY = "dry",
  COMBO = "combo",
  NORMAL = "normal",
  SENSITIVE = "sensitive"
}

export const SKIN_CONCERNS = [
  "Acne",
  "Redness",
  "Hyperpigmentation",
  "Fine Lines",
  "Dark Circles",
  "Large Pores",
  "Dryness",
  "Dullness",
  "Sensitivity"
];

export interface SkinAnalysis {
  id: string;
  timestamp: number;
  image: string;
  result: string;
}

export interface VoiceSettings {
  preset: "soft" | "cheerful" | "calm";
  speed: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
}

export interface Message {
  role: "user" | "model";
  text: string;
  image?: string;
  timestamp: number;
}

export interface NotificationSettings {
  enabled: boolean;
  dailyAlerts: boolean;
  updateAlerts: boolean;
}

export interface UserState {
  id: string;
  name: string;
  whatsapp: string;
  avatar: string | null;
  botAvatar: string | null;
  skinType: SkinType | null;
  concerns: string[];
  points: number;
  level: number;
  badges: Badge[];
  completedChallenges: string[];
  challengeProgress: Record<string, number>;
  history: Message[];
  analysisHistory: SkinAnalysis[];
  voiceSettings: VoiceSettings;
  notificationSettings: NotificationSettings;
  lastNotificationAt: number | null;
  onboardingSeen: string[];
  streak: number;
  lastCheckIn: number | null;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  durationDays: number;
  type: "streak" | "task" | "analysis";
  icon: string;
}

export const AVAILABLE_CHALLENGES: Challenge[] = [
  {
    id: "7_day_hydration",
    title: "7-Day Hydration",
    description: "Drink 8 glasses of water every day for a week.",
    points: 50,
    durationDays: 7,
    type: "streak",
    icon: "💧"
  },
  {
    id: "first_analysis",
    title: "First Scan",
    description: "Complete your first AI skin analysis.",
    points: 20,
    durationDays: 1,
    type: "analysis",
    icon: "📸"
  },
  {
    id: "night_routine_streak",
    title: "Night Owl Routine",
    description: "Complete your night routine 3 days in a row.",
    points: 30,
    durationDays: 3,
    type: "streak",
    icon: "🌙"
  },
  {
    id: "sunscreen_hero",
    title: "Sunscreen Hero",
    description: "Apply sunscreen every morning for 5 days.",
    points: 40,
    durationDays: 5,
    type: "streak",
    icon: "☀️"
  },
  {
    id: "morning_glow",
    title: "Morning Glow",
    description: "Complete your morning routine 3 days in a row.",
    points: 30,
    durationDays: 3,
    type: "streak",
    icon: "🌅"
  },
  {
    id: "share_progress",
    title: "Proud Moment",
    description: "Share your progress with the community.",
    points: 15,
    durationDays: 1,
    type: "task",
    icon: "📢"
  }
];

export const LEVELS = [
  { level: 1, name: "Newbie Glow", threshold: 0 },
  { level: 2, name: "Glow Getter", threshold: 100 },
  { level: 3, name: "Radiance Boss", threshold: 500 },
  { level: 4, name: "Luminous Legend", threshold: 1000 },
  { level: 5, name: "Skin Sage", threshold: 2500 },
];
