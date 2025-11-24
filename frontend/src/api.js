const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

// ------------------------
// Helper: parse JSON safely
// ------------------------
async function safeJson(res) {
  try {
    return await res.json();
  } catch (e) {
    console.warn("⚠️ Response is not JSON, switching to text mode.");
    return await res.text(); // <-- Return plain text instead of error
  }
}

// ------------------------
// Generic safe fetch wrapper
// ------------------------
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      console.error("❌ API Error:", res.status, res.statusText);
    }

    const contentType = res.headers.get("Content-Type") || "";

    // If backend sends text/plain → return text
    if (contentType.includes("text/plain")) {
      return await res.text();
    }

    // Else treat as JSON
    return await safeJson(res);

  } catch (err) {
    console.error("❌ Network/Fetch Error:", err);
    return { error: true, message: "Cannot connect to backend" };
  }
}

// ------------------------
// API Functions
// ------------------------
export async function createSession(payload) {
  return safeFetch(`${API_BASE}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getNextQuestion(sessionId) {
  return safeFetch(`${API_BASE}/session/${sessionId}/next`);
}

export async function submitAnswer(sessionId, text) {
  return safeFetch(`${API_BASE}/session/${sessionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

// -----------------------------
// FIXED: Returns TEXT feedback
// -----------------------------
export async function getFeedback(sessionId) {
  return safeFetch(`${API_BASE}/session/${sessionId}/feedback`);
}
