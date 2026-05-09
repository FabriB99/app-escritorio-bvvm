// src/context/UserContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../app/firebase-config';

interface UserData {
  uid: string;
  rol: string;
}

export interface MiembroActivo {
  id: string;
  nombre: string;
  apellido: string;
  categoria: string;
  roles: string[];
  pin: string;
}

interface UserContextType {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  miembroActivo: MiembroActivo | null;
  setMiembroActivo: (m: MiembroActivo | null) => void;
  loading: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [miembroActivo, setMiembroActivo] = useState<MiembroActivo | null>(null);
  const [loading, setLoading] = useState(true);

  // 🧠 Restaurar datos guardados al iniciar
  useEffect(() => {
    const storedUser = localStorage.getItem('usuario');
    const storedMiembro = localStorage.getItem('miembroActivo');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('usuario');
      }
    }

    if (storedMiembro) {
      try {
        setMiembroActivo(JSON.parse(storedMiembro));
      } catch {
        localStorage.removeItem('miembroActivo');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const uid = firebaseUser.uid;
          const docRef = doc(db, 'usuarios', uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            const fullUser: UserData = { uid, rol: data.rol };
            setUser(fullUser);
            localStorage.setItem('usuario', JSON.stringify(fullUser));
          } else {
            setUser(null);
            localStorage.removeItem('usuario');
          }
        } catch (error) {
          console.error('Error al obtener el rol del usuario:', error);
          setUser(null);
          localStorage.removeItem('usuario');
        }
      } else {
        setUser(null);
        localStorage.removeItem('usuario');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🧹 Cerrar sesión limpia todo
  const logout = () => {
    auth.signOut();
    setUser(null);
    setMiembroActivo(null);
    localStorage.removeItem('usuario');
    localStorage.removeItem('miembroActivo');
  };

  // 💾 Guardar automáticamente cada vez que cambie el miembro activo
  useEffect(() => {
    if (miembroActivo) {
      localStorage.setItem('miembroActivo', JSON.stringify(miembroActivo));
    } else {
      localStorage.removeItem('miembroActivo');
    }
  }, [miembroActivo]);

  return (
    <UserContext.Provider
      value={{ user, setUser, miembroActivo, setMiembroActivo, loading, logout }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser debe usarse dentro de UserProvider');
  return context;
};

export { UserContext };
