import { useState, useCallback, useEffect, useMemo } from "react";
import { preloadForList, playReaction, playWord, playUI } from "../audio.js";
import "./VocabVibes.css";

const STREAK_TO_MASTER = 2;

const CORRECT_REACTIONS = [
  "Slay! 💅", "No cap! 🔥", "It's giving genius 🧠", "Bussin! 🎉",
  "W! 🏆", "Ate that! 🍽️", "Periodt! 💜", "You cooked! 👨‍🍳",
  "Main character energy! ✨", "So iconic! 💖", "Yaaas! 🌟", "Rizz level 100! 😎",
  "Sheeeesh! 🥶", "On point! 🎯", "Vibes! 🦋",
];

const STREAK_REACTIONS = [
  "Ate and left no crumbs! 🍰✨", "Unstoppable queen! 👑🔥",
  "Serving LOOKS and BRAINS! 💅🧠", "Living rent free in genius town! 🏠💜",
];

const WRONG_REACTIONS = [
  "Bruh 💀", "Oof 😬", "Not the L... 📉", "It's giving wrong answer 🫣",
  "That ain't it chief 😅", "Nah fam 🙈", "Plot twist! 😵",
];

const MASTER_REACTIONS = [
  "LOCKED IN! 🔒✨", "This word is YOUR bestie now! 💕",
  "Permanent brain resident! 🧠🏠", "Added to the collection! 💎",
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getStorageKey(listId) {
  return `vocab-vibes-${listId}`;
}

function loadProgress(listId) {
  try {
    const raw = localStorage.getItem(getStorageKey(listId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(listId, progress) {
  localStorage.setItem(getStorageKey(listId), JSON.stringify(progress));
}

function buildQueue(words, progress) {
  const unmastered = words.filter((w) => !progress[w.word]?.mastered);
  const pool = [];
  for (const w of unmastered) {
    const streak = progress[w.word]?.streak || 0;
    const copies = STREAK_TO_MASTER - streak;
    for (let i = 0; i < copies; i++) {
      pool.push(w);
    }
  }
  return shuffle(pool);
}

function makeQuestion(targetWord, allWords) {
  const def = pickRandom(targetWord.definitions);
  const others = shuffle(allWords.filter((w) => w.word !== targetWord.word)).slice(0, 7);
  const choices = shuffle([targetWord, ...others]);
  return {
    word: targetWord.word,
    partOfSpeech: def.partOfSpeech,
    definition: def.definition,
    choices: choices.map((w) => w.word),
  };
}

const LOADING_TIPS = [
  "Loading the vibes... ✨",
  "Downloading brainpower... 🧠",
  "Getting the audio ready... 🎧",
  "Almost there bestie... 💅",
  "Cooking up something fire... 🔥",
];

export default function VocabVibes({ list, onBack }) {
  const { id: listId, words } = list;
  const [loading, setLoading] = useState(true);
  const [audioLoadStatus, setAudioLoadStatus] = useState({ loaded: 0, total: 1 });
  const [progress, setProgress] = useState(() => loadProgress(listId));
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [allMastered, setAllMastered] = useState(false);
  const [combo, setCombo] = useState(0);
  const [particles, setParticles] = useState([]);
  const [shakeWord, setShakeWord] = useState(null);

  const [loadingTip] = useState(() => pickRandom(LOADING_TIPS));

  // Preload audio on mount
  useEffect(() => {
    let cancelled = false;
    preloadForList(words, (loaded, total) => {
      if (!cancelled) setAudioLoadStatus({ loaded, total });
    }).then(() => {
      if (!cancelled) {
        const saved = loadProgress(listId);
        setProgress(saved);
        const q = buildQueue(words, saved);
        setQueue(q);
        if (q.length === 0) {
          setAllMastered(true);
        } else {
          setQuestion(makeQuestion(q[0], words));
          setQueueIndex(1);
        }
        setLoading(false);
        playUI("welcome");
      }
    });
    return () => { cancelled = true; };
  }, [listId, words]);

  const masteredCount = useMemo(
    () => words.filter((w) => progress[w.word]?.mastered).length,
    [words, progress]
  );

  const totalWords = words.length;
  const cloutPercent = Math.round((masteredCount / totalWords) * 100);

  const spawnParticles = useCallback((correct) => {
    const emojis = correct
      ? ["✨", "🌟", "💖", "🦋", "💅", "🔥", "⭐", "💜", "🎀", "🫧"]
      : ["💀", "😵", "📉"];
    const count = correct ? 12 : 5;
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      emoji: pickRandom(emojis),
      x: Math.random() * 80 + 10,
      y: Math.random() * 30 + 35,
      dx: (Math.random() - 0.5) * 120,
      dy: -(Math.random() * 80 + 40),
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1200);
  }, []);

  const advanceToNext = useCallback(
    (newProgress, previousWord) => {
      const newQueue = buildQueue(words, newProgress);
      setQueue(newQueue);
      if (newQueue.length === 0) {
        setAllMastered(true);
        setQuestion(null);
        playUI("you_understood_the_assignment");
      } else {
        let pick = newQueue[0];
        let idx = 1;
        if (pick.word === previousWord && newQueue.length > 1) {
          pick = newQueue[1];
          idx = 2;
        }
        setQuestion(makeQuestion(pick, words));
        setQueueIndex(idx);
      }
      setFeedback(null);
      setSelectedChoice(null);
      setShakeWord(null);
    },
    [words]
  );

  const handleChoice = useCallback(
    (chosen) => {
      if (feedback) return;

      const correct = chosen === question.word;
      const prev = progress[question.word] || { streak: 0, mastered: false, totalWrong: 0 };

      let newEntry;
      let reaction;
      let justMastered = false;

      if (correct) {
        const newStreak = prev.streak + 1;
        justMastered = newStreak >= STREAK_TO_MASTER;
        newEntry = {
          ...prev,
          streak: newStreak,
          mastered: justMastered,
          totalWrong: prev.totalWrong,
        };
        const newCombo = combo + 1;
        setCombo(newCombo);

        if (justMastered) {
          reaction = pickRandom(MASTER_REACTIONS);
        } else if (newCombo >= 5 && newCombo % 3 === 0) {
          reaction = pickRandom(STREAK_REACTIONS);
        } else {
          reaction = pickRandom(CORRECT_REACTIONS);
        }
        spawnParticles(true);
        // Play: word audio, then reaction
        playWord(question.word);
        setTimeout(() => playReaction(reaction), 600);
        if (justMastered) {
          setTimeout(() => playUI("word_mastered"), 1200);
        }
      } else {
        newEntry = {
          ...prev,
          streak: 0,
          mastered: false,
          totalWrong: prev.totalWrong + 1,
        };
        reaction = pickRandom(WRONG_REACTIONS);
        setCombo(0);
        setShakeWord(chosen);
        spawnParticles(false);
        // Play: wrong reaction, then "the answer was", then the correct word
        playReaction(reaction);
        setTimeout(() => playUI("the_answer_was"), 800);
        setTimeout(() => playWord(question.word), 1800);
      }

      const newProgress = { ...progress, [question.word]: newEntry };
      setProgress(newProgress);
      saveProgress(listId, newProgress);
      setSelectedChoice(chosen);
      setFeedback({ correct, reaction, justMastered, answer: question.word });

      const prevWord = question.word;
      setTimeout(() => advanceToNext(newProgress, prevWord), correct ? 3000 : 4400);
    },
    [feedback, question, progress, listId, combo, spawnParticles, advanceToNext]
  );

  const handleReset = useCallback(() => {
    localStorage.removeItem(getStorageKey(listId));
    const fresh = {};
    setProgress(fresh);
    const newQueue = buildQueue(words, fresh);
    setQueue(newQueue);
    setQueueIndex(0);
    setQuestion(makeQuestion(newQueue[0], words));
    setQueueIndex(1);
    setFeedback(null);
    setSelectedChoice(null);
    setAllMastered(false);
    setCombo(0);
  }, [listId, words]);

  // Clout meter label
  const cloutLabel =
    cloutPercent === 100 ? "GOAT STATUS 🐐" :
    cloutPercent >= 75 ? "Main Character 👑" :
    cloutPercent >= 50 ? "Leveling Up 📈" :
    cloutPercent >= 25 ? "Getting Warmer 🔥" :
    "Just Vibing 🦋";

  const wordStatusList = words.map((w) => {
    const p = progress[w.word];
    if (!p) return { word: w.word, status: "unseen" };
    if (p.mastered) return { word: w.word, status: "mastered" };
    if (p.streak === 1) return { word: w.word, status: "almost" };
    if (p.totalWrong > 0) return { word: w.word, status: "struggling" };
    return { word: w.word, status: "unseen" };
  });

  // Loading screen
  if (loading) {
    const pct = Math.round((audioLoadStatus.loaded / audioLoadStatus.total) * 100);
    return (
      <div className="vv">
        <div className="vv-loading">
          <div className="vv-loading-inner">
            <div className="vv-loading-emoji">🎧✨🎵</div>
            <h2 className="vv-loading-title">{loadingTip}</h2>
            <div className="vv-loading-bar-wrap">
              <div className="vv-loading-bar">
                <div className="vv-loading-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="vv-loading-pct">{pct}%</span>
            </div>
            <p className="vv-loading-count">
              {audioLoadStatus.loaded} / {audioLoadStatus.total} audio files
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vv">
      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="vv-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
          }}
        >
          {p.emoji}
        </div>
      ))}

      <div className="vv-header">
        <button className="vv-back" onClick={onBack}>← Back</button>
        <h1 className="vv-title">✨ Vocab Vibes ✨</h1>
      </div>

      {/* Clout Meter */}
      <div className="vv-clout">
        <div className="vv-clout-label">
          <span>{cloutLabel}</span>
          <span className="vv-clout-count">{masteredCount}/{totalWords} mastered</span>
        </div>
        <div className="vv-clout-bar">
          <div
            className="vv-clout-fill"
            style={{ width: `${cloutPercent}%` }}
          />
        </div>
      </div>

      {combo >= 3 && !allMastered && (
        <div className="vv-combo">🔥 {combo} streak! 🔥</div>
      )}

      {/* Question Area */}
      {!allMastered && question && (
        <div className="vv-question-area">
          <div className="vv-def-card">
            <span className="vv-pos">{question.partOfSpeech}</span>
            <p className="vv-def-text">{question.definition}</p>
            {progress[question.word]?.streak === 1 && !feedback && (
              <div className="vv-almost-badge">⚡ One more to master!</div>
            )}
          </div>

          <div className="vv-choices">
            {question.choices.map((choice) => {
              let cls = "vv-choice";
              if (feedback) {
                if (choice === question.word) cls += " vv-choice-correct";
                else if (choice === selectedChoice) cls += " vv-choice-wrong";
                else cls += " vv-choice-disabled";
              }
              if (shakeWord === choice && feedback && !feedback.correct) cls += " vv-shake";
              return (
                <button
                  key={choice}
                  className={cls}
                  onClick={() => handleChoice(choice)}
                  disabled={!!feedback}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className={`vv-reaction ${feedback.correct ? "vv-reaction-correct" : "vv-reaction-wrong"}`}>
              <div className="vv-reaction-text">{feedback.reaction}</div>
              {!feedback.correct && (
                <div className="vv-reaction-answer">
                  The answer was: <strong>{feedback.answer}</strong>
                </div>
              )}
              {feedback.justMastered && (
                <div className="vv-mastered-flash">🎀 WORD MASTERED! 🎀</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* All mastered celebration */}
      {allMastered && (
        <div className="vv-celebrate">
          <div className="vv-celebrate-inner">
            <div className="vv-celebrate-emoji">💅👑✨🏆✨👑💅</div>
            <h2>You understood the assignment!</h2>
            <p>All {totalWords} words mastered!</p>
            <p className="vv-celebrate-sub">No cap, you ate that whole list 🍽️</p>
            <button className="vv-celebrate-btn" onClick={handleReset}>
              Run it back? 🔄
            </button>
            <button className="vv-celebrate-btn vv-celebrate-btn-back" onClick={onBack}>
              Back to menu
            </button>
          </div>
        </div>
      )}

      {/* Word Progress Panel */}
      <div className="vv-progress-panel">
        <h3>Word Tracker 📋</h3>
        <div className="vv-word-list">
          {wordStatusList.map(({ word, status }) => (
            <div key={word} className={`vv-word-item vv-word-${status}`}>
              <span className="vv-word-icon">
                {status === "mastered" && "✅"}
                {status === "almost" && "⚡"}
                {status === "struggling" && "💪"}
                {status === "unseen" && "⬜"}
              </span>
              <span className="vv-word-name">{word}</span>
              {status === "mastered" && <span className="vv-word-badge">slayed 💅</span>}
              {status === "almost" && <span className="vv-word-badge">almost! 🔥</span>}
              {status === "struggling" && <span className="vv-word-badge">keep going! 💜</span>}
            </div>
          ))}
        </div>
        {masteredCount > 0 && !allMastered && (
          <button className="vv-reset-btn" onClick={handleReset}>
            Reset progress 🗑️
          </button>
        )}
      </div>
    </div>
  );
}
