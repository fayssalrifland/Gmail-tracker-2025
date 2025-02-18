import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom"; // <-- Import this
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code"); // <-- Get OAuth code from URL

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (!code) {
          throw new Error("No authorization code found");
        }

        // Send the authorization code to your backend API
        const response = await fetch("https://gmail-tracker-2025.onrender.com/api/auth/google", {
          method: "POST",
          body: JSON.stringify({ code }),
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("Failed to exchange code for token");
        }

        const data = await response.json();
        console.log("Authentication successful:", data);

        toast({
          title: "Success",
          description: "Successfully signed in with Google",
        });

        // Optionally, store the token in localStorage or context
        localStorage.setItem("token", data.token);
      } catch (error) {
        console.error("Auth error:", error);

        toast({
          title: "Error",
          description: "Authentication failed",
          variant: "destructive",
        });
      } finally {
        setLocation("/"); // Redirect to home page
      }
    };

    handleCallback();
  }, [code, setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Completing authentication...</p>
    </div>
  );
}
