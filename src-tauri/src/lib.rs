#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn abrir_en_navegador(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    if url.trim().is_empty() {
        return Err("La URL está vacía".into());
    }

    app_handle
        .shell()
        .open(&url, None)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init()) // 🔑 habilitamos el plugin shell
        .invoke_handler(tauri::generate_handler![greet, abrir_en_navegador])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
