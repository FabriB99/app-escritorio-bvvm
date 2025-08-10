import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UsuarioBiblioteca {
  dni: string;
  nombre: string;
}

interface UsuarioBibliotecaContextProps {
  usuario: UsuarioBiblioteca | null;
  setUsuario: (usuario: UsuarioBiblioteca | null) => void;
}

const UsuarioBibliotecaContext = createContext<UsuarioBibliotecaContextProps | undefined>(undefined);

export const UsuarioBibliotecaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioBiblioteca | null>(null);

  return (
    <UsuarioBibliotecaContext.Provider value={{ usuario, setUsuario }}>
      {children}
    </UsuarioBibliotecaContext.Provider>
  );
};

export const useUsuarioBiblioteca = (): UsuarioBibliotecaContextProps => {
  const context = useContext(UsuarioBibliotecaContext);
  if (!context) {
    throw new Error('useUsuarioBiblioteca debe usarse dentro de UsuarioBibliotecaProvider');
  }
  return context;
};
