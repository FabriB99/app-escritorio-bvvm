import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../app/firebase-config';

export type RolUsuario = 'admin' | 'jefatura' | 'guardia' | 'graduados' | 'legajo' | 'bombero' | string;

export interface UserData {
  uid: string;
  rol: RolUsuario;
}

export interface MiembroActivo {
  id: string;
  nombre: string;
  apellido: string;
  categoria: string;
  roles: string[];
  pin?: string; // Opcional para no obligar a guardarlo en localStorage
}

interface UserContextType {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  miembroActivo: MiembroActivo | null;
  setMiembroActivo: (m: MiembroActivo | null) => void;
  loading: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_USER_KEY = 'usuario';
const STORAGE_MIEMBRO_KEY = 'miembroActivo';

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  // Inicializamos el estado leyendo directo de localStorage una sola vez
  const [user, setUser] = useState<UserData | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem(STORAGE_USER_KEY);
      return null;
    }
  });

  const [miembroActivo, setMiembroActivoState] = useState<MiembroActivo | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_MIEMBRO_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem(STORAGE_MIEMBRO_KEY);
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Función envoltorio que sanitiza el PIN antes de guardar al miembro en memoria
  const setMiembroActivo = (miembro: MiembroActivo | null) => {
    if (miembro) {
      const { pin: _pinOculto, ...miembroSeguro } = miembro;
      setMiembroActivoState(miembroSeguro);
      localStorage.setItem(STORAGE_MIEMBRO_KEY, JSON.stringify(miembroSeguro));
    } else {
      setMiembroActivoState(null);
      localStorage.removeItem(STORAGE_MIEMBRO_KEY);
    }
  };

  useEffect(() => {
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
            localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(fullUser));
          } else {
            limpiarSesionLocal();
          }
        } catch (error) {
          console.error('Error al obtener el rol del usuario:', error);
          limpiarSesionLocal();
        }
      } else {
        limpiarSesionLocal();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const limpiarSesionLocal = () => {
    setUser(null);
    setMiembroActivoState(null);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_MIEMBRO_KEY);
  };

  const logout = async () => {
    await auth.signOut();
    limpiarSesionLocal();
  };

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