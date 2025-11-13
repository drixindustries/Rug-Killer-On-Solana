import type { User } from "@shared/schema";

export function useAuth() {
  // Mock auth for testing - always authenticated on frontend
  // But backend still requires real auth for premium features
  const isMockAuth = true; // Set to false to enable real Replit auth
  
  return {
    user: isMockAuth ? { id: 'guest', email: 'guest@solanarug.killer' } as User : null,
    isLoading: false,
    isAuthenticated: isMockAuth,
    isMockAuth,
    // Premium features require real authentication
    hasPremiumAccess: !isMockAuth,
  };
}
