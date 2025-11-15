import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import bs58 from "bs58";

interface WalletConnection {
  walletAddress: string;
  isEligible: boolean;
  tokenBalance?: number;
  lastVerifiedAt: string;
  userId: string;
}

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, isMockAuth, hasPremiumAccess } = useAuth() as any;

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      checkExistingConnection();
    }
  }, [isAuthenticated, authLoading]);

  const checkExistingConnection = async () => {
    if (!isAuthenticated) return;
    
    // Wallet verification requires real authentication
    if (isMockAuth) {
      return; // Skip in mock mode
    }
    
    try {
      const response = await apiRequest("GET", "/api/wallet/status");
      
      // 401 = auth required (mock mode or not logged in)
      if (response.status === 401) {
        return; // Skip silently
      }
      
      if (!response.ok) {
        console.error("Failed to check wallet status:", response.status);
        return;
      }
      
      const data = await response.json();
      // data will be null if no wallet is connected
      if (data && data.walletAddress) {
        setConnection(data);
        setWalletAddress(data.walletAddress);
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  };

  const connectWallet = useCallback(async () => {
    if (!window.solana || !window.solana.isPhantom) {
      toast({
        title: "Phantom Wallet Not Found",
        description: "Please install Phantom wallet to continue.",
        variant: "destructive",
      });
      window.open("https://phantom.app/", "_blank");
      return { success: false };
    }

    setIsConnecting(true);
    try {
      console.log('[Wallet] Connecting to Phantom...');
      const resp = await window.solana.connect();
      const publicKey = resp.publicKey.toString();
      console.log('[Wallet] Connected to wallet:', publicKey.slice(0, 8) + '...');
      setWalletAddress(publicKey);

      // Use public login-challenge endpoint
      console.log('[Wallet] Requesting login challenge...');
      const challengeResponse = await apiRequest("GET", `/api/wallet/login-challenge?walletAddress=${publicKey}`);
      const challengeData = await challengeResponse.json();
      console.log('[Wallet] Challenge received, requesting signature...');

      const encodedMessage = new TextEncoder().encode(challengeData.challenge);
      const signedMessage = await window.solana.signMessage(encodedMessage, "utf8");
      console.log('[Wallet] Message signed successfully');
      
      const signatureBase58 = bs58.encode(signedMessage.signature);

      // Use public login endpoint
      console.log('[Wallet] Submitting login request...');
      const loginResponse = await apiRequest("POST", "/api/wallet/login", {
        walletAddress: publicKey,
        signature: signatureBase58,
        challenge: challengeData.challenge,
      });

      const loginData = await loginResponse.json();
      console.log('[Wallet] Login response received');

      if (loginData.user) {
        console.log('[Wallet] Login successful!');
        toast({
          title: "Logged In Successfully!",
          description: `Welcome! You're now logged in with your Phantom wallet.`,
        });
        return { success: true, user: loginData.user };
      } else {
        console.error('[Wallet] Login failed:', loginData.message);
        toast({
          title: "Login Failed",
          description: loginData.message || "Failed to login with wallet.",
          variant: "destructive",
        });
        return { success: false };
      }
    } catch (error: any) {
      console.error("[Wallet] Login error:", error);
      
      let errorMessage = "Failed to connect wallet. Please try again.";
      
      // Provide more specific error messages
      if (error.message?.includes('User rejected')) {
        errorMessage = "You rejected the wallet connection request.";
      } else if (error.message?.includes('403')) {
        errorMessage = "Signature verification failed. Please try again.";
      } else if (error.message?.includes('401')) {
        errorMessage = "Authentication failed. Please refresh and try again.";
      } else if (error.message?.includes('500')) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const disconnectWallet = useCallback(async () => {
    if (window.solana) {
      await window.solana.disconnect();
    }
    setWalletAddress(null);
    setConnection(null);
  }, []);

  return {
    walletAddress,
    connection,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
}

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
    };
  }
}
