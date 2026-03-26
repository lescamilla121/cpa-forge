import { useState, useEffect, useRef, useCallback } from "react";

const SECTIONS = {
  FAR: { label: "FAR", full: "Financial Accounting & Reporting", color: "#00C9A7" },
  REG: { label: "REG", full: "Tax & Regulation", color: "#F7C59F" },
  AUD: { label: "AUD", full: "Auditing & Attestation", color: "#A78BFA" },
  BAR: { label: "BAR", full: "Business Analysis & Reporting", color: "#60A5FA" },
};

const SYSTEM_PROMPT = `You are a CPA exam instructor specializing in scenario-based journal entry challenges.

When asked to generate a scenario, respond ONLY with a valid JSON object (no markdown, no backticks) in this exact format:
{
  "id": "unique string",
  "section": "FAR|REG|AUD|BAR",
  "topic": "topic name",
  "difficulty": 1,
  "scenario": "A realistic business scenario description (3-5 sentences). Be specific with dollar amounts.",
  "question": "What journal entry should be recorded?",
  "correct_entries": [
    { "account": "Account Name", "debit": 50000, "credit": null, "explanation": "why this line" }
  ],
  "concept_rule": "The underlying GAAP/tax rule or standard in 2-3 sentences",
  "common_mistakes": ["mistake 1", "mistake 2", "mistake 3"]
}

When asked to evaluate a student's journal entry attempt, respond ONLY with valid JSON:
{
  "score": 85,
  "correct": true,
  "feedback": "overall feedback 2-3 sentences",
  "line_analysis": [{ "student_line": "what they wrote", "assessment": "correct", "note": "explanation" }],
  "key_takeaway": "one sentence core lesson"
}

Difficulty guidelines:
1 = Basic single transaction (cash receipt, simple purchase)
2 = Two-step transaction (accruals, prepaid items)
3 = Complex GAAP (revenue recognition ASC 606, lease accounting ASC 842, deferred taxes)
4 = Multi-period or consolidation entries
5 = Edge cases, complex estimates, or obscure rules

Always use realistic company names and dollar amounts divisible by round numbers for clarity.
IMPORTANT: Return ONLY raw JSON. No markdown fences, no explanation text before or after.`;

const TOPIC_MAP = {
  FAR: ["Revenue Recognition (ASC 606)", "Lease Accounting (ASC 842)", "Deferred Taxes", "Bonds Payable", "Inventory (FIFO/LIFO/WA)", "PP&E & Depreciation", "Contingencies", "Investments (HTM/AFS/Trading)", "Pensions", "Stockholders Equity"],
  REG: ["S-Corp vs C-Corp Distributions", "Partnership Basis", "Individual AMT", "Tax Depreciation (MACRS)", "NOL Carryforwards", "Like-Kind Exchange", "Installment Sales", "Gift & Estate Tax", "Self-Employment Tax", "QBI Deduction"],
  AUD: ["Audit Risk Model", "Internal Controls", "Audit Sampling", "Substantive Procedures", "Going Concern", "Related Party Transactions", "Audit Evidence", "Engagement Letters", "Reports & Opinions", "Ethics & Independence"],
  BAR: ["Financial Statement Analysis", "Cost Accounting", "Budgeting & Variance Analysis", "Transfer Pricing", "Capital Budgeting (NPV/IRR)", "Working Capital Management", "Business Combinations (ASC 805)", "Segment Reporting", "EPS Calculations", "Foreign Currency Translation"],
};

const LS_KEY = "cpa-forge-data";

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLocal(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

// ─── Password Gate ────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!pw.trim()) return;
    setChecking(true);
    setError("");
    // Verify password by making a cheap test call to our API route
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: pw,
          system: "Respond with the single word: OK",
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      if (res.status === 401) {
        setError("Incorrect password. Contact the app owner for access.");
      } else if (res.ok) {
        localStorage.setItem("cpa-forge-pw", pw);
        onUnlock(pw);
      } else {
        setError("Something went wrong. Try again.");
      }
    } catch {
      setError("Network error. Check your connection.");
    }
    setChecking(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0E1A",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 360,
        background: "rgba(232,234,240,0.03)",
        border: "1px solid rgba(0,201,167,0.2)",
        borderRadius: 12, padding: 36,
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, letterSpacing: "0.15em",
          color: "#00C9A7", textTransform: "uppercase", marginBottom: 8,
        }}>CPA//FORGE</div>
        <div style={{ fontSize: 11, color: "rgba(232,234,240,0.35)", marginBottom: 32 }}>
          Adaptive CPA Exam Engine
        </div>
        <div style={{ fontSize: 11, color: "rgba(232,234,240,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Access Password
        </div>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Enter password"
          style={{
            width: "100%", background: "rgba(232,234,240,0.05)",
            border: "1px solid rgba(232,234,240,0.12)",
            borderRadius: 6, padding: "11px 14px",
            color: "#E8EAF0", fontSize: 14, fontFamily: "inherit",
            outline: "none", boxSizing: "border-box", marginBottom: 12,
          }}
        />
        {error && (
          <div style={{ fontSize: 12, color: "#FB7185", marginBottom: 12 }}>{error}</div>
        )}
        <button onClick={submit} disabled={checking || !pw.trim()} style={{
          width: "100%", background: checking ? "rgba(0,201,167,0.1)" : "#00C9A7",
          border: "none", borderRadius: 6, color: checking ? "rgba(0,201,167,0.5)" : "#0A0E1A",
          padding: "12px", fontSize: 12, fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          cursor: checking ? "not-allowed" : "pointer", fontFamily: "inherit",
        }}>
          {checking ? "Verifying..." : "Enter →"}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [password, setPassword] = useState(() => localStorage.getItem("cpa-forge-pw") || null);
  const [activeSection, setActiveSection] = useState("FAR");
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [studentEntry, setStudentEntry] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [weaknesses, setWeaknesses] = useState({});
  const [allTimeStats, setAllTimeStats] = useState({ attempted: 0, correct: 0, streak: 0 });
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(1);
  const [view, setView] = useState("home");
  const [history, setHistory] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [error, setError] = useState(null);
  const entryRef = useRef(null);

  // Load persisted data on mount
  useEffect(() => {
    const saved = loadLocal();
    if (saved) {
      if (saved.weaknesses) setWeaknesses(saved.weaknesses);
      if (saved.allTimeStats) setAllTimeStats(saved.allTimeStats);
      if (saved.adaptiveDifficulty) setAdaptiveDifficulty(saved.adaptiveDifficulty);
      if (saved.history) setHistory(saved.history);
    }
  }, []);

  // Persist on every change
  useEffect(() => {
    saveLocal({ weaknesses, allTimeStats, adaptiveDifficulty, history: history.slice(0, 50) });
  }, [weaknesses, allTimeStats, adaptiveDifficulty, history]);

  const callAPI = useCallback(async (system, userContent) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    if (res.status === 401) {
      localStorage.removeItem("cpa-forge-pw");
      setPassword(null);
      throw new Error("Session expired. Please log in again.");
    }
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return data.text;
  }, [password]);

  const getWeakTopics = () =>
    Object.entries(weaknesses)
      .filter(([, v]) => v.attempts > 0)
      .sort((a, b) => (a[1].correct / a[1].attempts) - (b[1].correct / b[1].attempts))
      .slice(0, 3)
      .map(([topic]) => topic);

  const generateScenario = async (topicOverride = null) => {
    setLoading(true);
    setFeedback(null);
    setRevealed(false);
    setStudentEntry("");
    setError(null);

    const weakTopics = getWeakTopics();
    const topics = TOPIC_MAP[activeSection];
    let topic = topicOverride || selectedTopic;

    if (!topic) {
      if (weakTopics.length > 0 && Math.random() < 0.6) {
        const sectionWeak = weakTopics.filter(t => topics.includes(t));
        topic = sectionWeak.length > 0 ? sectionWeak[0] : topics[Math.floor(Math.random() * topics.length)];
      } else {
        topic = topics[Math.floor(Math.random() * topics.length)];
      }
    }

    const prompt = `Generate a ${activeSection} CPA exam journal entry scenario.
Topic: ${topic}
Difficulty level: ${adaptiveDifficulty} out of 5
${weakTopics.length > 0 ? `Student weak areas: ${weakTopics.join(", ")}` : ""}
Invent a specific company name and use concrete dollar amounts.`;

    try {
      const text = await callAPI(SYSTEM_PROMPT, prompt);
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      parsed.topic = topic;
      setScenario(parsed);
      setView("study");
    } catch (e) {
      setError(e.message || "Failed to generate scenario. Try again.");
    }
    setLoading(false);
  };

  const evaluateEntry = async () => {
    if (!studentEntry.trim() || !scenario) return;
    setEvaluating(true);
    setError(null);

    const prompt = `Evaluate this student's journal entry for the CPA exam scenario.

Scenario: ${scenario.scenario}
Question: ${scenario.question}
Correct entries: ${JSON.stringify(scenario.correct_entries)}
Student's attempt: ${studentEntry}

Return evaluation JSON.`;

    try {
      const text = await callAPI(SYSTEM_PROMPT, prompt);
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setFeedback(parsed);
      setRevealed(true);

      const isCorrect = parsed.score >= 80;
      const newStats = {
        attempted: allTimeStats.attempted + 1,
        correct: allTimeStats.correct + (isCorrect ? 1 : 0),
        streak: isCorrect ? allTimeStats.streak + 1 : 0,
      };
      setAllTimeStats(newStats);

      if (isCorrect && newStats.streak >= 2) setAdaptiveDifficulty(p => Math.min(5, p + 1));
      else if (!isCorrect) setAdaptiveDifficulty(p => Math.max(1, p - 1));

      const topic = scenario.topic;
      setWeaknesses(prev => ({
        ...prev,
        [topic]: {
          attempts: (prev[topic]?.attempts || 0) + 1,
          correct: (prev[topic]?.correct || 0) + (isCorrect ? 1 : 0),
        },
      }));

      setHistory(prev => [{
        section: activeSection, topic,
        score: parsed.score,
        difficulty: scenario.difficulty || adaptiveDifficulty,
        timestamp: new Date().toLocaleTimeString(),
      }, ...prev.slice(0, 49)]);
    } catch (e) {
      setError(e.message || "Failed to evaluate. Try again.");
    }
    setEvaluating(false);
  };

  const resetAllData = () => {
    setWeaknesses({});
    setAllTimeStats({ attempted: 0, correct: 0, streak: 0 });
    setAdaptiveDifficulty(1);
    setHistory([]);
    setResetConfirm(false);
    localStorage.removeItem(LS_KEY);
  };

  if (!password) return <PasswordGate onUnlock={setPassword} />;

  const accuracy = allTimeStats.attempted > 0
    ? Math.round((allTimeStats.correct / allTimeStats.attempted) * 100) : 0;
  const difficultyLabel = ["", "Foundational", "Intermediate", "Advanced", "Expert", "CPA Hard"][adaptiveDifficulty];

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0E1A", color: "#E8EAF0",
      fontFamily: "'DM Mono', 'Courier New', monospace", position: "relative",
    }}>
      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(0,201,167,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,167,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px", zIndex: 0,
      }} />

      {/* Nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,14,26,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,201,167,0.15)",
        padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", color: "#00C9A7", textTransform: "uppercase" }}>CPA//FORGE</span>
          {allTimeStats.attempted > 0 && (
            <span style={{ fontSize: 10, color: "rgba(232,234,240,0.3)" }}>
              {allTimeStats.attempted} done · {accuracy}% · {difficultyLabel}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["home", "study", "stats"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? "rgba(0,201,167,0.15)" : "transparent",
              border: `1px solid ${view === v ? "#00C9A7" : "rgba(232,234,240,0.1)"}`,
              color: view === v ? "#00C9A7" : "rgba(232,234,240,0.5)",
              padding: "4px 12px", borderRadius: 4, cursor: "pointer",
              fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "inherit",
            }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "28px 16px" }}>

        {/* ── HOME ── */}
        {view === "home" && (
          <div>
            <div style={{ marginBottom: 36 }}>
              <h1 style={{
                fontSize: "clamp(24px,5vw,44px)", fontWeight: 800, lineHeight: 1.1,
                letterSpacing: "-0.02em", marginBottom: 10,
                background: "linear-gradient(135deg, #00C9A7 0%, #60A5FA 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>CPA Exam Forge</h1>
              <p style={{ color: "rgba(232,234,240,0.5)", fontSize: 13, maxWidth: 460, lineHeight: 1.7 }}>
                Adaptive journal entry scenarios across all four CPA sections. Write entries, get graded, track weaknesses.
              </p>
            </div>

            {/* Stats bar */}
            {allTimeStats.attempted > 0 && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 28,
                background: "rgba(0,201,167,0.05)", border: "1px solid rgba(0,201,167,0.18)",
                borderRadius: 8, padding: "12px 18px",
              }}>
                {[["Done", allTimeStats.attempted], ["Correct", allTimeStats.correct], ["Accuracy", `${accuracy}%`], ["Streak", `${allTimeStats.streak}🔥`], ["Level", difficultyLabel]].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 9, color: "rgba(232,234,240,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#00C9A7" }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Section grid */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: "rgba(232,234,240,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Exam Section</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                {Object.entries(SECTIONS).map(([key, sec]) => (
                  <button key={key} onClick={() => { setActiveSection(key); setSelectedTopic(null); }} style={{
                    background: activeSection === key ? `rgba(${key==="FAR"?"0,201,167":key==="REG"?"247,197,159":key==="AUD"?"167,139,250":"96,165,250"},0.1)` : "rgba(232,234,240,0.02)",
                    border: `1px solid ${activeSection === key ? sec.color : "rgba(232,234,240,0.07)"}`,
                    borderRadius: 8, padding: "14px 16px", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: sec.color, marginBottom: 3 }}>{sec.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(232,234,240,0.45)" }}>{sec.full}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic picker */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: "rgba(232,234,240,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                Topic <span style={{ color: "rgba(232,234,240,0.2)" }}>— optional</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button onClick={() => setSelectedTopic(null)} style={{
                  background: !selectedTopic ? "rgba(0,201,167,0.15)" : "transparent",
                  border: `1px solid ${!selectedTopic ? "#00C9A7" : "rgba(232,234,240,0.09)"}`,
                  color: !selectedTopic ? "#00C9A7" : "rgba(232,234,240,0.4)",
                  padding: "4px 11px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "inherit",
                }}>Adaptive</button>
                {TOPIC_MAP[activeSection].map(t => {
                  const w = weaknesses[t];
                  const isWeak = w && w.attempts > 0 && (w.correct / w.attempts) < 0.6;
                  return (
                    <button key={t} onClick={() => setSelectedTopic(selectedTopic === t ? null : t)} style={{
                      background: selectedTopic === t ? "rgba(0,201,167,0.15)" : "transparent",
                      border: `1px solid ${selectedTopic === t ? "#00C9A7" : isWeak ? "rgba(251,113,133,0.35)" : "rgba(232,234,240,0.09)"}`,
                      color: selectedTopic === t ? "#00C9A7" : isWeak ? "#FB7185" : "rgba(232,234,240,0.45)",
                      padding: "4px 11px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "inherit",
                    }}>{t}{isWeak ? " ⚠" : ""}</button>
                  );
                })}
              </div>
            </div>

            {error && <div style={{ color: "#FB7185", fontSize: 12, marginBottom: 14 }}>{error}</div>}

            <button onClick={() => generateScenario()} disabled={loading} style={{
              background: loading ? "rgba(0,201,167,0.08)" : "#00C9A7",
              border: "none", borderRadius: 8,
              color: loading ? "rgba(0,201,167,0.4)" : "#0A0E1A",
              padding: "13px 28px", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}>
              {loading ? "Generating..." : `Generate ${activeSection} Scenario →`}
            </button>
          </div>
        )}

        {/* ── STUDY ── */}
        {view === "study" && (
          <div>
            {!scenario && !loading && (
              <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(232,234,240,0.3)" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>◈</div>
                <div style={{ fontSize: 13 }}>No scenario loaded.</div>
                <button onClick={() => setView("home")} style={{
                  marginTop: 16, background: "transparent",
                  border: "1px solid rgba(0,201,167,0.3)", color: "#00C9A7",
                  padding: "7px 18px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit",
                }}>← Home</button>
              </div>
            )}
            {loading && (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{
                  width: 36, height: 36, border: "2px solid rgba(0,201,167,0.15)",
                  borderTop: "2px solid #00C9A7", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite", margin: "0 auto 14px",
                }} />
                <div style={{ color: "rgba(232,234,240,0.35)", fontSize: 11 }}>Building scenario...</div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}
            {scenario && !loading && (
              <div>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                  <span style={{
                    background: `rgba(${activeSection==="FAR"?"0,201,167":activeSection==="REG"?"247,197,159":activeSection==="AUD"?"167,139,250":"96,165,250"},0.12)`,
                    border: `1px solid ${SECTIONS[activeSection].color}`,
                    color: SECTIONS[activeSection].color,
                    padding: "2px 9px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                  }}>{activeSection}</span>
                  <span style={{ color: "rgba(232,234,240,0.5)", fontSize: 11 }}>{scenario.topic}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(232,234,240,0.3)" }}>
                    {"▪".repeat(scenario.difficulty || adaptiveDifficulty)}{"▫".repeat(5-(scenario.difficulty||adaptiveDifficulty))} {difficultyLabel}
                  </span>
                </div>

                {/* Scenario */}
                <div style={{
                  background: "rgba(232,234,240,0.02)", border: "1px solid rgba(232,234,240,0.07)",
                  borderRadius: 10, padding: "20px", marginBottom: 16,
                }}>
                  <div style={{ fontSize: 10, color: "rgba(232,234,240,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Scenario</div>
                  <p style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(232,234,240,0.82)", marginBottom: 14 }}>{scenario.scenario}</p>
                  <div style={{ background: "rgba(0,201,167,0.06)", border: "1px solid rgba(0,201,167,0.18)", borderRadius: 6, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: "#00C9A7", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>Required</div>
                    <div style={{ fontSize: 13, color: "#E8EAF0" }}>{scenario.question}</div>
                  </div>
                </div>

                {/* Entry input */}
                {!revealed && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: "rgba(232,234,240,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Your Journal Entry</div>
                    <div style={{ fontSize: 10, color: "rgba(232,234,240,0.22)", marginBottom: 8 }}>
                      One line per entry — e.g. "Cash — Dr $50,000" or "Revenue — Cr $50,000"
                    </div>
                    <textarea
                      ref={entryRef}
                      value={studentEntry}
                      onChange={e => setStudentEntry(e.target.value)}
                      placeholder={"Cash — Dr $50,000\nRevenue — Cr $50,000"}
                      style={{
                        width: "100%", minHeight: 120,
                        background: "rgba(232,234,240,0.03)",
                        border: "1px solid rgba(232,234,240,0.1)",
                        borderRadius: 8, padding: "12px 14px",
                        color: "#E8EAF0", fontSize: 13, fontFamily: "inherit",
                        lineHeight: 1.8, resize: "vertical", outline: "none", boxSizing: "border-box",
                      }}
                    />
                    {error && <div style={{ color: "#FB7185", fontSize: 11, marginTop: 6 }}>{error}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={evaluateEntry} disabled={evaluating || !studentEntry.trim()} style={{
                        background: evaluating ? "rgba(0,201,167,0.08)" : "#00C9A7",
                        border: "none", borderRadius: 6,
                        color: evaluating ? "rgba(0,201,167,0.4)" : "#0A0E1A",
                        padding: "10px 22px", fontSize: 11, fontWeight: 700,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        cursor: evaluating || !studentEntry.trim() ? "not-allowed" : "pointer", fontFamily: "inherit",
                      }}>{evaluating ? "Grading..." : "Submit →"}</button>
                      <button onClick={() => setRevealed(true)} style={{
                        background: "transparent", border: "1px solid rgba(232,234,240,0.09)",
                        color: "rgba(232,234,240,0.4)", padding: "10px 18px",
                        borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "inherit",
                      }}>Show Answer</button>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {feedback && revealed && (
                  <div style={{
                    background: feedback.score >= 80 ? "rgba(0,201,167,0.05)" : "rgba(251,113,133,0.05)",
                    border: `1px solid ${feedback.score >= 80 ? "rgba(0,201,167,0.22)" : "rgba(251,113,133,0.22)"}`,
                    borderRadius: 10, padding: 18, marginBottom: 16,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: feedback.score >= 80 ? "#00C9A7" : "#FB7185" }}>{feedback.score}/100</div>
                      <div style={{ fontSize: 13, color: "rgba(232,234,240,0.65)", lineHeight: 1.6 }}>{feedback.feedback}</div>
                    </div>
                    {feedback.key_takeaway && (
                      <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "9px 12px", fontSize: 11, color: "rgba(232,234,240,0.55)", borderLeft: "2px solid #00C9A7" }}>
                        💡 {feedback.key_takeaway}
                      </div>
                    )}
                  </div>
                )}

                {/* Correct answer */}
                {revealed && (
                  <div>
                    <div style={{ background: "rgba(232,234,240,0.02)", border: "1px solid rgba(232,234,240,0.07)", borderRadius: 10, padding: 18, marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: "#00C9A7", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Correct Journal Entry</div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(232,234,240,0.08)" }}>
                              {["Account", "Debit", "Credit", "Why"].map(h => (
                                <th key={h} style={{ padding: "5px 10px", textAlign: h==="Account"||h==="Why"?"left":"right", color: "rgba(232,234,240,0.3)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {scenario.correct_entries.map((row, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid rgba(232,234,240,0.04)" }}>
                                <td style={{ padding: "9px 10px", color: "#E8EAF0", paddingLeft: row.debit ? 10 : 28 }}>{row.account}</td>
                                <td style={{ padding: "9px 10px", textAlign: "right", color: "#00C9A7", fontWeight: 600 }}>{row.debit ? `$${Number(row.debit).toLocaleString()}` : ""}</td>
                                <td style={{ padding: "9px 10px", textAlign: "right", color: "#F7C59F", fontWeight: 600 }}>{row.credit ? `$${Number(row.credit).toLocaleString()}` : ""}</td>
                                <td style={{ padding: "9px 10px", color: "rgba(232,234,240,0.4)", fontSize: 11 }}>{row.explanation}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.18)", borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
                      <div style={{ fontSize: 9, color: "#60A5FA", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7 }}>Rule / Standard</div>
                      <div style={{ fontSize: 12, color: "rgba(232,234,240,0.7)", lineHeight: 1.7 }}>{scenario.concept_rule}</div>
                    </div>

                    <div style={{ background: "rgba(251,113,133,0.04)", border: "1px solid rgba(251,113,133,0.13)", borderRadius: 8, padding: "12px 16px", marginBottom: 22 }}>
                      <div style={{ fontSize: 9, color: "#FB7185", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 9 }}>Common Mistakes</div>
                      {scenario.common_mistakes?.map((m, i) => (
                        <div key={i} style={{ fontSize: 12, color: "rgba(232,234,240,0.55)", marginBottom: 5, paddingLeft: 10, borderLeft: "2px solid rgba(251,113,133,0.25)" }}>{m}</div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => generateScenario()} style={{
                        background: "#00C9A7", border: "none", borderRadius: 6,
                        color: "#0A0E1A", padding: "10px 22px", fontSize: 11, fontWeight: 700,
                        letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
                      }}>Next →</button>
                      <button onClick={() => setView("home")} style={{
                        background: "transparent", border: "1px solid rgba(232,234,240,0.09)",
                        color: "rgba(232,234,240,0.4)", padding: "10px 18px",
                        borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "inherit",
                      }}>Change Section</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STATS ── */}
        {view === "stats" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, letterSpacing: "-0.02em" }}>Performance</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 28 }}>
              {[
                { label: "Attempted", val: allTimeStats.attempted, color: "#60A5FA" },
                { label: "Correct", val: allTimeStats.correct, color: "#00C9A7" },
                { label: "Accuracy", val: `${accuracy}%`, color: accuracy >= 70 ? "#00C9A7" : "#FB7185" },
                { label: "Streak", val: `${allTimeStats.streak}🔥`, color: "#F7C59F" },
                { label: "Level", val: difficultyLabel, color: "#A78BFA" },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: "rgba(232,234,240,0.02)", border: "1px solid rgba(232,234,240,0.07)", borderRadius: 8, padding: "14px" }}>
                  <div style={{ fontSize: 9, color: "rgba(232,234,240,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color }}>{val}</div>
                </div>
              ))}
            </div>

            {Object.keys(weaknesses).length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, color: "rgba(232,234,240,0.3)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Topic Breakdown</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(weaknesses).sort((a, b) => b[1].attempts - a[1].attempts).map(([topic, data]) => {
                    const pct = Math.round((data.correct / data.attempts) * 100);
                    return (
                      <div key={topic} style={{ background: "rgba(232,234,240,0.02)", border: "1px solid rgba(232,234,240,0.06)", borderRadius: 6, padding: "9px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, fontSize: 11, color: "rgba(232,234,240,0.65)" }}>{topic}</div>
                        <div style={{ fontSize: 10, color: "rgba(232,234,240,0.35)" }}>{data.correct}/{data.attempts}</div>
                        <div style={{ width: 70, height: 3, background: "rgba(232,234,240,0.07)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "#00C9A7" : pct >= 60 ? "#F7C59F" : "#FB7185", borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, minWidth: 32, textAlign: "right", color: pct >= 80 ? "#00C9A7" : pct >= 60 ? "#F7C59F" : "#FB7185" }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, color: "rgba(232,234,240,0.3)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Recent History</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {history.map((h, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: "rgba(232,234,240,0.02)", border: "1px solid rgba(232,234,240,0.05)", borderRadius: 6, fontSize: 11 }}>
                      <span style={{ color: SECTIONS[h.section]?.color, fontWeight: 700, minWidth: 30 }}>{h.section}</span>
                      <span style={{ flex: 1, color: "rgba(232,234,240,0.55)" }}>{h.topic}</span>
                      <span style={{ color: "rgba(232,234,240,0.25)", fontSize: 10 }}>D{h.difficulty}</span>
                      <span style={{ fontWeight: 700, minWidth: 36, textAlign: "right", color: h.score >= 80 ? "#00C9A7" : "#FB7185" }}>{h.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allTimeStats.attempted === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(232,234,240,0.25)" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>◈</div>
                <div>No scenarios completed yet.</div>
                <button onClick={() => setView("home")} style={{ marginTop: 14, background: "transparent", border: "1px solid rgba(0,201,167,0.3)", color: "#00C9A7", padding: "7px 18px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Start Studying</button>
              </div>
            )}

            {allTimeStats.attempted > 0 && (
              <div style={{ marginTop: 36, paddingTop: 20, borderTop: "1px solid rgba(232,234,240,0.05)" }}>
                {!resetConfirm ? (
                  <button onClick={() => setResetConfirm(true)} style={{ background: "transparent", border: "1px solid rgba(251,113,133,0.18)", color: "rgba(251,113,133,0.45)", padding: "7px 16px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "inherit", letterSpacing: "0.08em", textTransform: "uppercase" }}>Reset All Progress</button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "rgba(251,113,133,0.8)" }}>Clears everything. Sure?</span>
                    <button onClick={resetAllData} style={{ background: "rgba(251,113,133,0.12)", border: "1px solid #FB7185", color: "#FB7185", padding: "5px 12px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>Yes, Reset</button>
                    <button onClick={() => setResetConfirm(false)} style={{ background: "transparent", border: "1px solid rgba(232,234,240,0.09)", color: "rgba(232,234,240,0.4)", padding: "5px 12px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>Cancel</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
