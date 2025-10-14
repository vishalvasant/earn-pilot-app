// Simplified single-theme hook: Black & Cyan palette

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
// Single Black & Cyan theme
const blackCyanTheme: Theme = {
  background: '#0A0A0A', // near black
  card: '#111418', // dark card with slight blue tint
  text: '#E6F7FA', // very light cyan-tinted text
  textSecondary: '#9BD7E0',
  primary: '#00E5FF', // cyan
  primaryLight: '#00B8D4', // darker cyan
  border: '#1B2026',
  borderLight: '#1F252C',
  placeholder: '#6FAAB3',
  accent: '#14F1FF',
  success: '#1DD1A1',
  error: '#FF6B6B',
  warning: '#FFD166',
  gradient: {
    // Use cyan fades for primary and a darker cyan blend for secondary
    primary: ['#00E5FF', '#00B8D4'],
    secondary: ['#0AA2C0', '#007A8A'],
  },
};

// Hook simply returns the fixed theme
export const useTheme = (): Theme => {
  return blackCyanTheme;
};