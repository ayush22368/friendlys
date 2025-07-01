import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isCompanion: boolean;
  companionId: string | null;
  userRole: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCompanion, setIsCompanion] = useState(false);
  const [companionId, setCompanionId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchUserRole = async (userId: string) => {
    try {
      // Check if we already have role data cached
      const cachedRole = localStorage.getItem(`user_role_${userId}`);
      if (cachedRole) {
        const roleData = JSON.parse(cachedRole);
        setUserRole(roleData.role);
        setIsAdmin(roleData.role === 'admin');
        setIsCompanion(roleData.role === 'companion');
        setCompanionId(roleData.companion_id);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role, companion_id')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.log('No role found for user, defaulting to user role');
        setUserRole('user');
        setIsAdmin(false);
        setIsCompanion(false);
        setCompanionId(null);
        // Cache the default role
        localStorage.setItem(`user_role_${userId}`, JSON.stringify({ role: 'user', companion_id: null }));
        return;
      }

      setUserRole(data.role);
      setIsAdmin(data.role === 'admin');
      setIsCompanion(data.role === 'companion');
      setCompanionId(data.companion_id);
      
      // Cache the role data
      localStorage.setItem(`user_role_${userId}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('user');
      setIsAdmin(false);
      setIsCompanion(false);
      setCompanionId(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRole(session.user.id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          // Use setTimeout to prevent blocking
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else if (!session) {
          // Clear cached role data
          if (user?.id) {
            localStorage.removeItem(`user_role_${user.id}`);
          }
          setUserRole(null);
          setIsAdmin(false);
          setIsCompanion(false);
          setCompanionId(null);
        }
      }
    );

    // Initialize
    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Clear cached role data first
      if (user?.id) {
        localStorage.removeItem(`user_role_${user.id}`);
      }
      
      // Clear all auth state immediately
      setIsAdmin(false);
      setIsCompanion(false);
      setCompanionId(null);
      setUserRole(null);
      setUser(null);
      setSession(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Force redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if signout fails, redirect to auth
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    isCompanion,
    companionId,
    userRole,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
