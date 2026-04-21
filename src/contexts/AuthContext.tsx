import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signInWithPopup,
  GoogleAuthProvider, 
  signOut,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: any | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  sendVerification: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    if (user) {
      // Block profile fetch if email is not verified, to match firestore rules
      if (!user.emailVerified) {
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log("Session verified for:", user.email);
      unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          // Check for invitations
          try {
            const emailToSearch = user.email?.trim().toLowerCase();
            const invQuery = query(collection(db, 'invitations'), where('email', '==', emailToSearch));
            const invSnap = await getDocs(invQuery);
            
            if (!invSnap.empty) {
              const invData = invSnap.docs[0].data();
              const newUserProfile = {
                id: user.uid,
                tenant_id: invData.tenant_id,
                name: invData.name || user.displayName || 'Unnamed Staff',
                email: user.email,
                role: invData.role || 'sales_rep',
                is_active: true,
                created_at: serverTimestamp()
              };
              
              await setDoc(doc(db, 'users', user.uid), newUserProfile);
              await deleteDoc(invSnap.docs[0].ref);
              setProfile(newUserProfile);
            } else {
              setProfile(null);
            }
          } catch (err) {
            console.error("Invitation check error:", err);
            setProfile(null);
          }
        }
        setLoading(false);
      }, (error) => {
        console.error("Profile sync error:", error);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [user]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const sendVerification = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      // Force trigger state update to re-evaluate emailVerified
      setUser(auth.currentUser ? { ...auth.currentUser } as FirebaseUser : null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, sendVerification, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
