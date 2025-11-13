import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

// Toggle this to switch between mock and real authentication
const USE_MOCK_AUTH = true;

export function useAuth() {
  // Real authentication using Replit OIDC
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      if (USE_MOCK_AUTH) {
        // Mock mode - return stub user
        return { id: 'guest', email: 'guest@solanarug.killer' } as User;
      }
      
      // Real mode - fetch from backend
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include",
        });
        
        if (response.status === 401) {
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`Authentication check failed: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Auth check error:", error);
        throw error;
      }
    },
    retry: false,
    staleTime: USE_MOCK_AUTH ? Infinity : 30 * 1000,
  });

  return {
    user: user || null,
    isLoading: USE_MOCK_AUTH ? false : isLoading,
    isAuthenticated: !!user,
    isMockAuth: USE_MOCK_AUTH,
    hasPremiumAccess: !USE_MOCK_AUTH && !!user,
  };
}
