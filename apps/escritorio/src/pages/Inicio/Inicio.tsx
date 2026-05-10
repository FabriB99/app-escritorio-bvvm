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
      // 1. Pequeño respiro para asegurar que el IPC de Tauri cargó
      await new Promise(r => setTimeout(r, 150));

      // 2. Obtener Versión (Independiente del updater)
      try {
        const v = await getVersion();
        if (v) {
          setCurrentVersion(v);
        } else {
          setCurrentVersion('0.2.8'); // Fallback manual
        }
      } catch (err) {
        console.error('Error al obtener versión:', err);
        // Si no detectamos rastro de Tauri, es que estamos en un navegador
        if (!(window as any).__TAURI_INTERNALS__) {
          setCurrentVersion('Web-Preview');
        } else {
          setCurrentVersion('Desconocida');
        }
      }

      // 3. Verificar Actualización (Si falla, no rompe el estado de la versión)
      try {
        const update = await check();
        if (update?.available) {
          console.log(`Nueva versión encontrada: ${update.version}`);
          setUpdateAvailable(true);
        }
      } catch (err) {
        // Aquí caerá tu error de "windows-x86_64" hasta que lo arregles en el JSON
        console.error('El updater falló (revisar formato de latest.json):', err);
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
        // Tauri v2 maneja la descarga y validación de firma (.sig)
        await update.downloadAndInstall();
        // Reinicio para aplicar cambios
        await relaunch();
      }
    } catch (err) {
      console.error('Error durante la actualización:', err);
      setIsUpdating(false);
      alert('Hubo un error al instalar la actualización. Verifica tu conexión.');
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

      {/* VERSIÓN EN PANTALLA (Ya no debería desaparecer) */}
      <div className="version-info">v{currentVersion}</div>

      {/* BANNER DE ACTUALIZACIÓN */}
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