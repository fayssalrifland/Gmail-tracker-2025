
import { gapi } from 'gapi-script';

const CLIENT_ID = "834476445989-kofmkrliuvrebfgnv2ron9h6ad90q95c.apps.googleusercontent.com";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.metadata"
];

interface Account {
  email: string;
  accessToken: string;
}

let currentAccounts: Account[] = [];

export async function initializeGoogleAuth() {
  try {
    return new Promise((resolve, reject) => {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            clientId: CLIENT_ID,
            scope: SCOPES.join(' '),
            plugin_name: 'Gmail Dashboard',
            ux_mode: 'popup',
          });

          // Initialize Gmail API
          await gapi.client.load('gmail', 'v1');
          resolve(true);
        } catch (error) {
          console.error('Error initializing Google API client:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error loading Google API client:', error);
    throw error;
  }
}

export async function signIn() {
  try {
    const auth = gapi.auth2.getAuthInstance();
    if (!auth) {
      throw new Error('Auth instance not initialized');
    }

    const result = await auth.signIn({
      prompt: 'select_account',
      ux_mode: 'popup'
    });

    if (result) {
      const profile = result.getBasicProfile();
      const email = profile.getEmail();
      const accessToken = result.getAuthResponse().access_token;

      // Check if account already exists
      if (!currentAccounts.some(acc => acc.email === email)) {
        currentAccounts.push({ email, accessToken });
      }
      return true;
    }
    return false;
  } catch (error) {
    if ((error as any).error === "popup_closed_by_user") {
      console.log('Sign-in cancelled by user');
      return false;
    }
    throw error;
  }
}

export async function removeAccount(email: string) {
  currentAccounts = currentAccounts.filter(acc => acc.email !== email);
}

export function getConnectedAccounts(): Account[] {
  return [...currentAccounts];
}

export async function signOut() {
  try {
    const auth = gapi.auth2.getAuthInstance();
    if (!auth) {
      throw new Error('Auth instance not initialized');
    }
    await auth.signOut();
    currentAccounts = [];
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export async function isSignedIn() {
  try {
    const auth = gapi.auth2.getAuthInstance();
    if (!auth) {
      return false;
    }
    return auth.isSignedIn.get();
  } catch (error) {
    console.error('Error checking sign-in status:', error);
    return false;
  }
}

interface MessageCount {
  messagesTotal: number;
  threadsTotal: number;
}

export interface AccountStats {
  email: string;
  counts: {
    inbox: MessageCount;
    spam: MessageCount;
  };
}

async function getMailCountsForAccount(account: Account): Promise<AccountStats> {
  try {
    // Set token and get stats for this specific account
    gapi.client.setToken({ access_token: account.accessToken });

    const inbox = await gapi.client.gmail.users.labels.get({
      userId: 'me',
      id: 'INBOX',
    });

    const spam = await gapi.client.gmail.users.labels.get({
      userId: 'me',
      id: 'SPAM',
    });

    return {
      email: account.email,
      counts: {
        inbox: {
          messagesTotal: inbox.result.messagesTotal || 0,
          threadsTotal: inbox.result.threadsTotal || 0,
        },
        spam: {
          messagesTotal: spam.result.messagesTotal || 0,
          threadsTotal: spam.result.threadsTotal || 0,
        },
      }
    };
  } catch (error) {
    console.error(`Error fetching counts for ${account.email}:`, error);
    // Return empty counts on error
    return {
      email: account.email,
      counts: {
        inbox: { messagesTotal: 0, threadsTotal: 0 },
        spam: { messagesTotal: 0, threadsTotal: 0 }
      }
    };
  }
}

export async function getMailCounts(): Promise<AccountStats[]> {
  if (!gapi.client?.gmail) {
    throw new Error('Gmail API not initialized');
  }

  // Process accounts sequentially to avoid token conflicts
  const results = [];
  for (const account of currentAccounts) {
    const stats = await getMailCountsForAccount(account);
    results.push(stats);
  }
  return results;
}

export async function downloadInboxMessages(email: string): Promise<string> {
  if (!gapi.client?.gmail) {
    throw new Error('Gmail API not initialized');
  }

  const account = currentAccounts.find(acc => acc.email === email);
  if (!account) {
    throw new Error('Account not found');
  }

  // Set token for this specific account's request
  gapi.client.setToken({ access_token: account.accessToken });

  try {
    const response = await gapi.client.gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: 100
    });

    if (!response.result.messages) {
      return 'Account,From\n' + email + ',';
    }

    const messages = await Promise.all(
      response.result.messages.map(async (message: any) => {
        const details = await gapi.client.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From']
        });

        const fromHeader = details.result.payload.headers?.find(
          (header: any) => header.name === 'From'
        );

        return email + ',' + (fromHeader?.value || 'Unknown');
      })
    );

    return ['Account,From'].concat(messages).join('\n');
  } catch (error) {
    console.error('Error downloading messages:', error);
    throw error;
  }
}
