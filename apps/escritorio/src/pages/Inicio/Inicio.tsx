import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Importamos los plugins oficiales de Tauri v2
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';

import { Download, BookOpen, Flame, Loader2 } from 'lucide-react';
import './Inicio.css';

const Inicio: React.FC = () => {
  const navigate = useNavigate();
  
  // Estados para la gestión de versión y actualización
  const [currentVersion, setCurrentVersion] = useState('...');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Obtenemos la versión real desde Tauri
        const v = await getVersion();
        setCurrentVersion(v?.trim() ? v : 'Desconocida');

        // 2. Verificamos si hay una actualización disponible en el endpoint
        // (Usa el latest.json que definiste en tu tauri.conf.json) [cite: 7]
        const update = await check();
        
        if (update?.available) {
          console.log(`Nueva versión encontrada: ${update.version}`);
          setUpdateAvailable(true);
        }
      } catch (err) {
        const errorMsg = String(err);
        if (errorMsg.includes('window.__TAURI_IPC__')) {
          setCurrentVersion('Web-Preview');
          return;
        }
        console.error('Error al inicializar el updater:', err);
        setCurrentVersion('Desconocida');
      }
    };

    initApp();
  }, []);

  /**
   * Maneja el proceso de descarga e instalación automática
   */
  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      
      const update = await check();
      
      if (update?.available) {
        // Descarga el .msi y valida la firma (.sig) automáticamente [cite: 6]
        await update.downloadAndInstall();
        
        // Reinicia la aplicación para aplicar la nueva versión
        await relaunch();
      }
    } catch (err) {
      console.error('Error durante la actualización:', err);
      setIsUpdating(false);
      alert('Hubo un error al instalar la actualización. Por favor, intenta de nuevo.');
    }
  };

  return (
    <div className="inicio-glass-page">
      <div className="inicio-glass-container">
        <img src="/logo-bomberos.png" alt="Logo BVVM" className="inicio-logo-grande" />
        <h1 className="inicio-nombre-cuartel">Bomberos Voluntarios Villa María</h1>

        <div className="inicio-tarjetas-container">
          {/* BOTÓN BIBLIOTECA */}
          <div className="inicio-tarjeta biblioteca" onClick={() => navigate('/biblioteca-login')}>
            <BookOpen size={56} color="#7cb5ff" strokeWidth={1.5} />
            <h2>Biblioteca Virtual</h2>
          </div>

          {/* BOTÓN CONTROL */}
          <div className="inicio-tarjeta control" onClick={() => navigate('/login')}>
            <Flame size={56} color="#e63946" strokeWidth={1.5} />
            <h2>Control BVVM</h2>
          </div>
        </div>
      </div>

      {/* VERSIÓN EN PANTALLA */}
      <div className="version-info">v{currentVersion}</div>

      {/* BANNER DE ACTUALIZACIÓN (Solo aparece si hay una versión nueva) */}
      {updateAvailable && (
        <div
          className={`update-banner ${isUpdating ? 'updating' : ''}`}
          onClick={!isUpdating ? handleUpdate : undefined}
          title={isUpdating ? "Instalando..." : "Click para actualizar ahora"}
        >
          {isUpdating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          <span>
            {isUpdating 
              ? " Descargando e Instalando..." 
              : " ¡Nueva versión disponible! Click para actualizar."}
          </span>
        </div>
      )}
    </div>
  );
};

export default Inicio;