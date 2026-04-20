import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: any | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (u) {
        unsubscribeProfile = onSnapshot(doc(db, 'users', u.uid), async (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
            setLoading(false);
          } else {
            // Check for invitations
            try {
              const invQuery = query(collection(db, 'invitations'), where('email', '==', u.email?.toLowerCase()));
              const invSnap = await getDocs(invQuery);
              
              if (!invSnap.empty) {
                const invData = invSnap.docs[0].data();
                const newUserProfile = {
                  id: u.uid,
                  tenant_id: invData.tenant_id,
                  name: invData.name || u.displayName || 'Unnamed Staff',
                  email: u.email,
                  role: invData.role || 'sales_rep',
                  is_active: true,
                  created_at: serverTimestamp()
                };
                
                await setDoc(doc(db, 'users', u.uid), newUserProfile);
                await deleteDoc(invSnap.docs[0].ref);
                
                setProfile(newUserProfile);
              } else {
                setProfile(null);
              }
            } catch (err) {
              console.error("Invitation check error:", err);
              setProfile(null);
            }
            setLoading(false);
          }
        }, (error) => {
          console.error("Profile snapshot error:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
