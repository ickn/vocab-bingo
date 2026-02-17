import { useState, useCallback, useEffect } from "react";
import words from "./data/book4lesson16.js";
import BingoCard from "./components/BingoCard.jsx";
import DefinitionPrompt from "./components/DefinitionPrompt.jsx";
import Scoreboard from "./components/Scoreboard.jsx";
import "./App.css";

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
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

function buildCard() {
  const picked = shuffle(words).slice(0, 8);
  const cells = picked.map((w) => ({ word: w.word, state: "default" }));
  // Insert "None" at center (index 4)
  cells.splice(4, 0, { word: "None", state: "default" });
  return cells;
}

function pickDefinition(cells, allWords) {
  // Green words on the card are excluded from the pool
  const greenWords = new Set(
    cells.filter((c) => c.state === "correct" && c.word !== "None").map((c) => c.word)
  );
  const pool = allWords.filter((w) => !greenWords.has(w.word));
  if (pool.length === 0) return null;
  const entry = pickRandom(pool);
  const def = pickRandom(entry.definitions);
  return { word: entry.word, partOfSpeech: def.partOfSpeech, definition: def.definition };
}

function checkWin(cells) {
  return WIN_LINES.some((line) => line.every((i) => cells[i].state === "correct"));
}

function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 300;
  gain.gain.value = 0.3;
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export default function App() {
  const [cells, setCells] = useState(() => buildCard());
  const [currentDef, setCurrentDef] = useState(null);
  const [score, setScore] = useState([]);
  const [winMessage, setWinMessage] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: "correct"|"incorrect", answer? }
  const [cardsPlayed, setCardsPlayed] = useState(1);
  const [gameWon, setGameWon] = useState(false);

  // Pick initial definition once cells are ready
  useEffect(() => {
    setCurrentDef(pickDefinition(cells, words));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nextDefinition = useCallback((updatedCells) => {
    setCurrentDef(pickDefinition(updatedCells, words));
  }, []);

  const checkAllComplete = useCallback((newScore) => {
    const unique = new Set(newScore);
    return unique.size >= words.length;
  }, []);

  const resetGame = useCallback(() => {
    const newCells = buildCard();
    setCells(newCells);
    setCurrentDef(pickDefinition(newCells, words));
    setScore([]);
    setWinMessage(false);
    setFeedback(null);
    setCardsPlayed(1);
    setGameWon(false);
  }, []);

  const startNewCard = useCallback(() => {
    const newCells = buildCard();
    setCells(newCells);
    setCurrentDef(pickDefinition(newCells, words));
    setWinMessage(false);
    setFeedback(null);
    setCardsPlayed((prev) => prev + 1);
  }, []);

  const handleCellClick = useCallback(
    (index) => {
      if (!currentDef || winMessage || gameWon) return;

      const cell = cells[index];

      // Already correct and not "None" — ignore
      if (cell.state === "correct" && cell.word !== "None") return;

      const cardWords = new Set(cells.map((c) => c.word).filter((w) => w !== "None"));
      const isOnCard = cardWords.has(currentDef.word);

      if (cell.word === "None") {
        // "None" is correct only if the definition's word is NOT on the card
        if (!isOnCard) {
          // Correct — briefly flash green, then reset
          setFeedback({ type: "correct" });
          setCells((prev) => {
            const next = [...prev];
            next[4] = { ...next[4], state: "correct" };
            return next;
          });
          const newScore = [...score, currentDef.word];
          setScore(newScore);
          if (checkAllComplete(newScore)) {
            setTimeout(() => setGameWon(true), 600);
            return;
          }
          setTimeout(() => {
            setCells((prev) => {
              const next = [...prev];
              next[4] = { ...next[4], state: "default" };
              return next;
            });
            setFeedback(null);
            nextDefinition(cells);
          }, 600);
          return;
        } else {
          // Wrong — beep, flash red, new definition
          setFeedback({ type: "incorrect", answer: currentDef.word });
          playBeep();
          setCells((prev) => {
            const next = [...prev];
            next[4] = { ...next[4], state: "wrong" };
            return next;
          });
          setTimeout(() => {
            setCells((prev) => {
              const next = [...prev];
              next[4] = { ...next[4], state: "default" };
              return next;
            });
            setFeedback(null);
            nextDefinition(cells);
          }, 1000);
          return;
        }
      }

      // Regular word cell
      if (cell.word === currentDef.word) {
        // Correct
        setFeedback({ type: "correct" });
        const updated = [...cells];
        updated[index] = { ...updated[index], state: "correct" };
        setCells(updated);
        const newScore = [...score, cell.word];
        setScore(newScore);

        if (checkAllComplete(newScore)) {
          setTimeout(() => setGameWon(true), 600);
        } else if (checkWin(updated)) {
          setFeedback(null);
          setWinMessage(true);
          setTimeout(() => startNewCard(), 2000);
        } else {
          setTimeout(() => setFeedback(null), 600);
          nextDefinition(updated);
        }
      } else {
        // Wrong — beep, flash red, new definition
        setFeedback({ type: "incorrect", answer: currentDef.word });
        playBeep();
        setCells((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], state: "wrong" };
          return next;
        });
        setTimeout(() => {
          setCells((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], state: "default" };
            return next;
          });
          setFeedback(null);
          nextDefinition(cells);
        }, 1000);
      }
    },
    [cells, currentDef, score, winMessage, gameWon, nextDefinition, startNewCard, checkAllComplete]
  );

  return (
    <div className="app">
      <h1>Vocab Bingo</h1>
      <DefinitionPrompt definition={currentDef} />
      {feedback && (
        <div className={`feedback-banner ${feedback.type}`}>
          {feedback.type === "correct"
            ? "Correct!"
            : `Incorrect. The answer was: ${feedback.answer}`}
        </div>
      )}
      {winMessage && <div className="win-banner">Bingo! New card coming...</div>}
      <div className="game-layout">
        <BingoCard cells={cells} onCellClick={handleCellClick} />
        <Scoreboard
          words={score}
          totalWords={words.length}
          cardsPlayed={cardsPlayed}
          onNewCard={startNewCard}
        />
      </div>
      {gameWon && (
        <div className="game-won-overlay">
          <div className="game-won-modal">
            <h2>You WIN!!!</h2>
            <p>You got all {words.length} words correct!</p>
            <button onClick={resetGame}>Try Again</button>
          </div>
        </div>
      )}
    </div>
  );
}
