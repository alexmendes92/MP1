
// Mock client to simulate Supabase structure without backend connection
export const supabase = {
  // Fix: accept table name argument
  from: (table: string) => ({
    // Fix: accept columns argument
    select: (columns: string) => Promise.resolve({ data: [], error: null }),
    insert: (data: any) => Promise.resolve({ data: [], error: null }),
    update: (data: any) => Promise.resolve({ data: [], error: null }),
    delete: () => Promise.resolve({ data: [], error: null }),
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    // Fix: accept callback argument
    onAuthStateChange: (callback: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: (credentials: any) => Promise.resolve({ data: {}, error: null }),
    signUp: (credentials: any) => Promise.resolve({ data: {}, error: null }),
    signOut: () => Promise.resolve(),
  }
};
