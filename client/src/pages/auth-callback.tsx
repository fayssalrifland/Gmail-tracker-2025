import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { isSignedIn } from "@/lib/gmail";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if the user was successfully authenticated
        const signedIn = await isSignedIn();
        
        if (signedIn) {
          toast({
            title: "Success",
            description: "Successfully signed in with Google",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to sign in with Google",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "An error occurred during authentication",
          variant: "destructive",
        });
      } finally {
        // Redirect back to home page regardless of the outcome
        setLocation("/");
      }
    };

    handleCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Completing authentication...</p>
    </div>
  );
}
