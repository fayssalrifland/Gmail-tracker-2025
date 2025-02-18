import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Loader2, Mail, RefreshCw, Download, Trash2, PlusCircle, XCircle } from "lucide-react";
import { 
  initializeGoogleAuth, 
  signIn, 
  signOut,
  removeAccount,
  isSignedIn, 
  getMailCounts,
  downloadInboxMessages,
  getConnectedAccounts,
  type AccountStats
} from "@/lib/gmail";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [accounts, setAccounts] = useState<AccountStats[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const setup = async () => {
      try {
        await initializeGoogleAuth();
        const signedIn = await isSignedIn();
        setAuthenticated(signedIn);
        if (signedIn) {
          await fetchCounts();
        }
      } catch (error) {
        toast({
          title: "Notice",
          description: "This app is in development mode. You may proceed if you trust the developer.",
          variant: "default",
        });
      } finally {
        setLoading(false);
      }
    };
    setup();
  }, []);

  const fetchCounts = async () => {
    try {
      const data = await getMailCounts();
      setAccounts(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch mail counts. Please try signing in again.",
        variant: "destructive",
      });
      if ((error as any)?.status === 401) {
        await handleSignOut();
      }
    }
  };

  const handleAddAccount = async () => {
    setLoading(true);
    try {
      const success = await signIn();
      if (success) {
        setAuthenticated(true);
        await fetchCounts();
        toast({
          title: "Success",
          description: "Successfully added new Google account",
        });
      } else {
        toast({
          title: "Notice",
          description: "Account addition was cancelled or failed. Please try again.",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add account. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccount = async (email: string) => {
    try {
      await removeAccount(email);
      await fetchCounts();
      toast({
        title: "Success",
        description: `Removed account ${email}`,
      });

      if (accounts.length === 0) {
        setAuthenticated(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove account",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthenticated(false);
      setAccounts([]);
      toast({
        title: "Success",
        description: "Successfully signed out of all accounts",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCounts();
      toast({
        title: "Success",
        description: "Mail counts refreshed for all accounts",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownload = async (email: string) => {
    setDownloading(email);
    try {
      const csvContent = await downloadInboxMessages(email);

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inbox_senders_${email}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Inbox senders list downloaded for ${email}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to download inbox senders for ${email}`,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Gmail Dashboard</h1>
          <div className="flex gap-4">
            {authenticated && (
              <Button
                variant="outline"
                onClick={handleAddAccount}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            )}
            <Button
              variant={authenticated ? "destructive" : "default"}
              onClick={authenticated ? handleSignOut : handleAddAccount}
            >
              {authenticated ? "Sign Out All" : "Sign In with Google"}
            </Button>
          </div>
        </div>

        {authenticated && accounts.length > 0 && (
          <>
            {accounts.map((account) => (
              <div key={account.email} className="mb-8 border rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">{account.email}</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAccount(account.email)}
                  >
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Inbox</CardTitle>
                      <Inbox className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{account.counts.inbox.messagesTotal}</div>
                      <p className="text-xs text-muted-foreground">
                        {account.counts.inbox.threadsTotal} threads
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Spam</CardTitle>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{account.counts.spam.messagesTotal}</div>
                      <p className="text-xs text-muted-foreground">
                        {account.counts.spam.threadsTotal} threads
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(account.email)}
                    disabled={downloading === account.email}
                  >
                    {downloading === account.email ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh All
              </Button>
            </div>
          </>
        )}

        {authenticated && accounts.length === 0 && (
          <div className="text-center text-muted-foreground">
            No accounts connected. Click "Add Account" to get started.
          </div>
        )}

        {!authenticated && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-center text-muted-foreground">
                Sign in with Google to view your Gmail statistics
              </p>
              <p className="text-center text-sm text-muted-foreground mt-2">
                Note: This app is in development mode. You may see a warning about
                it being unverified. You can proceed if you trust the developer.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}