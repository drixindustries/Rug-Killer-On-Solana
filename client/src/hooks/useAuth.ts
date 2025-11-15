import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  // Wallet-based authentication
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
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
    staleTime: 30 * 1000,
  });

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    hasPremiumAccess: !!user,
  };
}
