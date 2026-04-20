import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signInWithRedirect, 
  getRedirectResult,
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
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

    // Handle sign-in redirect result
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Successfully back from redirect login.");
        }
      } catch (err) {
        console.error("Redirect login result error:", err);
      }
    };
    handleRedirect();

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (u) {
        console.log("User authenticated:", u.email);
        unsubscribeProfile = onSnapshot(doc(db, 'users', u.uid), async (docSnap) => {
          if (docSnap.exists()) {
            console.log("Profile found for:", u.email);
            setProfile(docSnap.data());
            setLoading(false);
          } else {
            console.log("No profile found, checking invitations for:", u.email);
            // Check for invitations
            try {
              const emailToSearch = u.email?.trim().toLowerCase();
              const invQuery = query(collection(db, 'invitations'), where('email', '==', emailToSearch));
              const invSnap = await getDocs(invQuery);
              
              if (!invSnap.empty) {
                console.log("Invitation found! Joining...");
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
                console.log("Successfully joined and profile created.");
                setProfile(newUserProfile);
              } else {
                console.log("No invitations found for:", u.email);
                setProfile(null);
              }
            } catch (err) {
              console.error("Invitation check or auto-join error:", err);
              setProfile(null);
            }
            setLoading(false);
          }
        }, (error) => {
          console.error("Profile snapshot permission or network error:", error);
          setLoading(false);
        });
      } else {
        console.log("No user session found.");
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
    // Using redirect instead of popup to avoid COOP blocks
    await signInWithRedirect(auth, provider);
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
