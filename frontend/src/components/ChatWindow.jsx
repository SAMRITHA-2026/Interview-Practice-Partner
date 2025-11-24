import React from "react";

/**
 * Format system messages safely.
 * - If message is an interview summary → display as plain text.
 * - If JSON → pretty print safely.
 * - Otherwise → fallback to plain text.
 */
function formatSystemMessage(raw) {
  if (!raw) return null;

  // Force plain text for interview summary
  if (typeof raw === "string" && raw.includes("INTERVIEW SUMMARY")) {
    return <pre style={{ whiteSpace: "pre-wrap" }}>{raw}</pre>;
  }

  // Try JSON parsing if it’s a string
  if (typeof raw === "string") {
    try {
      const data = JSON.parse(raw);

      // Pretty print JSON
      return (
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      );
    } catch {
      // fallback to raw text
      return <pre style={{ whiteSpace: "pre-wrap" }}>{raw}</pre>;
    }
  }

  // If raw is already object → pretty print
  if (typeof raw === "object") {
    return (
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(raw, null, 2)}
      </pre>
    );
  }

  // fallback
  return <pre style={{ whiteSpace: "pre-wrap" }}>{String(raw)}</pre>;
}

export default function ChatWindow({ messages = [] }) {
  return (
    <div className="chat-window">
      {messages.map((m, i) => {
        const isSystem = m.role === "system";

        return (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">
              <strong>
                {m.role === "interviewer"
                  ? "Interviewer"
                  : m.role === "candidate"
                  ? "You"
                  : "System"}
                :
              </strong>

              <div style={{ marginTop: 4 }}>
                {isSystem ? formatSystemMessage(m.text) : m.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
