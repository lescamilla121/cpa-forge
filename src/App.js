import { useState, useEffect, useCallback } from "react";

const SECTIONS = {
  FAR: { label: "FAR", full: "Financial Accounting & Reporting", color: "#00C9A7" },
  REG: { label: "REG", full: "Tax & Regulation", color: "#F7C59F" },
  AUD: { label: "AUD", full: "Auditing & Attestation", color: "#A78BFA" },
  BAR: { label: "BAR", full: "Business Analysis & Reporting", color: "#60A5FA" },
};

const TOPIC_MAP = {
  FAR: ["Revenue Recognition (ASC 606)","Lease Accounting (ASC 842)","Deferred Taxes","Bonds Payable","Inventory (FIFO/LIFO/WA)","PP&E & Depreciation","Contingencies","Investments (HTM/AFS/Trading)","Pensions","Stockholders Equity"],
  REG: ["S-Corp vs C-Corp Distributions","Partnership Basis","Individual AMT","Tax Depreciation (MACRS)","NOL Carryforwards","Like-Kind Exchange","Installment Sales","Gift & Estate Tax","Self-Employment Tax","QBI Deduction"],
  AUD: ["Audit Risk Model","Internal Controls","Audit Sampling","Substantive Procedures","Going Concern","Related Party Transactions","Audit Evidence","Engagement Letters","Reports & Opinions","Ethics & Independence"],
  BAR: ["Financial Statement Analysis","Cost Accounting","Budgeting & Variance Analysis","Transfer Pricing","Capital Budgeting (NPV/IRR)","Working Capital Management","Business Combinations (ASC 805)","Segment Reporting","EPS Calculations","Foreign Currency Translation"],
};

const SYSTEM_PROMPT = `You are a CPA exam instructor. Return ONLY raw JSON, no markdown, no backticks, no explanation text before or after.

For journal entry scenarios use this format:
{"type":"je","topic":"topic name","difficulty":1,"scenario":"3-5 sentence realistic business scenario with dollar amounts and a specific invented company name","question":"What journal entry should be recorded?","correct_entries":[{"account":"Account Name","debit":50000,"credit":null,"explanation":"why this line"}],"concept_rule":"2-3 sentence GAAP or tax rule","common_mistakes":["mistake 1","mistake 2","mistake 3"]}

For MCQ questions use this format:
{"type":"mcq","topic":"topic name","difficulty":1,"question":"A clear exam-style multiple choice question","choices":{"A":"first choice","B":"second choice","C":"third choice","D":"fourth choice"},"correct":"A","explanation":"2-3 sentence explanation of why the correct answer is right and why the others are wrong","concept_rule":"The underlying rule or standard in 1-2 sentences"}

For journal entry evaluation use this format:
{"score":85,"correct":true,"feedback":"2-3 sentence overall feedback","key_takeaway":"one sentence core lesson"}

Difficulty levels: 1=basic single transaction, 2=two-step accrual or prepaid, 3=complex GAAP like ASC 606 or 842, 4=multi-period or consolidation, 5=edge cases or obscure rules.
Use realistic invented company names and round dollar amounts.`;

const LS_KEY = "cpa-forge-data-v2";
const loadLocal = () => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const saveLocal = (d) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} };

const HomeIcon = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
const StudyIcon = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>);
const StatsIcon = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>);

function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!pw.trim()) return;
    setChecking(true); setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw, system: "Reply with one word: OK", messages: [{ role: "user", content: "ping" }] }),
      });
      if (res.status === 401) setError("Wrong password. Ask the app owner for access.");
      else if (res.ok) { localStorage.setItem("cpa-forge-pw", pw); onUnlock(pw); }
      else setError("Something went wrong. Try again.");
    } catch { setError("Network error. Check your connection."); }
    setChecking(false);
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#0A0E1A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono','Courier New',monospace", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 340, background: "rgba(232,234,240,0.03)", border: "1px solid rgba(0,201,167,0.2)", borderRadius: 16, padding: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.15em", color: "#00C9A7", textTransform: "uppercase", marginBottom: 6 }}>CPA//FORGE</div>
        <div style={{ fontSize: 12, color: "rgba(232,234,240,0.35)", marginBottom: 28 }}>Adaptive CPA Exam Engine</div>
        <div style={{ fontSize: 11, color: "rgba(232,234,240,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Password</div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Enter password"
          style={{ width: "100%", background: "rgba(232,234,240,0.06)", border: "1px solid rgba(232,234,240,0.12)", borderRadius: 10, padding: "14px 16px", color: "#E8EAF0", fontSize: 16, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
        {error && <div style={{ fontSize: 12, color: "#FB7185", marginBottom: 10 }}>{error}</div>}
        <button onClick={submit} disabled={checking || !pw.trim()} style={{ width: "100%", background: checking ? "rgba(0,201,167,0.1)" : "#00C9A7", border: "none", borderRadius: 10, color: checking ? "rgba(0,201,167,0.4)" : "#0A0E1A", padding: 14, fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: checking ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {checking ? "Checking..." : "Enter →"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [password, setPassword] = useState(() => localStorage.getItem("cpa-forge-pw") || null);
  const [view, setView] = useState("home");
  const [activeSection, setActiveSection] = useState("FAR");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);

  // JE state
  const [studentEntry, setStudentEntry] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // MCQ state
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [mcqRevealed, setMcqRevealed] = useState(false);

  // Persistent
  const [weaknesses, setWeaknesses] = useState({});
  const [allTimeStats, setAllTimeStats] = useState({ attempted: 0, correct: 0, streak: 0 });
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(1);
  const [history, setHistory] = useState([]);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    const s = loadLocal();
    if (s) {
      if (s.weaknesses) setWeaknesses(s.weaknesses);
      if (s.allTimeStats) setAllTimeStats(s.allTimeStats);
      if (s.adaptiveDifficulty) setAdaptiveDifficulty(s.adaptiveDifficulty);
      if (s.history) setHistory(s.history);
    }
  }, []);

  useEffect(() => {
    saveLocal({ weaknesses, allTimeStats, adaptiveDifficulty, history: history.slice(0, 50) });
  }, [weaknesses, allTimeStats, adaptiveDifficulty, history]);

  const callAPI = useCallback(async (system, userContent) => {
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, system, messages: [{ role: "user", content: userContent }] }),
    });
    if (res.status === 401) { localStorage.removeItem("cpa-forge-pw"); setPassword(null); throw new Error("Session expired."); }
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return data.text;
  }, [password]);

  const getWeakTopics = () =>
    Object.entries(weaknesses).filter(([, v]) => v.attempts > 0)
      .sort((a, b) => (a[1].correct / a[1].attempts) - (b[1].correct / b[1].attempts))
      .slice(0, 3).map(([t]) => t);

  const generateQuestion = async (topicOverride = null) => {
    setLoading(true); setFeedback(null); setRevealed(false);
    setStudentEntry(""); setSelectedChoice(null); setMcqRevealed(false);
    setError(null); setQuestion(null);

    const weakTopics = getWeakTopics();
    const topics = TOPIC_MAP[activeSection];
    let topic = topicOverride || selectedTopic;
    if (!topic) {
      if (weakTopics.length > 0 && Math.random() < 0.6) {
        const sw = weakTopics.filter(t => topics.includes(t));
        topic = sw.length > 0 ? sw[0] : topics[Math.floor(Math.random() * topics.length)];
      } else {
        topic = topics[Math.floor(Math.random() * topics.length)];
      }
    }

    const isMCQ = questionCount % 2 === 1;
    const prompt = isMCQ
      ? `Generate a ${activeSection} CPA exam MCQ question. Topic: ${topic}. Difficulty: ${adaptiveDifficulty}/5.${weakTopics.length > 0 ? ` Weak areas: ${weakTopics.join(", ")}.` : ""}`
      : `Generate a ${activeSection} CPA exam journal entry scenario. Topic: ${topic}. Difficulty: ${adaptiveDifficulty}/5.${weakTopics.length > 0 ? ` Weak areas: ${weakTopics.join(", ")}.` : ""}`;

    try {
      const text = await callAPI(SYSTEM_PROMPT, prompt);
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      parsed.topic = topic;
      setQuestion(parsed);
      setQuestionCount(c => c + 1);
      setView("study");
    } catch (e) {
      setError(e.message || "Failed to generate. Try again.");
    }
    setLoading(false);
  };

  const evaluateJE = async () => {
    if (!studentEntry.trim() || !question) return;
    setEvaluating(true); setError(null);
    try {
      const text = await callAPI(SYSTEM_PROMPT,
        `Evaluate this journal entry attempt.\nScenario: ${question.scenario}\nQuestion: ${question.question}\nCorrect entries: ${JSON.stringify(question.correct_entries)}\nStudent answer: ${studentEntry}\nReturn evaluation JSON.`
      );
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setFeedback(parsed); setRevealed(true);
      recordResult(parsed.score >= 80, question.topic, parsed.score);
    } catch { setError("Failed to grade. Try again."); }
    setEvaluating(false);
  };

  const submitMCQ = (choice) => {
    if (mcqRevealed) return;
    setSelectedChoice(choice); setMcqRevealed(true);
    recordResult(choice === question.correct, question.topic, choice === question.correct ? 100 : 0);
  };

  const recordResult = (isCorrect, topic, score) => {
    const newStats = { attempted: allTimeStats.attempted + 1, correct: allTimeStats.correct + (isCorrect ? 1 : 0), streak: isCorrect ? allTimeStats.streak + 1 : 0 };
    setAllTimeStats(newStats);
    if (isCorrect && newStats.streak >= 2) setAdaptiveDifficulty(p => Math.min(5, p + 1));
    else if (!isCorrect) setAdaptiveDifficulty(p => Math.max(1, p - 1));
    setWeaknesses(prev => ({ ...prev, [topic]: { attempts: (prev[topic]?.attempts || 0) + 1, correct: (prev[topic]?.correct || 0) + (isCorrect ? 1 : 0) } }));
    setHistory(prev => [{ section: activeSection, topic, score, difficulty: question.difficulty || adaptiveDifficulty, type: question.type, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 49)]);
  };

  const resetAllData = () => {
    setWeaknesses({}); setAllTimeStats({ attempted: 0, correct: 0, streak: 0 });
    setAdaptiveDifficulty(1); setHistory([]); setResetConfirm(false);
    localStorage.removeItem(LS_KEY);
  };

  if (!password) return <PasswordGate onUnlock={setPassword} />;

  const accuracy = allTimeStats.attempted > 0 ? Math.round((allTimeStats.correct / allTimeStats.attempted) * 100) : 0;
  const diffLabel = ["", "Foundational", "Intermediate", "Advanced", "Expert", "CPA Hard"][adaptiveDifficulty];
  const secColor = SECTIONS[activeSection].color;

  const card = { background: "rgba(232,234,240,0.03)", border: "1px solid rgba(232,234,240,0.08)", borderRadius: 14, padding: 16, marginBottom: 12 };
  const lbl = { fontSize: 10, color: "rgba(232,234,240,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, display: "block" };
  const primaryBtn = (active = true) => ({ width: "100%", background: active ? "#00C9A7" : "rgba(232,234,240,0.06)", border: active ? "none" : "1px solid rgba(232,234,240,0.1)", borderRadius: 12, color: active ? "#0A0E1A" : "rgba(232,234,240,0.4)", padding: 16, fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", cursor: active ? "pointer" : "not-allowed", fontFamily: "inherit", textTransform: "uppercase" });

  return (
    <div style={{ height: "100dvh", background: "#0A0E1A", color: "#E8EAF0", fontFamily: "'DM Mono','Courier New',monospace", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Safe area top */}
      <div style={{ height: "env(safe-area-inset-top, 0px)", background: "#0A0E1A", flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(0,201,167,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#00C9A7", textTransform: "uppercase" }}>CPA//FORGE</span>
        {allTimeStats.attempted > 0 && <span style={{ fontSize: 11, color: "rgba(232,234,240,0.3)" }}>{accuracy}% · {diffLabel}</span>}
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0", WebkitOverflowScrolling: "touch" }}>

        {/* HOME */}
        {view === "home" && (
          <div>
            <div style={card}>
              <span style={lbl}>Exam Section</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(SECTIONS).map(([key, sec]) => (
                  <button key={key} onClick={() => { setActiveSection(key); setSelectedTopic(null); }} style={{ background: activeSection === key ? `rgba(${key==="FAR"?"0,201,167":key==="REG"?"247,197,159":key==="AUD"?"167,139,250":"96,165,250"},0.12)` : "rgba(232,234,240,0.02)", border: `2px solid ${activeSection === key ? sec.color : "rgba(232,234,240,0.07)"}`, borderRadius: 10, padding: "12px 10px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: sec.color }}>{sec.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(232,234,240,0.4)", marginTop: 2 }}>{sec.full}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={card}>
              <span style={lbl}>Topic — <span style={{ color: "rgba(232,234,240,0.2)", textTransform: "none", letterSpacing: 0 }}>tap to focus, blank = adaptive</span></span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button onClick={() => setSelectedTopic(null)} style={{ background: !selectedTopic ? "rgba(0,201,167,0.15)" : "transparent", border: `1px solid ${!selectedTopic ? "#00C9A7" : "rgba(232,234,240,0.1)"}`, color: !selectedTopic ? "#00C9A7" : "rgba(232,234,240,0.45)", padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Adaptive</button>
                {TOPIC_MAP[activeSection].map(t => {
                  const w = weaknesses[t];
                  const isWeak = w && w.attempts > 0 && (w.correct / w.attempts) < 0.6;
                  return (
                    <button key={t} onClick={() => setSelectedTopic(selectedTopic === t ? null : t)} style={{ background: selectedTopic === t ? "rgba(0,201,167,0.15)" : "transparent", border: `1px solid ${selectedTopic === t ? "#00C9A7" : isWeak ? "rgba(251,113,133,0.4)" : "rgba(232,234,240,0.1)"}`, color: selectedTopic === t ? "#00C9A7" : isWeak ? "#FB7185" : "rgba(232,234,240,0.5)", padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
                      {t}{isWeak ? " ⚠" : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "rgba(232,234,240,0.3)" }}>Next: {questionCount % 2 === 0 ? "📝 Journal Entry" : "🔤 Multiple Choice"}</span>
            </div>

            {error && <div style={{ color: "#FB7185", fontSize: 13, marginBottom: 12, padding: "10px 14px", background: "rgba(251,113,133,0.08)", borderRadius: 8 }}>{error}</div>}
            <button onClick={() => generateQuestion()} disabled={loading} style={primaryBtn(!loading)}>
              {loading ? "Generating..." : `Start ${activeSection} Question →`}
            </button>
          </div>
        )}

        {/* STUDY */}
        {view === "study" && (
          <div>
            {loading && (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{ width: 36, height: 36, border: "2px solid rgba(0,201,167,0.15)", borderTop: "2px solid #00C9A7", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <div style={{ color: "rgba(232,234,240,0.35)", fontSize: 12 }}>Building question...</div>
              </div>
            )}

            {!loading && question && (
              <div>
                {/* Meta */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ background: `rgba(${activeSection==="FAR"?"0,201,167":activeSection==="REG"?"247,197,159":activeSection==="AUD"?"167,139,250":"96,165,250"},0.12)`, border: `1px solid ${secColor}`, color: secColor, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{activeSection}</span>
                  <span style={{ fontSize: 11, color: "rgba(232,234,240,0.45)", flex: 1 }}>{question.topic}</span>
                  <span style={{ background: question.type === "mcq" ? "rgba(167,139,250,0.15)" : "rgba(0,201,167,0.1)", color: question.type === "mcq" ? "#A78BFA" : "#00C9A7", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{question.type === "mcq" ? "MCQ" : "JE"}</span>
                </div>

                {/* MCQ */}
                {question.type === "mcq" && (
                  <div>
                    <div style={card}>
                      <span style={lbl}>Question</span>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(232,234,240,0.9)", margin: 0 }}>{question.question}</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                      {Object.entries(question.choices || {}).map(([key, val]) => {
                        let bg = "rgba(232,234,240,0.03)", border = "rgba(232,234,240,0.1)", color = "rgba(232,234,240,0.85)";
                        if (mcqRevealed) {
                          if (key === question.correct) { bg = "rgba(0,201,167,0.12)"; border = "#00C9A7"; color = "#00C9A7"; }
                          else if (key === selectedChoice) { bg = "rgba(251,113,133,0.1)"; border = "#FB7185"; color = "#FB7185"; }
                          else { color = "rgba(232,234,240,0.25)"; }
                        }
                        return (
                          <button key={key} onClick={() => submitMCQ(key)} disabled={mcqRevealed} style={{ background: bg, border: `2px solid ${border}`, borderRadius: 12, padding: "14px 16px", cursor: mcqRevealed ? "default" : "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "flex-start", gap: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: border, minWidth: 20, flexShrink: 0 }}>{key}.</span>
                            <span style={{ fontSize: 13, color, lineHeight: 1.5 }}>{val}</span>
                          </button>
                        );
                      })}
                    </div>
                    {mcqRevealed && (
                      <div>
                        <div style={{ ...card, background: selectedChoice === question.correct ? "rgba(0,201,167,0.07)" : "rgba(251,113,133,0.07)", border: `1px solid ${selectedChoice === question.correct ? "rgba(0,201,167,0.25)" : "rgba(251,113,133,0.25)"}` }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: selectedChoice === question.correct ? "#00C9A7" : "#FB7185", marginBottom: 8 }}>
                            {selectedChoice === question.correct ? "✓ Correct!" : `✗ Correct answer: ${question.correct}`}
                          </div>
                          <p style={{ fontSize: 13, color: "rgba(232,234,240,0.7)", lineHeight: 1.6, margin: 0 }}>{question.explanation}</p>
                        </div>
                        {question.concept_rule && (
                          <div style={{ ...card, background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.18)" }}>
                            <span style={{ ...lbl, color: "#60A5FA" }}>Rule / Standard</span>
                            <p style={{ fontSize: 13, color: "rgba(232,234,240,0.7)", lineHeight: 1.6, margin: 0 }}>{question.concept_rule}</p>
                          </div>
                        )}
                        <button onClick={() => generateQuestion()} style={primaryBtn()}>Next Question →</button>
                      </div>
                    )}
                  </div>
                )}

                {/* JE */}
                {question.type === "je" && (
                  <div>
                    <div style={card}>
                      <span style={lbl}>Scenario</span>
                      <p style={{ fontSize: 13, lineHeight: 1.75, color: "rgba(232,234,240,0.85)", margin: "0 0 14px" }}>{question.scenario}</p>
                      <div style={{ background: "rgba(0,201,167,0.07)", border: "1px solid rgba(0,201,167,0.2)", borderRadius: 10, padding: "12px 14px" }}>
                        <span style={{ ...lbl, color: "#00C9A7" }}>Required</span>
                        <p style={{ fontSize: 13, color: "#E8EAF0", margin: 0 }}>{question.question}</p>
                      </div>
                    </div>

                    {!revealed && (
                      <div style={card}>
                        <span style={lbl}>Your Journal Entry</span>
                        <div style={{ fontSize: 11, color: "rgba(232,234,240,0.25)", marginBottom: 10 }}>One line per entry — e.g. "Cash — Dr $50,000"</div>
                        <textarea value={studentEntry} onChange={e => setStudentEntry(e.target.value)} placeholder={"Cash — Dr $50,000\nRevenue — Cr $50,000"}
                          style={{ width: "100%", minHeight: 110, background: "rgba(232,234,240,0.04)", border: "1px solid rgba(232,234,240,0.1)", borderRadius: 10, padding: "12px 14px", color: "#E8EAF0", fontSize: 14, fontFamily: "inherit", lineHeight: 1.8, resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
                        {error && <div style={{ color: "#FB7185", fontSize: 12, marginBottom: 10 }}>{error}</div>}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={evaluateJE} disabled={evaluating || !studentEntry.trim()} style={{ ...primaryBtn(!evaluating && !!studentEntry.trim()), flex: 2, padding: 14, fontSize: 13 }}>
                            {evaluating ? "Grading..." : "Submit →"}
                          </button>
                          <button onClick={() => setRevealed(true)} style={{ flex: 1, background: "transparent", border: "1px solid rgba(232,234,240,0.1)", color: "rgba(232,234,240,0.4)", borderRadius: 12, padding: 14, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Reveal</button>
                        </div>
                      </div>
                    )}

                    {feedback && revealed && (
                      <div style={{ ...card, background: feedback.score >= 80 ? "rgba(0,201,167,0.06)" : "rgba(251,113,133,0.06)", border: `1px solid ${feedback.score >= 80 ? "rgba(0,201,167,0.22)" : "rgba(251,113,133,0.22)"}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: feedback.score >= 80 ? "#00C9A7" : "#FB7185" }}>{feedback.score}/100</div>
                          <div style={{ fontSize: 13, color: "rgba(232,234,240,0.65)", lineHeight: 1.5 }}>{feedback.feedback}</div>
                        </div>
                        {feedback.key_takeaway && <div style={{ fontSize: 12, color: "rgba(232,234,240,0.5)", borderLeft: "2px solid #00C9A7", paddingLeft: 10 }}>💡 {feedback.key_takeaway}</div>}
                      </div>
                    )}

                    {revealed && (
                      <div>
                        <div style={card}>
                          <span style={{ ...lbl, color: "#00C9A7" }}>Correct Journal Entry</span>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead><tr style={{ borderBottom: "1px solid rgba(232,234,240,0.08)" }}>
                                {["Account","Dr","Cr","Why"].map(h => <th key={h} style={{ padding: "5px 8px", textAlign: h==="Account"||h==="Why"?"left":"right", color: "rgba(232,234,240,0.3)", fontSize: 9, textTransform: "uppercase" }}>{h}</th>)}
                              </tr></thead>
                              <tbody>
                                {question.correct_entries.map((row, i) => (
                                  <tr key={i} style={{ borderBottom: "1px solid rgba(232,234,240,0.04)" }}>
                                    <td style={{ padding: "8px", color: "#E8EAF0", paddingLeft: row.debit ? 8 : 22 }}>{row.account}</td>
                                    <td style={{ padding: "8px", textAlign: "right", color: "#00C9A7", fontWeight: 600 }}>{row.debit ? `$${Number(row.debit).toLocaleString()}` : ""}</td>
                                    <td style={{ padding: "8px", textAlign: "right", color: "#F7C59F", fontWeight: 600 }}>{row.credit ? `$${Number(row.credit).toLocaleString()}` : ""}</td>
                                    <td style={{ padding: "8px", color: "rgba(232,234,240,0.4)", fontSize: 11 }}>{row.explanation}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div style={{ ...card, background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)" }}>
                          <span style={{ ...lbl, color: "#60A5FA" }}>Rule / Standard</span>
                          <p style={{ fontSize: 13, color: "rgba(232,234,240,0.7)", lineHeight: 1.6, margin: 0 }}>{question.concept_rule}</p>
                        </div>
                        <div style={{ ...card, background: "rgba(251,113,133,0.04)", border: "1px solid rgba(251,113,133,0.12)" }}>
                          <span style={{ ...lbl, color: "#FB7185" }}>Common Mistakes</span>
                          {question.common_mistakes?.map((m, i) => <div key={i} style={{ fontSize: 12, color: "rgba(232,234,240,0.55)", marginBottom: 6, paddingLeft: 10, borderLeft: "2px solid rgba(251,113,133,0.3)" }}>{m}</div>)}
                        </div>
                        <button onClick={() => generateQuestion()} style={primaryBtn()}>Next Question →</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STATS */}
        {view === "stats" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[{ label: "Attempted", val: allTimeStats.attempted, color: "#60A5FA" },{ label: "Correct", val: allTimeStats.correct, color: "#00C9A7" },{ label: "Accuracy", val: `${accuracy}%`, color: accuracy >= 70 ? "#00C9A7" : "#FB7185" },{ label: "Streak 🔥", val: allTimeStats.streak, color: "#F7C59F" }].map(({ label: l, val, color }) => (
                <div key={l} style={{ ...card, marginBottom: 0 }}>
                  <span style={lbl}>{l}</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card }}>
              <span style={lbl}>Current Level</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#A78BFA", marginBottom: 10 }}>{diffLabel}</div>
              <div style={{ height: 4, background: "rgba(232,234,240,0.07)", borderRadius: 2 }}>
                <div style={{ width: `${(adaptiveDifficulty / 5) * 100}%`, height: "100%", background: "linear-gradient(90deg,#00C9A7,#A78BFA)", borderRadius: 2 }} />
              </div>
            </div>

            {Object.keys(weaknesses).length > 0 && (
              <div style={card}>
                <span style={lbl}>Topic Breakdown</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(weaknesses).sort((a, b) => b[1].attempts - a[1].attempts).map(([topic, data]) => {
                    const pct = Math.round((data.correct / data.attempts) * 100);
                    return (
                      <div key={topic}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: "rgba(232,234,240,0.65)" }}>{topic}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 80 ? "#00C9A7" : pct >= 60 ? "#F7C59F" : "#FB7185" }}>{pct}%</span>
                        </div>
                        <div style={{ height: 3, background: "rgba(232,234,240,0.07)", borderRadius: 2 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "#00C9A7" : pct >= 60 ? "#F7C59F" : "#FB7185", borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div style={card}>
                <span style={lbl}>Recent History</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {history.slice(0, 15).map((h, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < Math.min(history.length, 15) - 1 ? "1px solid rgba(232,234,240,0.04)" : "none" }}>
                      <span style={{ color: SECTIONS[h.section]?.color, fontWeight: 700, fontSize: 11, minWidth: 28 }}>{h.section}</span>
                      <span style={{ fontSize: 9, color: "rgba(232,234,240,0.25)", minWidth: 24, textTransform: "uppercase" }}>{h.type}</span>
                      <span style={{ flex: 1, fontSize: 11, color: "rgba(232,234,240,0.5)" }}>{h.topic}</span>
                      <span style={{ fontWeight: 700, fontSize: 12, color: h.score >= 80 ? "#00C9A7" : "#FB7185" }}>{h.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allTimeStats.attempted === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(232,234,240,0.25)" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>◈</div>
                <div style={{ fontSize: 14 }}>No questions yet.</div>
              </div>
            )}

            {allTimeStats.attempted > 0 && (
              <div style={{ paddingBottom: 8 }}>
                {!resetConfirm
                  ? <button onClick={() => setResetConfirm(true)} style={{ background: "transparent", border: "1px solid rgba(251,113,133,0.2)", color: "rgba(251,113,133,0.5)", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.08em" }}>Reset All Progress</button>
                  : <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "rgba(251,113,133,0.8)" }}>Sure? This clears everything.</span>
                      <button onClick={resetAllData} style={{ background: "rgba(251,113,133,0.15)", border: "1px solid #FB7185", color: "#FB7185", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Yes</button>
                      <button onClick={() => setResetConfirm(false)} style={{ background: "transparent", border: "1px solid rgba(232,234,240,0.1)", color: "rgba(232,234,240,0.4)", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Cancel</button>
                    </div>
                }
              </div>
            )}
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      {/* Bottom Nav — thumb zone, above home indicator */}
      <div style={{ flexShrink: 0, background: "rgba(10,14,26,0.97)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(0,201,167,0.12)", display: "flex", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[{ id: "home", icon: <HomeIcon />, label: "Home" },{ id: "study", icon: <StudyIcon />, label: "Study" },{ id: "stats", icon: <StatsIcon />, label: "Stats" }].map(({ id, icon, label: navLabel }) => (
          <button key={id} onClick={() => setView(id)} style={{ flex: 1, background: "transparent", border: "none", color: view === id ? "#00C9A7" : "rgba(232,234,240,0.35)", padding: "12px 0 10px", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            {icon}
            <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{navLabel}</span>
            {view === id && <div style={{ width: 20, height: 2, background: "#00C9A7", borderRadius: 1 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
