use dotenvy::dotenv;
use serde::{Deserialize, Serialize};
use std::{env, fs};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// ---------- Shared Types ----------

#[derive(Serialize, Deserialize, Clone)]
pub struct Style {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub favorite: Option<bool>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub example_output: Option<String>,
    #[serde(default, rename = "presentationMode")]
    pub presentation_mode: Option<String>,
    #[serde(default, rename = "targetAudience")]
    pub target_audience: Option<String>,
    #[serde(default, rename = "toneNotes")]
    pub tone_notes: Option<String>,
    #[serde(default, rename = "pacingNotes")]
    pub pacing_notes: Option<String>,
    #[serde(default, rename = "signaturePhrases")]
    pub signature_phrases: Option<Vec<String>>,
    #[serde(default, rename = "avoidPhrases")]
    pub avoid_phrases: Option<Vec<String>>,
    #[serde(default, rename = "referenceTranscript")]
    pub reference_transcript: Option<String>,
    #[serde(default)]
    pub dos: Option<Vec<String>>,
    #[serde(default)]
    pub donts: Option<Vec<String>>,
    #[serde(default)]
    pub strictness: Option<i32>,
    #[serde(default, rename = "seriesPreset")]
    pub series_preset: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub last_opened_at: Option<String>,
    #[serde(default)]
    pub script_count: Option<i32>,
    #[serde(default)]
    pub default_style_id: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct VideoClip {
    pub id: String,
    pub length: i32,
    pub description: String,
    #[serde(default, rename = "parentId")]
    pub parent_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ScriptVersion {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    #[serde(default)]
    pub reason: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Script {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub content: Option<String>,
    pub style_id: Option<String>,
    pub location: Option<String>,
    pub premise: Option<String>,
    pub criteria: Option<String>,
    pub length_minutes: Option<i32>,
    pub video_clips: Option<Vec<VideoClip>>,
    pub created_at: String,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub last_opened_at: Option<String>,
    #[serde(default)]
    pub packaging: Option<serde_json::Value>,
    #[serde(default)]
    pub verification: Option<serde_json::Value>,
    #[serde(default)]
    pub scorecard: Option<serde_json::Value>,
    #[serde(default)]
    pub editor_preferences: Option<serde_json::Value>,
    #[serde(default)]
    pub versions: Option<Vec<ScriptVersion>>,
}

#[derive(Serialize, Deserialize, Default)]
struct DataFile {
    projects: Vec<Project>,
    styles: Vec<Style>,
    scripts: Vec<Script>,
}

#[derive(Deserialize)]
struct UpdateStylePayload {
    id: String,
    name: String,
    description: String,
    #[serde(default)]
    category: Option<String>,
    #[serde(default)]
    favorite: Option<bool>,
    #[serde(default)]
    example_output: Option<String>,
    #[serde(rename = "presentationMode")]
    presentation_mode: Option<String>,
    #[serde(default, rename = "targetAudience")]
    target_audience: Option<String>,
    #[serde(default, rename = "toneNotes")]
    tone_notes: Option<String>,
    #[serde(default, rename = "pacingNotes")]
    pacing_notes: Option<String>,
    #[serde(default, rename = "signaturePhrases")]
    signature_phrases: Option<Vec<String>>,
    #[serde(default, rename = "avoidPhrases")]
    avoid_phrases: Option<Vec<String>>,
    #[serde(default, rename = "referenceTranscript")]
    reference_transcript: Option<String>,
    #[serde(default)]
    dos: Option<Vec<String>>,
    #[serde(default)]
    donts: Option<Vec<String>>,
    #[serde(default)]
    strictness: Option<i32>,
    #[serde(default, rename = "seriesPreset")]
    series_preset: Option<String>,
}

#[derive(Deserialize)]
struct UpdateProjectPayload {
    id: String,
    name: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    default_style_id: Option<String>,
}

#[derive(Serialize)]
struct GeminiContentResponse {
    text: String,
    #[serde(rename = "groundingMetadata")]
    grounding_metadata: Option<serde_json::Value>,
}

// ---------- Data Helpers ----------

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create app data dir: {e}"))?;
    Ok(dir)
}

fn data_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("data.json"))
}

fn legacy_data_file_path(app: &AppHandle) -> Result<Option<PathBuf>, String> {
    let current_dir = data_dir(app)?;
    let Some(parent_dir) = current_dir.parent() else {
        return Ok(None);
    };

    let legacy_path = parent_dir.join("com.tauri.dev").join("data.json");
    if legacy_path.exists() {
        Ok(Some(legacy_path))
    } else {
        Ok(None)
    }
}

fn ensure_migrated_data(app: &AppHandle) -> Result<PathBuf, String> {
    let path = data_file_path(app)?;
    if path.exists() {
        return Ok(path);
    }

    if let Some(legacy_path) = legacy_data_file_path(app)? {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create migrated data dir: {e}"))?;
        }
        fs::copy(&legacy_path, &path)
            .map_err(|e| format!("Failed to migrate legacy data.json: {e}"))?;
    }

    Ok(path)
}

fn load_data(app: &AppHandle) -> Result<DataFile, String> {
    let path = ensure_migrated_data(app)?;
    if !path.exists() {
        return Ok(DataFile::default());
    }

    let contents = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read data.json: {e}"))?;

    if contents.trim().is_empty() {
        return Ok(DataFile::default());
    }

    serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse data.json: {e}"))
}

fn save_data(app: &AppHandle, data: &DataFile) -> Result<(), String> {
    let path = data_file_path(app)?;
    let contents = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize data.json: {e}"))?;
    fs::write(&path, contents)
        .map_err(|e| format!("Failed to write data.json: {e}"))
}

fn json_to_optional_string(value: serde_json::Value) -> Result<Option<String>, String> {
    if value.is_null() {
        return Ok(None);
    }

    value
        .as_str()
        .map(|text| Some(text.to_string()))
        .ok_or_else(|| "Expected string or null".to_string())
}

fn json_to_optional_video_clips(value: serde_json::Value) -> Result<Option<Vec<VideoClip>>, String> {
    if value.is_null() {
        return Ok(None);
    }

    serde_json::from_value(value)
        .map(Some)
        .map_err(|e| format!("Invalid video clips payload: {e}"))
}

// ---------- Project Commands ----------

#[tauri::command]
async fn get_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    let data = load_data(&app)?;
    Ok(data.projects)
}

#[tauri::command]
async fn create_project(app: AppHandle, project: Project) -> Result<Project, String> {
    let mut data = load_data(&app)?;
    // replace any existing project with same id
    data.projects.retain(|p| p.id != project.id);
    data.projects.push(project.clone());
    save_data(&app, &data)?;
    Ok(project)
}

#[tauri::command]
async fn delete_project(app: AppHandle, project_id: String) -> Result<(), String> {
    let mut data = load_data(&app)?;
    data.scripts.retain(|s| s.project_id != project_id);
    data.projects.retain(|p| p.id != project_id);
    save_data(&app, &data)?;
    Ok(())
}

// ---------- Script Commands ----------

#[tauri::command]
async fn get_scripts(app: AppHandle, project_id: String) -> Result<Vec<Script>, String> {
    let data = load_data(&app)?;
    Ok(data
        .scripts
        .into_iter()
        .filter(|s| s.project_id == project_id)
        .collect())
}

#[tauri::command]
async fn create_script(app: AppHandle, script: Script) -> Result<Script, String> {
    let mut data = load_data(&app)?;
    data.scripts.retain(|s| s.id != script.id);
    let now = chrono::Utc::now().to_rfc3339();
    let mut next_script = script.clone();
    next_script.updated_at = Some(now.clone());
    next_script.last_opened_at = Some(now);
    next_script.status = next_script.status.or_else(|| Some("draft".to_string()));
    data.scripts.push(next_script.clone());
    save_data(&app, &data)?;
    Ok(next_script)
}

#[tauri::command]
async fn update_project(app: AppHandle, payload: UpdateProjectPayload) -> Result<(), String> {
    let mut data = load_data(&app)?;
    if let Some(project) = data.projects.iter_mut().find(|p| p.id == payload.id) {
        project.name = payload.name;
        project.description = payload.description;
        project.default_style_id = payload.default_style_id;
        project.last_opened_at = Some(chrono::Utc::now().to_rfc3339());
    }
    save_data(&app, &data)?;
    Ok(())
}

#[tauri::command]
async fn update_script(
    app: AppHandle,
    id: String,
    content: Option<String>,
    title: Option<String>,
    style_id: Option<serde_json::Value>,
    location: Option<serde_json::Value>,
    video_clips: Option<serde_json::Value>,
    status: Option<serde_json::Value>,
    packaging: Option<serde_json::Value>,
    verification: Option<serde_json::Value>,
    scorecard: Option<serde_json::Value>,
    editor_preferences: Option<serde_json::Value>,
) -> Result<Script, String> {
    let mut data = load_data(&app)?;

    if let Some(script) = data.scripts.iter_mut().find(|s| s.id == id) {
        let previous_title = script.title.clone();
        let previous_content = script.content.clone().unwrap_or_default();
        let next_title = title.clone().unwrap_or_else(|| script.title.clone());
        let next_content = content.clone().unwrap_or_else(|| script.content.clone().unwrap_or_default());

        if previous_title != next_title || previous_content != next_content {
            let versions = script.versions.get_or_insert_with(Vec::new);
            versions.insert(
                0,
                ScriptVersion {
                    id: format!("version-{}", chrono::Utc::now().timestamp_millis()),
                    title: previous_title,
                    content: previous_content,
                    created_at: chrono::Utc::now().to_rfc3339(),
                    reason: Some("Manual save checkpoint".to_string()),
                },
            );
            if versions.len() > 20 {
                versions.truncate(20);
            }
        }

        if let Some(c) = content {
            script.content = Some(c);
        }
        if let Some(t) = title {
            script.title = t;
        }
        if let Some(next_style_id) = style_id {
            script.style_id = json_to_optional_string(next_style_id)?;
        }
        if let Some(next_location) = location {
            script.location = json_to_optional_string(next_location)?;
        }
        if let Some(next_clips) = video_clips {
            script.video_clips = json_to_optional_video_clips(next_clips)?;
        }
        if let Some(next_status) = status {
            script.status = json_to_optional_string(next_status)?;
        }
        if let Some(next_packaging) = packaging {
            script.packaging = if next_packaging.is_null() { None } else { Some(next_packaging) };
        }
        if let Some(next_verification) = verification {
            script.verification = if next_verification.is_null() { None } else { Some(next_verification) };
        }
        if let Some(next_scorecard) = scorecard {
            script.scorecard = if next_scorecard.is_null() { None } else { Some(next_scorecard) };
        }
        if let Some(next_editor_preferences) = editor_preferences {
            script.editor_preferences = if next_editor_preferences.is_null() { None } else { Some(next_editor_preferences) };
        }
        let now = chrono::Utc::now().to_rfc3339();
        script.updated_at = Some(now.clone());
        script.last_opened_at = Some(now);

        let saved_script = script.clone();
        save_data(&app, &data)?;
        return Ok(saved_script);
    }

    Err("Script not found".to_string())
}

#[tauri::command]
async fn update_script_artifacts(
    app: AppHandle,
    id: String,
    status: Option<serde_json::Value>,
    packaging: Option<serde_json::Value>,
    verification: Option<serde_json::Value>,
    scorecard: Option<serde_json::Value>,
    editor_preferences: Option<serde_json::Value>,
) -> Result<Script, String> {
    let mut data = load_data(&app)?;

    if let Some(script) = data.scripts.iter_mut().find(|s| s.id == id) {
        if let Some(next_status) = status {
            script.status = json_to_optional_string(next_status)?;
        }
        if let Some(next_packaging) = packaging {
            script.packaging = if next_packaging.is_null() { None } else { Some(next_packaging) };
        }
        if let Some(next_verification) = verification {
            script.verification = if next_verification.is_null() { None } else { Some(next_verification) };
        }
        if let Some(next_scorecard) = scorecard {
            script.scorecard = if next_scorecard.is_null() { None } else { Some(next_scorecard) };
        }
        if let Some(next_editor_preferences) = editor_preferences {
            script.editor_preferences = if next_editor_preferences.is_null() { None } else { Some(next_editor_preferences) };
        }
        script.updated_at = Some(chrono::Utc::now().to_rfc3339());

        let saved_script = script.clone();
        save_data(&app, &data)?;
        return Ok(saved_script);
    }

    Err("Script not found".to_string())
}

#[tauri::command]
async fn delete_script(app: AppHandle, id: String) -> Result<(), String> {
    let mut data = load_data(&app)?;
    data.scripts.retain(|s| s.id != id);
    save_data(&app, &data)?;
    Ok(())
}

// ---------- Style Commands ----------

#[tauri::command]
async fn get_styles(app: AppHandle) -> Result<Vec<Style>, String> {
    let data = load_data(&app)?;
    Ok(data.styles)
}

#[tauri::command]
async fn create_style(app: AppHandle, style: Style) -> Result<Style, String> {
    let mut data = load_data(&app)?;
    data.styles.retain(|s| s.id != style.id);
    let now = chrono::Utc::now().to_rfc3339();
    let mut next_style = style.clone();
    next_style.created_at = next_style.created_at.or_else(|| Some(now.clone()));
    next_style.updated_at = Some(now);
    next_style.favorite = next_style.favorite.or_else(|| Some(false));
    data.styles.push(next_style.clone());
    save_data(&app, &data)?;
    Ok(next_style)
}

#[tauri::command]
async fn update_style(app: AppHandle, payload: UpdateStylePayload) -> Result<(), String> {
    let UpdateStylePayload {
        id,
        name,
        description,
        category,
        favorite,
        example_output,
        presentation_mode,
        target_audience,
        tone_notes,
        pacing_notes,
        signature_phrases,
        avoid_phrases,
        reference_transcript,
        dos,
        donts,
        strictness,
        series_preset,
    } = payload;
    let mut data = load_data(&app)?;

    if let Some(style) = data.styles.iter_mut().find(|s| s.id == id) {
        style.name = name;
        style.description = description;
        style.category = category;
        style.favorite = favorite;
        style.example_output = example_output;
        style.updated_at = Some(chrono::Utc::now().to_rfc3339());
        if let Some(pm) = presentation_mode {
            style.presentation_mode = Some(pm);
        }
        style.target_audience = target_audience;
        style.tone_notes = tone_notes;
        style.pacing_notes = pacing_notes;
        style.signature_phrases = signature_phrases;
        style.avoid_phrases = avoid_phrases;
        style.reference_transcript = reference_transcript;
        style.dos = dos;
        style.donts = donts;
        style.strictness = strictness;
        style.series_preset = series_preset;
    }

    save_data(&app, &data)?;
    Ok(())
}

#[tauri::command]
async fn delete_style(app: AppHandle, id: String) -> Result<(), String> {
    let mut data = load_data(&app)?;
    data.styles.retain(|s| s.id != id);
    save_data(&app, &data)?;
    Ok(())
}

// ---------- Gemini Command ----------

#[tauri::command]
async fn ask_gemini(prompt: String) -> Result<String, String> {
    dotenv().ok();
    let api_key =
        env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY not found in environment".to_string())?;

    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key={}",
        api_key
    );

    let payload = serde_json::json!({
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    });

    let res = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to call Gemini API: {e}"))?;

    let status = res.status();
    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse Gemini response: {e}"))?;

    if !status.is_success() {
        return Err(format!("Gemini API error ({status}): {json}"));
    }

    let text = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("No response from AI")
        .to_string();

    Ok(text)
}

#[tauri::command]
async fn generate_gemini_content(
    prompt: String,
    response_mime_type: Option<String>,
    use_google_search: Option<bool>,
    system_instruction: Option<String>,
) -> Result<GeminiContentResponse, String> {
    dotenv().ok();
    let api_key =
        env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY not found in environment".to_string())?;

    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key={}",
        api_key
    );

    let mut payload = serde_json::json!({
        "contents": [{
            "parts": [{ "text": prompt }]
        }]
    });

    if let Some(mime_type) = response_mime_type {
        payload["generationConfig"] = serde_json::json!({
            "responseMimeType": mime_type
        });
    }

    if use_google_search.unwrap_or(false) {
        payload["tools"] = serde_json::json!([{ "googleSearch": {} }]);
    }

    if let Some(instruction) = system_instruction {
        payload["systemInstruction"] = serde_json::json!({
            "parts": [{ "text": instruction }]
        });
    }

    let response = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Gemini request failed with {}: {}", status, body));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let candidate = json
        .get("candidates")
        .and_then(|candidates| candidates.as_array())
        .and_then(|candidates| candidates.first())
        .cloned()
        .unwrap_or(serde_json::Value::Null);

    let text = candidate
        .get("content")
        .and_then(|content| content.get("parts"))
        .and_then(|parts| parts.as_array())
        .map(|parts| {
            parts
                .iter()
                .filter_map(|part| part.get("text").and_then(|text| text.as_str()))
                .collect::<Vec<_>>()
                .join("")
        })
        .unwrap_or_default();
    let grounding_metadata = candidate.get("groundingMetadata").cloned();

    Ok(GeminiContentResponse {
        text,
        grounding_metadata,
    })
}

// ---------- App Entry ----------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_projects,
            create_project,
            update_project,
            delete_project,
            get_scripts,
            create_script,
            update_script,
            update_script_artifacts,
            delete_script,
            get_styles,
            create_style,
            update_style,
            delete_style,
            ask_gemini,
            generate_gemini_content
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
