import React, { useMemo, useRef, useState } from "react";

const DIFFICULTY = { easy: 2, medium: 4, hard: 6 };

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function pickDecoys(baseCaption, tags = [], dense = [], count = 3) {
  const pool = new Set();
  if (Array.isArray(tags)) tags.forEach(t => pool.add(t));
  if (Array.isArray(dense)) dense.forEach(d => pool.add(d.text));
  const silly = [
    "Definitely a toaster.",
    "A dramatic potato in the wild.",
    "Two raccoons discussing taxes.",
    "A quantum cat both sitting and not sitting.",
    "A pizza delivering a human."
  ];
  silly.forEach(s => pool.add(s));

  const candidates = Array.from(pool).filter(x => typeof x === "string" && x.length > 0 && x.toLowerCase() !== baseCaption?.toLowerCase());

  const picks = [];
  while (picks.length < count && candidates.length > 0) {
    const idx = Math.floor(Math.random() * candidates.length);
    picks.push(candidates.splice(idx, 1)[0]);
  }
  return picks;
}

export default function App() {
  const [imageUrl, setImageUrl] = useState("");
  const [fileObjUrl, setFileObjUrl] = useState("");
  const [gameState, setGameState] = useState("idle"); // idle | loading | question | result
  const [choices, setChoices] = useState([]);
  const [correct, setCorrect] = useState(null);
  const [score, setScore] = useState(() => Number(localStorage.getItem("cq_score") || 0));
  const [streak, setStreak] = useState(() => Number(localStorage.getItem("cq_streak") || 0));
  const [difficulty, setDifficulty] = useState("medium");
  const inputRef = useRef(null);

  const previewSrc = useMemo(() => fileObjUrl || imageUrl, [fileObjUrl, imageUrl]);

  function updatePersist(newScore, newStreak) {
    localStorage.setItem("cq_score", String(newScore));
    localStorage.setItem("cq_streak", String(newStreak));
  }

  async function handleAnalyze(blobOrUrl) {
    setGameState("loading");
    try {
      let body; let headers = {};
      if (blobOrUrl instanceof Blob) {
        body = blobOrUrl;
        headers["Content-Type"] = "application/octet-stream";
      } else {
        body = JSON.stringify({ url: blobOrUrl });
        headers["Content-Type"] = "application/json";
      }

      const res = await fetch("/api/analyze", { method: "POST", headers, body });
      if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
      const data = await res.json();

      const real = data.caption;
      const dense = data.denseCaptions || [];
      const tags = data.tags || [];

      let nChoices = DIFFICULTY[difficulty] || 4;
      const decoys = pickDecoys(real, tags, dense, nChoices - 1);
      const all = shuffle([real, ...decoys]);

      setChoices(all);
      setCorrect(real);
      setGameState("question");
    } catch (e) {
      alert(e.message);
      setGameState("idle");
    }
  }

  async function onPick(choice) {
    const isRight = choice === correct;
    let newScore = score;
    let newStreak = isRight ? streak + 1 : 0;
    if (isRight) newScore += 10 + streak * 2;
    setScore(newScore);
    setStreak(newStreak);
    updatePersist(newScore, newStreak);
    setGameState("result");
  }

  function reset() {
    setChoices([]);
    setCorrect(null);
    setGameState("idle");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">📸 Caption Quest</h1>
          <p className="opacity-80">Guess the real Azure AI caption. Score points!</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2 bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
            <label className="text-sm opacity-80">Image URL</label>
            <input
              className="w-full mt-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 outline-none"
              placeholder="https://example.com/cute-cat.jpg"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
            />
            <div className="mt-2 text-sm opacity-70">or upload a file</div>
            <input ref={inputRef} type="file" accept="image/*" className="mt-1"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFileObjUrl(URL.createObjectURL(f));
              }} />

            <div className="mt-3 flex gap-2 items-center text-sm">
              <span>Difficulty:</span>
              <select className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1"
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <button
              className="mt-4 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition px-4 py-3 font-semibold"
              onClick={async () => {
                if (fileObjUrl && inputRef.current?.files?.[0]) {
                  const b = await inputRef.current.files[0].arrayBuffer();
                  await handleAnalyze(new Blob([b]));
                } else if (imageUrl) {
                  await handleAnalyze(imageUrl);
                } else {
                  alert("Provide an image URL or upload a file.");
                }
              }}
              disabled={gameState === "loading"}
            >{gameState === "loading" ? "Analyzing..." : "Analyze Image"}</button>
          </div>

          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
            <div className="text-sm opacity-80">Score</div>
            <div className="text-3xl font-bold">{score}</div>
            <div className="mt-2 text-sm opacity-80">Streak</div>
            <div className="text-xl font-semibold">{streak}</div>
            <button className="mt-4 w-full rounded-xl border border-slate-700 px-3 py-2 hover:bg-slate-800"
              onClick={() => { localStorage.clear(); setScore(0); setStreak(0); }}>Reset</button>
          </div>
        </div>

        {previewSrc && (
          <div className="mt-4">
            <img src={previewSrc} alt="preview" className="w-full rounded-2xl border border-slate-800" />
          </div>
        )}

        {gameState === "question" && (
          <div className="mt-6 bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
            <div className="mb-2 text-sm opacity-80">Pick the real caption:</div>
            <div className="grid gap-3">
              {choices.map((c, idx) => (
                <button key={idx}
                  onClick={() => onPick(c)}
                  className="text-left rounded-xl border border-slate-700 px-3 py-3 hover:bg-slate-800">
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === "result" && (
          <div className="mt-6 bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
            <div className="font-semibold mb-2">Answer</div>
            <div className="mb-4">✅ Correct caption: <span className="font-mono">{correct}</span></div>
            <button className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2" onClick={reset}>Play Again</button>
          </div>
        )}

        <footer className="mt-8 opacity-60 text-xs text-center">
          Built with Azure Computer Vision 4.0 • Free Version
        </footer>
      </div>
    </div>
  );
}
