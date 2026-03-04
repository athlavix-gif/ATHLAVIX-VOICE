export enum SkinType {
  OILY = "oily",
  DRY = "dry",
  COMBO = "combo",
  NORMAL = "normal",
  SENSITIVE = "sensitive"
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
}

export interface Message {
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export interface UserState {
  id: string;
  name: string;
  whatsapp: string;
  avatar: string | null;
  skinType: SkinType | null;
  concerns: string[];
  points: number;
  level: number;
  badges: Badge[];
  completedChallenges: string[];
  history: Message[];
}

export const LEVELS = [
  { level: 1, name: "Newbie Glow", threshold: 0 },
  { level: 2, name: "Glow Getter", threshold: 100 },
  { level: 3, name: "Radiance Boss", threshold: 500 },
];
