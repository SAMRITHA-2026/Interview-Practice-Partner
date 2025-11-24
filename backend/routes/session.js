const express = require('express');
const router = express.Router();
const { generateInterviewerReply, generateNextQuestion } = require('../services/llmService');
const { v4: uuidv4 } = require('uuid');

const sessions = {};


// ---------------- CREATE SESSION ----------------
router.post('/', (req, res) => {
  const { role = 'software_engineer', level = 'mid', persona = 'efficient' } = req.body;

  const id = uuidv4();
  const session = {
    id,
    role,
    level,
    persona,
    questionsAsked: [],
    waitingForAnswer: false,
    finished: false
  };

  sessions[id] = session;
  return res.json({ session });
});


// ---------------- GET NEXT QUESTION ----------------
router.get('/:id/next', async (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'session not found' });

  if (session.waitingForAnswer) {
    return res.json({ wait: true, done: false });
  }

  const history = session.questionsAsked.map(q => ({
    question: q.text,
    answer: q.candidateAnswer
  }));

  const nextQ = await generateNextQuestion({
    role: session.role,
    level: session.level,
    conversationHistory: history
  });

  const qObj = {
    id: "dyn-" + Date.now(),
    text: nextQ,
    type: "dynamic",
    candidateAnswer: null,
    eval: null
  };

  session.questionsAsked.push(qObj);
  session.waitingForAnswer = true;

  return res.json({ question: qObj });
});


// ---------------- SUBMIT ANSWER ----------------
router.post('/:id/answer', async (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'session not found' });

  const { text } = req.body;

  const qobj = session.questionsAsked[session.questionsAsked.length - 1];
  if (!qobj) return res.status(400).json({ error: 'no active question' });

  session.waitingForAnswer = false;

  const history = session.questionsAsked.map(
    q => `${q.text} => ${q.candidateAnswer || ''}`
  );

  const llmResp = await generateInterviewerReply({
    role: session.role,
    level: session.level,
    question: qobj.text,
    candidateAnswer: text,
    conversationHistory: history
  });

  qobj.candidateAnswer = text;

  // Ensure evaluation is saved
  qobj.eval = llmResp.eval ?? {
    communication: 0,
    technical: 0,
    structure: 0,
    confidence: 0,
    notes: "No evaluation available."
  };

  qobj.interviewerText = llmResp.interviewer;

  return res.json({
    interviewer: llmResp.interviewer,
    eval: qobj.eval
  });
});


// ---------------- CLEAN FEEDBACK OUTPUT (NOT JSON) ----------------
router.get('/:id/feedback', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).send("Session not found");

  const results = session.questionsAsked.map(q => ({
    question: q.text,
    answer: q.candidateAnswer || "No answer provided.",
    eval: q.eval || {
      communication: 0,
      technical: 0,
      structure: 0,
      confidence: 0,
      notes: "No evaluation available."
    }
  }));

  const avg = (arr) =>
    arr.length ? (arr.reduce((a, b) => a + (b || 0), 0) / arr.length).toFixed(1) : "0.0";

  const agg = {
    communication: avg(results.map(r => r.eval.communication)),
    technical: avg(results.map(r => r.eval.technical)),
    structure: avg(results.map(r => r.eval.structure)),
    confidence: avg(results.map(r => r.eval.confidence))
  };

  let summary = `INTERVIEW SUMMARY\n-------------------------\n\n`;

  results.forEach((r, i) => {
    summary += `Q${i + 1}: ${r.question}\n`;
    summary += `Your Answer: ${r.answer}\n\n`;

    summary += `Communication: ${r.eval.communication} / 5\n`;
    summary += `Technical: ${r.eval.technical} / 5\n`;
    summary += `Structure: ${r.eval.structure} / 5\n`;
    summary += `Confidence: ${r.eval.confidence} / 5\n`;
    summary += `Notes: ${r.eval.notes}\n`;
    summary += `-------------------------\n\n`;
  });

  summary += `FINAL AGGREGATE SCORE\n`;
  summary += `Communication: ${agg.communication}\n`;
  summary += `Technical: ${agg.technical}\n`;
  summary += `Structure: ${agg.structure}\n`;
  summary += `Confidence: ${agg.confidence}\n`;

  return res.status(200).type("text/plain").send(summary.trim());
});

module.exports = router;
