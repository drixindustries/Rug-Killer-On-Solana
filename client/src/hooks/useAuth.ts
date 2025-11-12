import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Authentication disabled - always return as authenticated for open access
  return {
    user: { id: 'guest', email: 'guest@solanarug.killer' },
    isLoading: false,
    isAuthenticated: true,
  };
  
  /* ORIGINAL AUTH CODE - DISABLED FOR TESTING
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
  */
}
