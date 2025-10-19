// Fintech Bold Theme - Professional & Trustworthy
// Inspired by Stripe, Coinbase, and premium finance apps

export interface Theme {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryLight: string;
  border: string;
  borderLight: string;
  placeholder: string;
  accent: string;
  success: string;
  error: string;
  warning: string;
  gradient: {
    primary: string[];
    secondary: string[];
  };
}

// Fintech Bold - Navy & Blue
const fintechTheme: Theme = {
  background: '#0A1F44', // Deep navy (trustworthy)
  card: '#0F2954', // Navy blue card
  text: '#F8FAFC', // Soft white (Slate 50)
  textSecondary: '#94A3B8', // Cool gray (Slate 400)
  primary: '#3B82F6', // Electric blue (confident)
  primaryLight: '#60A5FA', // Light blue (Blue 400)
  border: '#1E3A5F', // Navy border
  borderLight: '#2A4A6F', // Lighter navy border
  placeholder: '#64748B', // Muted gray (Slate 500)
  accent: '#60A5FA', // Bright blue accent
  success: '#10B981', // Clean green (Emerald 500)
  error: '#EF4444', // Clean red (Red 500)
  warning: '#F59E0B', // Amber (Amber 500)
  gradient: {
    // Blue gradient - professional
    primary: ['#3B82F6', '#2563EB', '#1D4ED8'],
    // Navy to blue - depth
    secondary: ['#1E3A8A', '#1E40AF', '#3B82F6'],
  },
};

// Returns the professional Fintech theme
export const useTheme = (): Theme => {
  return fintechTheme;
};