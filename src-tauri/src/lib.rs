/*
 * Flow - A high-performance teleprompter for Windows.
 * Copyright (C) 2026 Waled Alturkmani (LumoRez07)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

use std::{
    env, fs,
    path::{Path as FsPath, PathBuf},
    process::Command,
    sync::Mutex,
};

use serde::{Deserialize, Serialize};
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, LogicalSize, Manager, Size, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_prevent_default::Flags;

#[cfg(windows)]
use windows::core::{HSTRING, PCWSTR};

#[cfg(windows)]
use winreg::{
    enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE},
    RegKey,
};

#[cfg(windows)]
use windows::Win32::System::Power::{
    SetThreadExecutionState, ES_CONTINUOUS, ES_DISPLAY_REQUIRED, ES_SYSTEM_REQUIRED,
};

#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{
    MessageBoxW, SetWindowDisplayAffinity, MB_ICONERROR, MB_OK, WDA_EXCLUDEFROMCAPTURE, WDA_NONE,
};

const APP_STATE_FILE_NAME: &str = "state.json";
static APP_STATE_IO: Mutex<()> = Mutex::new(());
const SETTINGS_WINDOW_WIDTH: f64 = 620.0;
const SETTINGS_WINDOW_HEIGHT: f64 = 700.0;
const WEBVIEW2_CONSUMER_DOWNLOAD_URL: &str =
    "https://developer.microsoft.com/microsoft-edge/webview2/consumer/";
#[cfg(windows)]
const WEBVIEW2_RUNTIME_CLIENT_ID: &str = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PersistedAppDataPayload {
    state: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportedFilePayload {
    name: String,
    bytes: Vec<u8>,
}

#[derive(Debug, Clone)]
struct DesktopPreferences {
    hide_from_capture: bool,
    use_system_tray: bool,
    prevent_sleep: bool,
    clickthrough_shortcut_enabled: bool,
}

impl Default for DesktopPreferences {
    fn default() -> Self {
        Self {
            hide_from_capture: true,
            use_system_tray: true,
            prevent_sleep: false,
            clickthrough_shortcut_enabled: false,
        }
    }
}

#[derive(Debug, Default)]
struct DesktopState {
    preferences: Mutex<DesktopPreferences>,
    clickthrough_active: Mutex<bool>,
}

#[cfg(windows)]
fn apply_capture_protection(window: &tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    let affinity = if enabled { WDA_EXCLUDEFROMCAPTURE } else { WDA_NONE };
    unsafe { SetWindowDisplayAffinity(hwnd, affinity) }
        .map_err(|error| format!("{}: {error}", window.label()))
}

#[cfg(not(windows))]
fn apply_capture_protection(_window: &tauri::WebviewWindow, _enabled: bool) -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
fn set_sleep_prevention(enabled: bool) {
    let flags = if enabled {
        ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED
    } else {
        ES_CONTINUOUS
    };

    let _ = unsafe { SetThreadExecutionState(flags) };
}

#[cfg(not(windows))]
fn set_sleep_prevention(_enabled: bool) {}

fn load_dev_tray_icon() -> tauri::Result<Image<'static>> {
    #[cfg(debug_assertions)]
    {
        let icon_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("icons")
            .join("icon.ico");
        if icon_path.exists() {
            return Image::from_path(icon_path).map(|image| image.to_owned());
        }
    }

    Err(tauri::Error::AssetNotFound("dev tray icon missing".into()))
}

#[cfg(windows)]
fn show_startup_error_dialog(message: &str) {
    let text = HSTRING::from(message);
    let title = HSTRING::from("幕语启动失败");

    let _ = unsafe {
        MessageBoxW(
            None,
            PCWSTR(text.as_ptr()),
            PCWSTR(title.as_ptr()),
            MB_OK | MB_ICONERROR,
        )
    };
}

#[cfg(not(windows))]
fn show_startup_error_dialog(_message: &str) {}

#[cfg(windows)]
fn is_valid_webview2_version(version: &str) -> bool {
    let trimmed = version.trim();
    !trimmed.is_empty()
        && trimmed != "0.0.0.0"
        && trimmed.split('.').all(|segment| {
            !segment.is_empty() && segment.chars().all(|character| character.is_ascii_digit())
        })
}

#[cfg(windows)]
fn webview2_runtime_binary_exists(version: &str) -> bool {
    let relative_path = [
        "Microsoft",
        "EdgeWebView",
        "Application",
        version,
        "msedgewebview2.exe",
    ];
    let candidate_roots = [
        env::var_os("LOCALAPPDATA"),
        env::var_os("ProgramFiles(x86)"),
        env::var_os("ProgramFiles"),
    ];

    candidate_roots.into_iter().flatten().any(|root| {
        let mut path = PathBuf::from(root);
        for segment in relative_path {
            path.push(segment);
        }
        path.is_file()
    })
}

#[cfg(windows)]
fn find_webview2_runtime_version() -> Option<String> {
    let subkeys = [
        (
            HKEY_CURRENT_USER,
            format!(
                r"SOFTWARE\Microsoft\EdgeUpdate\Clients\{}",
                WEBVIEW2_RUNTIME_CLIENT_ID
            ),
        ),
        (
            HKEY_LOCAL_MACHINE,
            format!(
                r"SOFTWARE\Microsoft\EdgeUpdate\Clients\{}",
                WEBVIEW2_RUNTIME_CLIENT_ID
            ),
        ),
        (
            HKEY_LOCAL_MACHINE,
            format!(
                r"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{}",
                WEBVIEW2_RUNTIME_CLIENT_ID
            ),
        ),
    ];

    subkeys.iter().find_map(|(hive, path)| {
        let key = RegKey::predef(*hive).open_subkey(path).ok()?;
        let version: String = key.get_value("pv").ok()?;
        (is_valid_webview2_version(&version) && webview2_runtime_binary_exists(&version))
            .then_some(version)
    })
}

#[cfg(windows)]
fn open_webview2_download_page() {
    let _ = Command::new("explorer.exe")
        .arg(WEBVIEW2_CONSUMER_DOWNLOAD_URL)
        .spawn();
}

#[cfg(not(windows))]
fn open_webview2_download_page() {}

#[cfg(windows)]
fn ensure_webview2_runtime_available() -> bool {
    if find_webview2_runtime_version().is_some() {
        return true;
    }

    show_startup_error_dialog(
        "幕语需要 Microsoft Edge WebView2 运行时。\n\n单击确定打开微软官方下载页，安装后重新启动幕语。",
    );
    open_webview2_download_page();
    false
}

#[cfg(not(windows))]
fn ensure_webview2_runtime_available() -> bool {
    true
}

fn format_startup_error_message(error: &tauri::Error) -> String {
    format!(
        concat!(
            "MuYu could not start the desktop runtime.\n\n",
            "Common causes on Windows:\n",
            "- Microsoft Edge WebView2 Runtime is missing, outdated, or blocked by Group Policy.\n",
            "- Security software prevented the embedded webview from starting.\n",
            "- The user profile or app data location is unavailable.\n\n",
            "Install or repair the Evergreen WebView2 Runtime, then try again.\n\n",
            "Technical details:\n{}"
        ),
        error
    )
}

fn log_backend_error(context: &str, error: &dyn std::fmt::Display) {
    eprintln!("[flow-backend] {context}: {error}");
}

fn remove_existing_path(path: &FsPath) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|error| error.to_string())
    } else {
        fs::remove_file(path).map_err(|error| error.to_string())
    }
}

fn backup_path_for(target: &FsPath) -> PathBuf {
    let mut file_name = target
        .file_name()
        .map(|name| name.to_os_string())
        .unwrap_or_else(|| "flow-backup".into());
    file_name.push(".bak");
    target.with_file_name(file_name)
}

fn replace_path_from_temp(temp_path: &FsPath, final_path: &FsPath) -> Result<(), String> {
    let backup_path = backup_path_for(final_path);
    remove_existing_path(&backup_path)?;

    let had_original = final_path.exists();
    if had_original {
        fs::rename(final_path, &backup_path).map_err(|error| error.to_string())?;
    }

    match fs::rename(temp_path, final_path) {
        Ok(()) => {
            if had_original {
                remove_existing_path(&backup_path)?;
            }
            Ok(())
        }
        Err(error) => {
            if had_original && backup_path.exists() {
                let _ = fs::rename(&backup_path, final_path);
            }
            Err(error.to_string())
        }
    }
}

fn install_dpi_scale_guard(window: &WebviewWindow) {
    let guarded_window = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::ScaleFactorChanged { scale_factor, .. } = event {
            let Ok(current_physical_size) = guarded_window.inner_size() else {
                return;
            };

            let logical_size = current_physical_size.to_logical::<f64>(*scale_factor);
            let _ = guarded_window.set_size(Size::Logical(LogicalSize::new(
                logical_size.width,
                logical_size.height,
            )));
        }
    });
}

fn ensure_window(
    app: &tauri::AppHandle,
    label: &str,
    title: &str,
    path: &str,
    width: f64,
    height: f64,
) -> tauri::Result<()> {
    if app.get_webview_window(label).is_some() {
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(app, label, WebviewUrl::App(path.into()))
        .title(title)
        .inner_size(width, height)
        .visible(false)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .resizable(false)
        .skip_taskbar(true)
        .always_on_top(true)
        .center()
        .build()?;
    install_dpi_scale_guard(&window);

    let app_handle = app.clone();
    let win_label = label.to_string();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Focused(true) = event {
            promote_active_window(&app_handle, &win_label);
        }
    });

    Ok(())
}

fn ensure_aux_window(app: &tauri::AppHandle, kind: &str) -> Result<&'static str, String> {
    let (label, title, path, width, height) = match kind {
        "input" => ("input", "Flow Text", "input.html", 860.0, 860.0),
        "settings" => (
            "settings",
            "Flow Settings",
            "settings.html",
            SETTINGS_WINDOW_WIDTH,
            SETTINGS_WINDOW_HEIGHT,
        ),
        "about" => ("about", "About Flow", "about.html", 520.0, 420.0),
        _ => return Err("Unknown window type".into()),
    };

    ensure_window(app, label, title, path, width, height).map_err(|error| error.to_string())?;

    Ok(label)
}

fn set_main_always_on_top(app: &tauri::AppHandle, value: bool) {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_always_on_top(value);
    }
}

fn current_desktop_preferences(desktop: &tauri::State<DesktopState>) -> DesktopPreferences {
    desktop
        .preferences
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone()
}

fn apply_capture_protection_to_windows(app: &tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let mut failures = Vec::new();
    for window in app.webview_windows().into_values() {
        if let Err(error) = apply_capture_protection(&window, enabled) {
            if enabled {
                let _ = window.hide();
            }
            failures.push(error);
        }
    }
    if failures.is_empty() { Ok(()) } else { Err(failures.join("\n")) }
}

fn show_window_with_capture_preferences(app: &tauri::AppHandle, window: &WebviewWindow) -> Result<(), String> {
    let enabled = current_desktop_preferences(&app.state::<DesktopState>()).hide_from_capture;
    apply_capture_protection(window, enabled)?;
    window.show().map_err(|error| error.to_string())
}

fn ensure_tray_icon(app: &tauri::AppHandle) -> tauri::Result<()> {
    if app.tray_by_id("flow-tray").is_some() {
        return Ok(());
    }

    let show_item = MenuItemBuilder::with_id("show_main", "Show").build(app)?;
    let hide_item = MenuItemBuilder::with_id("hide_main", "Hide").build(app)?;
    let settings_item = MenuItemBuilder::with_id("open_settings", "Open Settings").build(app)?;
    let text_item = MenuItemBuilder::with_id("open_input", "Open Text Editor").build(app)?;
    let about_item = MenuItemBuilder::with_id("open_about", "About").build(app)?;
    let close_item = MenuItemBuilder::with_id("close_app", "Close").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[
            &show_item,
            &hide_item,
            &text_item,
            &settings_item,
            &about_item,
            &close_item,
        ])
        .build()?;

    let icon = load_dev_tray_icon().or_else(|_| {
        app.default_window_icon()
            .cloned()
            .ok_or_else(|| tauri::Error::AssetNotFound("default tray icon missing".into()))
    })?;

    TrayIconBuilder::with_id("flow-tray")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show_main" => {
                show_main_window(app);
            }
            "hide_main" => {
                hide_main_window_impl(app);
            }
            "open_input" => {
                show_window(app, "input");
            }
            "open_settings" => {
                show_window(app, "settings");
            }
            "open_about" => {
                show_window(app, "about");
            }
            "close_app" => exit_app(app),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn remove_tray_icon(app: &tauri::AppHandle) {
    let _ = app.remove_tray_by_id("flow-tray");
}

fn exit_app(app: &tauri::AppHandle) {
    remove_tray_icon(app);
    app.exit(0);
}

fn center_aux_window_on_active_monitor(window: &WebviewWindow, anchor: &WebviewWindow) {
    if let Ok(Some(monitor)) = anchor.current_monitor() {
        if let Ok(window_size) = window.outer_size() {
            let monitor_pos = monitor.position();
            let monitor_size = monitor.size();
            let x = monitor_pos.x + ((monitor_size.width as i32 - window_size.width as i32) / 2).max(0);
            let y = monitor_pos.y + ((monitor_size.height as i32 - window_size.height as i32) / 2).max(0);
            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
            return;
        }
    }
    let _ = window.center();
}

fn promote_active_window(app: &tauri::AppHandle, active_label: &str) {
    if active_label == "main" {
        let has_visible_aux = ["input", "settings", "about"]
            .iter()
            .any(|aux| {
                app.get_webview_window(aux)
                    .and_then(|w| w.is_visible().ok())
                    .unwrap_or(false)
            });
        if !has_visible_aux {
            set_main_always_on_top(app, true);
        } else {
            set_main_always_on_top(app, false);
        }
    } else {
        // Demote main teleprompter
        set_main_always_on_top(app, false);

        // Demote all other aux windows
        for other_aux in ["input", "settings", "about"] {
            if other_aux != active_label {
                if let Some(other_win) = app.get_webview_window(other_aux) {
                    let _ = other_win.set_always_on_top(false);
                }
            }
        }

        // Promote the active aux window to always_on_top
        if let Some(active_win) = app.get_webview_window(active_label) {
            let _ = active_win.set_always_on_top(true);
        }
    }
}

fn show_aux_window_impl(app: &tauri::AppHandle, label: &str) -> Result<(), String> {
    if let Some(desktop) = app.try_state::<DesktopState>() {
        let _ = set_clickthrough_impl(app, &desktop, false);
    }

    let window = app
        .get_webview_window(label)
        .ok_or_else(|| format!("Window '{label}' was not created"))?;

    if let Some(main) = app.get_webview_window("main") {
        center_aux_window_on_active_monitor(&window, &main);
    } else {
        let _ = window.center();
    }

    show_window_with_capture_preferences(app, &window)?;
    promote_active_window(app, label);
    window.set_focus().map_err(|error| error.to_string())?;

    Ok(())
}

fn hide_aux_window_impl(app: &tauri::AppHandle, label: &str) -> Result<(), String> {
    let window = app
        .get_webview_window(label)
        .ok_or_else(|| format!("Window '{label}' was not created"))?;

    let _ = window.set_always_on_top(false);
    window.hide().map_err(|error| error.to_string())?;

    let mut remaining_aux_window: Option<String> = None;
    for other_label in ["input", "settings", "about"] {
        if other_label != label {
            if let Some(other_win) = app.get_webview_window(other_label) {
                if let Ok(true) = other_win.is_visible() {
                    remaining_aux_window = Some(other_label.to_string());
                    break;
                }
            }
        }
    }

    if let Some(other_label) = remaining_aux_window {
        promote_active_window(app, &other_label);
        if let Some(other_win) = app.get_webview_window(&other_label) {
            let _ = other_win.set_focus();
        }
    } else {
        set_main_always_on_top(app, true);
    }

    Ok(())
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(desktop) = app.try_state::<DesktopState>() {
        let _ = set_clickthrough_impl(app, &desktop, false);
    }

    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = show_window_with_capture_preferences(app, &window) {
            log_backend_error("show protected main window", &error);
            return;
        }
        let _ = window.emit("flow-reveal-main-window", ());
        promote_active_window(app, "main");
        let _ = window.set_focus();
    }
}

fn hide_main_window_impl(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

fn set_tray_enabled_impl(app: &tauri::AppHandle, enabled: bool) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        main.set_skip_taskbar(enabled)
            .map_err(|error| error.to_string())?;
    }

    if enabled {
        ensure_tray_icon(app).map_err(|error| error.to_string())?;
    } else {
        remove_tray_icon(app);
    }

    Ok(())
}

fn set_clickthrough_impl(
    app: &tauri::AppHandle,
    desktop: &tauri::State<DesktopState>,
    enabled: bool,
) -> Result<bool, String> {
    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window was not found".to_string())?;

    main.set_ignore_cursor_events(enabled)
        .map_err(|error| error.to_string())?;

    let mut clickthrough_active = desktop
        .clickthrough_active
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    *clickthrough_active = enabled;

    let _ = app.emit("flow-clickthrough-changed", enabled);

    Ok(enabled)
}

fn toggle_clickthrough_impl(
    app: &tauri::AppHandle,
    desktop: &tauri::State<DesktopState>,
) -> Result<bool, String> {
    let current = *desktop
        .clickthrough_active
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    set_clickthrough_impl(app, desktop, !current)
}

#[tauri::command]
fn close_app(app: tauri::AppHandle) {
    exit_app(&app);
}

#[tauri::command]
fn hide_main_window(app: tauri::AppHandle) {
    hide_main_window_impl(&app);
}

#[tauri::command]
fn show_main_window_command(app: tauri::AppHandle) {
    show_main_window(&app);
}

#[tauri::command]
fn set_capture_protection(
    app: tauri::AppHandle,
    desktop: tauri::State<DesktopState>,
    enabled: bool,
) -> Result<(), String> {
    {
        let mut preferences = desktop
            .preferences
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        preferences.hide_from_capture = enabled;
    }

    apply_capture_protection_to_windows(&app, enabled)
}

#[tauri::command]
fn set_system_tray_enabled(
    app: tauri::AppHandle,
    desktop: tauri::State<DesktopState>,
    enabled: bool,
) -> Result<(), String> {
    {
        let mut preferences = desktop
            .preferences
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        preferences.use_system_tray = enabled;
    }

    set_tray_enabled_impl(&app, enabled)
}

#[tauri::command]
fn set_prevent_sleep(desktop: tauri::State<DesktopState>, enabled: bool) {
    {
        let mut preferences = desktop
            .preferences
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        preferences.prevent_sleep = enabled;
    }

    set_sleep_prevention(enabled);
}

#[tauri::command]
fn set_clickthrough_shortcut_enabled(desktop: tauri::State<DesktopState>, enabled: bool) {
    let mut preferences = desktop
        .preferences
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    preferences.clickthrough_shortcut_enabled = enabled;
}

#[tauri::command]
fn set_main_clickthrough(
    app: tauri::AppHandle,
    desktop: tauri::State<DesktopState>,
    enabled: bool,
) -> Result<bool, String> {
    set_clickthrough_impl(&app, &desktop, enabled)
}

#[tauri::command]
fn toggle_main_clickthrough(
    app: tauri::AppHandle,
    desktop: tauri::State<DesktopState>,
) -> Result<bool, String> {
    toggle_clickthrough_impl(&app, &desktop)
}

#[tauri::command]
fn open_aux_window(
    app: tauri::AppHandle,
    desktop: tauri::State<DesktopState>,
    kind: String,
) -> Result<(), String> {
    let label = ensure_aux_window(&app, &kind)?;

    let _ = set_clickthrough_impl(&app, &desktop, false);
    show_aux_window_impl(&app, label)
}

#[tauri::command]
fn hide_aux_window(app: tauri::AppHandle, kind: String) -> Result<(), String> {
    let label = ensure_aux_window(&app, &kind)?;
    hide_aux_window_impl(&app, label)
}

#[tauri::command]
fn get_distribution_channel() -> String {
    option_env!("FLOW_DISTRIBUTION_CHANNEL")
        .unwrap_or("public")
        .to_string()
}

#[tauri::command]
fn read_import_file(path: String) -> Result<ImportedFilePayload, String> {
    let path = PathBuf::from(path);
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .map(str::to_owned)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Could not determine dropped file name".to_string())?;
    let bytes = fs::read(&path).map_err(|error| error.to_string())?;

    Ok(ImportedFilePayload { name, bytes })
}

fn setup_aux_windows(app: &tauri::AppHandle) -> tauri::Result<()> {
    ensure_window(app, "input", "Flow Text", "input.html", 860.0, 860.0)?;
    ensure_window(
        app,
        "settings",
        "Flow Settings",
        "settings.html",
        SETTINGS_WINDOW_WIDTH,
        SETTINGS_WINDOW_HEIGHT,
    )?;
    ensure_window(app, "about", "About Flow", "about.html", 520.0, 420.0)?;

    Ok(())
}

fn show_window(app: &tauri::AppHandle, label: &str) {
    let _ = ensure_aux_window(app, label);
    let _ = show_aux_window_impl(app, label);
}

fn app_storage_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn app_storage_file_path(app: &tauri::AppHandle, file_name: &str) -> Result<PathBuf, String> {
    Ok(app_storage_dir(app)?.join(file_name))
}

fn read_json_storage<T>(app: &tauri::AppHandle, file_name: &str) -> Result<Option<T>, String>
where
    T: for<'de> Deserialize<'de>,
{
    let path = app_storage_file_path(app, file_name)?;
    if !path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    let parsed = serde_json::from_str::<T>(&raw).map_err(|error| error.to_string())?;
    Ok(Some(parsed))
}

fn write_json_storage<T>(app: &tauri::AppHandle, file_name: &str, value: &T) -> Result<(), String>
where
    T: Serialize,
{
    let path = app_storage_file_path(app, file_name)?;
    let temp_path = path.with_extension("tmp");
    let bytes = serde_json::to_vec_pretty(value).map_err(|error| error.to_string())?;
    fs::write(&temp_path, bytes).map_err(|error| error.to_string())?;
    replace_path_from_temp(&temp_path, &path)?;
    Ok(())
}

#[tauri::command]
fn load_persisted_app_data(app: tauri::AppHandle) -> Result<PersistedAppDataPayload, String> {
    let _guard = APP_STATE_IO.lock().map_err(|error| error.to_string())?;
    let mut state = read_json_storage::<serde_json::Value>(&app, APP_STATE_FILE_NAME)?
        .unwrap_or_else(|| serde_json::json!({}));

    if strip_legacy_groq_settings(&mut state) {
        if let Err(error) = write_json_storage(&app, APP_STATE_FILE_NAME, &state) {
            log_backend_error("remove legacy script generation settings", &error);
        }
    }

    Ok(PersistedAppDataPayload { state })
}

fn strip_legacy_groq_settings(state: &mut serde_json::Value) -> bool {
    let Some(fields) = state.as_object_mut() else { return false };
    let previous_len = fields.len();
    for key in ["groqKey", "groqPrompt", "groq"] {
        fields.remove(key);
    }
    fields.len() != previous_len
}

fn saved_capture_protection(app: &tauri::AppHandle) -> bool {
    let _guard = APP_STATE_IO.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    let saved = read_json_storage::<serde_json::Value>(app, APP_STATE_FILE_NAME).ok().flatten();
    let desktop = saved.as_ref().and_then(|state| state.get("desktop"));
    !desktop.is_some_and(|value| {
        value.get("captureProtectionConfigured").and_then(serde_json::Value::as_bool) == Some(true)
            && value.get("hideFromCapture").and_then(serde_json::Value::as_bool) == Some(false)
    })
}

#[tauri::command]
fn save_persisted_app_state(app: tauri::AppHandle, mut state: serde_json::Value) -> Result<(), String> {
    let _guard = APP_STATE_IO.lock().map_err(|error| error.to_string())?;
    strip_legacy_groq_settings(&mut state);
    write_json_storage(&app, APP_STATE_FILE_NAME, &state)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if !ensure_webview2_runtime_available() {
        return;
    }


    let prevent = tauri_plugin_prevent_default::Builder::new()
        .with_flags(Flags::CONTEXT_MENU | Flags::PRINT | Flags::DOWNLOADS | Flags::DEV_TOOLS)
        .build();
    let desktop_state = DesktopState::default();

    let result = tauri::Builder::default()
        .manage(desktop_state)
        .plugin(prevent)
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_aux_window,
            hide_aux_window,
            close_app,
            hide_main_window,
            show_main_window_command,
            set_capture_protection,
            set_system_tray_enabled,
            set_prevent_sleep,
            set_clickthrough_shortcut_enabled,
            set_main_clickthrough,
            toggle_main_clickthrough,
            load_persisted_app_data,
            save_persisted_app_state,
            get_distribution_channel,
            read_import_file
        ])
        .setup(move |app| {
            let desktop = app.state::<DesktopState>();
            desktop.preferences.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).hide_from_capture =
                saved_capture_protection(app.handle());
            setup_aux_windows(app.handle())?;

            if let Some(main) = app.handle().get_webview_window("main") {
                let app_handle = app.handle().clone();
                main.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(true) = event {
                        promote_active_window(&app_handle, "main");
                    }
                });
            }

            if let Err(error) = app.handle().global_shortcut().on_shortcut(
                "Ctrl+Shift+X",
                |app, _shortcut, event| {
                    if event.state != ShortcutState::Pressed {
                        return;
                    }

                    let Some(desktop) = app.try_state::<DesktopState>() else {
                        return;
                    };

                    let shortcut_enabled = desktop
                        .preferences
                        .lock()
                        .unwrap_or_else(|poisoned| poisoned.into_inner())
                        .clickthrough_shortcut_enabled;

                    if !shortcut_enabled {
                        return;
                    }

                    let _ = toggle_clickthrough_impl(app, &desktop);
                },
            ) {
                log_backend_error("global shortcut registration", &error);
            }

            if let Some(desktop) = app.try_state::<DesktopState>() {
                let preferences = current_desktop_preferences(&desktop);
                set_tray_enabled_impl(app.handle(), preferences.use_system_tray)?;
                apply_capture_protection_to_windows(app.handle(), preferences.hide_from_capture)
                    .map_err(std::io::Error::other)?;
                set_sleep_prevention(preferences.prevent_sleep);
            }

            if let Some(main_window) = app.get_webview_window("main") {
                install_dpi_scale_guard(&main_window);
            }

            if let Some(splash) = app.get_webview_window("splashscreen") {
                show_window_with_capture_preferences(app.handle(), &splash).map_err(std::io::Error::other)?;
            }

            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(error) = result {
        log_backend_error("tauri runtime", &error);
        show_startup_error_dialog(&format_startup_error_message(&error));
    }
}
