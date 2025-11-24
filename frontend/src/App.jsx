import React, { useState, useRef } from "react";
import { createSession, getNextQuestion, submitAnswer, getFeedback } from "./api";
import VoiceRecorder from "./components/VoiceRecorder";
import ChatWindow from "./components/ChatWindow";
import FeedbackPanel from "./components/FeedbackPanel";

export default function App() {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [status, setStatus] = useState("idle");
  const [waiting, setWaiting] = useState(false);

  const roleRef = useRef("software_engineer");
  const levelRef = useRef("mid");
  const personaRef = useRef("efficient");

  // FIX: messagesRef always stores latest messages
  const messagesRef = useRef([]);
  function updateMessages(newMsgs) {
    messagesRef.current = newMsgs;
    setMessages(newMsgs);
  }

  function pushSystem(text) {
    updateMessages([...messagesRef.current, { role: "system", text }]);
  }
  function pushInterviewer(text) {
    updateMessages([...messagesRef.current, { role: "interviewer", text }]);
  }
  function pushCandidate(text) {
    updateMessages([...messagesRef.current, { role: "candidate", text }]);
  }

  // Safe wrapper
  async function safeApi(fn, ...args) {
    try {
      return await fn(...args);
    } catch (err) {
      console.error("API Error:", err);
      pushSystem("⚠️ Backend not responding.");
      return null;
    }
  }

  // Start session
  async function startSession() {
    if (status === "creating" || status === "in-progress") return;
    setStatus("creating");
    updateMessages([]);

    const resp = await safeApi(createSession, {
      role: roleRef.current,
      level: levelRef.current,
      persona: personaRef.current,
    });

    if (!resp || !resp.session) {
      setStatus("idle");
      return;
    }

    setSession(resp.session);
    pushSystem(`Session created for ${resp.session.role}. Hello — we'll start now.`);
    setStatus("in-progress");

    await fetchNextQuestion(resp.session.id);
  }

  // ========== FIXED: NO FOLLOW-UP QUESTIONS ===============
  async function fetchNextQuestion(sessionId) {
    const nxt = await safeApi(getNextQuestion, sessionId);
    if (!nxt) return;

    if (nxt.done) {
      setCurrentQuestion(null);
      pushSystem("No more questions available.");
      return;
    }

    const q = nxt.question;

    // Fix duplicate push
    const lastQ = [...messagesRef.current].reverse().find(m => m.role === "interviewer");
    if (lastQ && lastQ.text.trim() === q.text.trim()) {
      setCurrentQuestion(q);
      return;
    }

    setCurrentQuestion(q);
    pushInterviewer(q.text);
  }

  // Handle answer WITHOUT follow-up questions
  async function handleCandidateAnswer(text) {
    if (!session) return alert("Start a session first");
    if (waiting) return;

    pushCandidate(text);
    setWaiting(true);

    const resp = await safeApi(submitAnswer, session.id, text);

    // ❌ DO NOT ask follow-up even if backend says so
    // ❌ DO NOT print backend-generated follow-up
    // We only print something if interviewer sent plain text
    if (resp?.interviewer && !resp?.eval?.follow_up_needed) {
      pushInterviewer(resp.interviewer);
    }

    // Always get next question
    await fetchNextQuestion(session.id);

    setWaiting(false);
  }

  // End interview
  async function endAndGetFeedback() {
    if (!session) return alert("No active session");

    setStatus("finalizing");
    pushSystem("Thanks — generating your feedback now. Please wait...");

    const fb = await safeApi(getFeedback, session.id);

    if (!fb) {
      pushSystem("Failed to generate feedback.");
      setStatus("finished");
      return;
    }

    pushSystem(JSON.stringify(fb, null, 2));
    setStatus("finished");
  }

  return (
    <div className="container">
      <h1>Interview Practice Partner (MVP)</h1>

      <div className="controls">
        <label>
          Role:
          <select
            defaultValue="software_engineer"
            onChange={(e) => (roleRef.current = e.target.value)}
            disabled={status === "in-progress"}
          >
            <option value="software_engineer">Software Engineer</option>
            <option value="sales">Sales</option>
            <option value="retail">Retail</option>
          </select>
        </label>

        <label>
          Level:
          <select
            defaultValue="mid"
            onChange={(e) => (levelRef.current = e.target.value)}
            disabled={status === "in-progress"}
          >
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
          </select>
        </label>

        <label>
          Persona:
          <select
            defaultValue="efficient"
            onChange={(e) => (personaRef.current = e.target.value)}
            disabled={status === "in-progress"}
          >
            <option value="efficient">Efficient</option>
            <option value="confused">Confused</option>
            <option value="chatty">Chatty</option>
          </select>
        </label>

        <button onClick={startSession} disabled={status === "creating" || status === "in-progress"}>
          Start Session
        </button>

        <button onClick={endAndGetFeedback} disabled={!session || status === "finalizing"}>
          End & Get Feedback
        </button>
      </div>

      <div className="main">
        <ChatWindow messages={messages} />

        <div className="right">
          <VoiceRecorder
            onTranscript={handleCandidateAnswer}
            disabled={waiting || status !== "in-progress"}
          />
          <FeedbackPanel sessionId={session?.id} getFeedback={getFeedback} />
        </div>
      </div>
    </div>
  );
}
