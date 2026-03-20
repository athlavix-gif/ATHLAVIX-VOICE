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
}

export const LEVELS = [
  { level: 1, name: "Newbie Glow", threshold: 0 },
  { level: 2, name: "Glow Getter", threshold: 100 },
  { level: 3, name: "Radiance Boss", threshold: 500 },
];
