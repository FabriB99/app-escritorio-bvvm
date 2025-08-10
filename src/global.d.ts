export {}; // Esto evita que el archivo sea tratado como script global, sino módulo

declare global {
  interface Window {
    __TAURI_IPC__?: unknown;
  }
}
