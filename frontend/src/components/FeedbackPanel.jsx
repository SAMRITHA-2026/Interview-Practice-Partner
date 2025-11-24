import React, { useState } from "react";
import { getFeedback } from "../api";

export default function FeedbackPanel({ sessionId }) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchFeedback() {
    if (!sessionId) return alert("No session running");

    setLoading(true);

    try {
      const fb = await getFeedback(sessionId);

      // Always convert to string
      if (typeof fb === "string") {
        setFeedback(fb.trim());
      } else if (typeof fb === "object") {
        setFeedback(JSON.stringify(fb, null, 2));
      } else {
        setFeedback("⚠️ Unexpected feedback format.");
      }

    } catch (err) {
      console.error("Feedback error:", err);
      setFeedback("⚠️ Unable to fetch feedback.");
    }

    setLoading(false);
  }

  return (
    <div className="feedback-panel">
      <h3>Interview Feedback</h3>

      <button onClick={fetchFeedback} disabled={loading}>
        {loading ? "Loading..." : "Get Feedback"}
      </button>

      {/* Display clean readable feedback */}
      {feedback && (
        <div
          style={{
            background: "#56a0e7ff",
            padding: "14px",
            marginTop: "12px",
            borderRadius: "8px",
            fontSize: "0.95rem",
            lineHeight: "1.5",
            whiteSpace: "pre-wrap",
            border: "1px solid #74d5feff",
          }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}
