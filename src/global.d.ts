export {}; // Mantener como módulo

declare global {
  interface Window {
    __TAURI_IPC__?: unknown; // para Tauri
    require?: any;            // para Electron
  }
}
