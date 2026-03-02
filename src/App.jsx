import { useState, useCallback, useMemo, useEffect } from "react";
import lists from "./data/loadLists.js";
import ListPicker from "./components/ListPicker.jsx";
import BingoCard from "./components/BingoCard.jsx";
import DefinitionPrompt from "./components/DefinitionPrompt.jsx";
import Scoreboard from "./components/Scoreboard.jsx";
import "./App.css";

const MAX_CARDS = 5;

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

function buildCard(words, wordStatus) {
  const uncorrected = shuffle(words.filter((w) => !wordStatus[w.word]?.correct));
  const struggled = shuffle(words.filter((w) => wordStatus[w.word]?.correct && wordStatus[w.word]?.misses > 0));
  const mastered = shuffle(words.filter((w) => wordStatus[w.word]?.correct && !(wordStatus[w.word]?.misses > 0)));
  const pool = [...uncorrected, ...struggled, ...mastered];
  const picked = pool.slice(0, 8);
  const cells = picked.map((w) => ({ word: w.word, state: "default" }));
  cells.splice(4, 0, { word: "None", state: "default" });
  return cells;
}

function findNextDef(queue, fromIndex, cells) {
  const cardWords = new Set(cells.map((c) => c.word).filter((w) => w !== "None"));
  const noneCorrect = cells[4]?.state === "correct";

  for (let i = fromIndex; i < queue.length; i++) {
    const entry = queue[i];
    const isOnCard = cardWords.has(entry.word);

    if (isOnCard) {
      if (cells.some((c) => c.word === entry.word && c.state === "correct")) continue;
    } else {
      if (noneCorrect) continue;
    }

    const def = pickRandom(entry.definitions);
    return {
      nextIndex: i + 1,
      def: { word: entry.word, partOfSpeech: def.partOfSpeech, definition: def.definition },
    };
  }

  return null;
}

function checkWin(cells) {
  return WIN_LINES.some((line) => line.every((i) => cells[i].state === "correct"));
}

function isAllCorrect(cardHistory, currentResults, totalWords) {
  const correct = new Set();
  for (const card of cardHistory) {
    for (const [w, r] of Object.entries(card.results)) {
      if (r === "correct") correct.add(w);
    }
  }
  for (const [w, r] of Object.entries(currentResults)) {
    if (r === "correct") correct.add(w);
  }
  return correct.size >= totalWords;
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

function initCard(words, wordStatus) {
  const cells = buildCard(words, wordStatus);
  const queue = shuffle([...words]);
  const first = findNextDef(queue, 0, cells);
  return {
    cells,
    queue,
    defIndex: first ? first.nextIndex : 0,
    currentDef: first ? first.def : null,
  };
}

export default function App() {
  const [selectedList, setSelectedList] = useState(null);
  const [cells, setCells] = useState([]);
  const [currentDef, setCurrentDef] = useState(null);
  const [defQueue, setDefQueue] = useState([]);
  const [defIndex, setDefIndex] = useState(0);
  const [currentCardResults, setCurrentCardResults] = useState({});
  const [cardHistory, setCardHistory] = useState([]);
  const [winMessage, setWinMessage] = useState(false);
  const [cardFailed, setCardFailed] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const words = selectedList?.words;

  const wordStatus = useMemo(() => {
    const status = {};
    for (const card of [...cardHistory, { results: currentCardResults }]) {
      for (const [word, result] of Object.entries(card.results)) {
        if (!status[word]) status[word] = { correct: false, misses: 0 };
        if (result === "correct") status[word].correct = true;
        else status[word].misses++;
      }
    }
    return status;
  }, [cardHistory, currentCardResults]);

  useEffect(() => {
    if (!words) return;
    const init = initCard(words, {});
    setCells(init.cells);
    setDefQueue(init.queue);
    setDefIndex(init.defIndex);
    setCurrentDef(init.currentDef);
  }, [words]);

  const startNewCard = useCallback(() => {
    const init = initCard(words, wordStatus);
    setCells(init.cells);
    setDefQueue(init.queue);
    setDefIndex(init.defIndex);
    setCurrentDef(init.currentDef);
    setCurrentCardResults({});
    setWinMessage(false);
    setCardFailed(false);
    setFeedback(null);
  }, [words, wordStatus]);

  const resetGame = useCallback(() => {
    const init = initCard(words, {});
    setCells(init.cells);
    setDefQueue(init.queue);
    setDefIndex(init.defIndex);
    setCurrentDef(init.currentDef);
    setCurrentCardResults({});
    setCardHistory([]);
    setWinMessage(false);
    setCardFailed(false);
    setFeedback(null);
    setGameWon(false);
    setGameOver(false);
  }, [words]);

  const handleBack = useCallback(() => {
    setSelectedList(null);
    setCells([]);
    setCurrentDef(null);
    setDefQueue([]);
    setDefIndex(0);
    setCurrentCardResults({});
    setCardHistory([]);
    setWinMessage(false);
    setCardFailed(false);
    setFeedback(null);
    setGameWon(false);
    setGameOver(false);
  }, []);

  const handleManualNewCard = useCallback(() => {
    const isLastCard = cardHistory.length + 1 >= MAX_CARDS;
    setCardHistory((prev) => [...prev, { results: currentCardResults, outcome: "failed" }]);
    if (isLastCard) {
      setGameOver(true);
    } else {
      startNewCard();
    }
  }, [cardHistory, currentCardResults, startNewCard]);

  const handleCellClick = useCallback(
    (index) => {
      if (!currentDef || winMessage || cardFailed || gameWon || gameOver || feedback) return;

      const cell = cells[index];
      if (cell.state === "correct") return;

      const cardWords = new Set(cells.map((c) => c.word).filter((w) => w !== "None"));
      const isOnCard = cardWords.has(currentDef.word);
      const isLastCard = cardHistory.length + 1 >= MAX_CARDS;

      // --- CORRECT NONE ---
      if (cell.word === "None" && !isOnCard) {
        setFeedback({ type: "correct", answer: currentDef.word });
        const updated = [...cells];
        updated[4] = { ...updated[4], state: "correct" };
        setCells(updated);

        if (checkWin(updated)) {
          setCardHistory((prev) => [...prev, { results: currentCardResults, outcome: "bingo" }]);
          setTimeout(() => {
            setFeedback(null);
            setWinMessage(true);
            if (isLastCard) setTimeout(() => setGameOver(true), 2000);
            else setTimeout(() => startNewCard(), 2000);
          }, 2500);
        } else {
          const next = findNextDef(defQueue, defIndex, updated);
          if (next) {
            setDefIndex(next.nextIndex);
            setTimeout(() => {
              setFeedback(null);
              setCurrentDef(next.def);
            }, 2500);
          } else {
            setCardHistory((prev) => [...prev, { results: currentCardResults, outcome: "failed" }]);
            setTimeout(() => {
              setFeedback(null);
              setCardFailed(true);
              if (isLastCard) setTimeout(() => setGameOver(true), 2000);
              else setTimeout(() => startNewCard(), 2000);
            }, 2500);
          }
        }
        return;
      }

      // --- WRONG NONE ---
      if (cell.word === "None" && isOnCard) {
        setFeedback({ type: "incorrect", answer: currentDef.word });
        playBeep();
        const newResults = { ...currentCardResults, [currentDef.word]: "wrong" };
        setCurrentCardResults(newResults);
        setCells((prev) => {
          const n = [...prev];
          n[4] = { ...n[4], state: "wrong" };
          return n;
        });

        const next = findNextDef(defQueue, defIndex, cells);
        if (next) {
          setDefIndex(next.nextIndex);
          setTimeout(() => {
            setCells((prev) => {
              const n = [...prev];
              n[4] = { ...n[4], state: "default" };
              return n;
            });
            setFeedback(null);
            setCurrentDef(next.def);
          }, 3000);
        } else {
          setCardHistory((prev) => [...prev, { results: newResults, outcome: "failed" }]);
          setTimeout(() => {
            setCells((prev) => {
              const n = [...prev];
              n[4] = { ...n[4], state: "default" };
              return n;
            });
            setFeedback(null);
            setCardFailed(true);
            if (isLastCard) setTimeout(() => setGameOver(true), 2000);
            else setTimeout(() => startNewCard(), 2000);
          }, 3000);
        }
        return;
      }

      // --- CORRECT CELL ---
      if (cell.word === currentDef.word) {
        setFeedback({ type: "correct" });
        const updated = [...cells];
        updated[index] = { ...updated[index], state: "correct" };
        setCells(updated);
        const newResults = { ...currentCardResults, [cell.word]: "correct" };
        setCurrentCardResults(newResults);

        if (isAllCorrect(cardHistory, newResults, words.length)) {
          setCardHistory((prev) => [...prev, { results: newResults, outcome: "bingo" }]);
          setTimeout(() => setGameWon(true), 2500);
        } else if (checkWin(updated)) {
          setCardHistory((prev) => [...prev, { results: newResults, outcome: "bingo" }]);
          setTimeout(() => {
            setFeedback(null);
            setWinMessage(true);
            if (isLastCard) setTimeout(() => setGameOver(true), 2000);
            else setTimeout(() => startNewCard(), 2000);
          }, 2500);
        } else {
          const next = findNextDef(defQueue, defIndex, updated);
          if (next) {
            setDefIndex(next.nextIndex);
            setTimeout(() => {
              setFeedback(null);
              setCurrentDef(next.def);
            }, 2500);
          } else {
            setCardHistory((prev) => [...prev, { results: newResults, outcome: "failed" }]);
            setTimeout(() => {
              setFeedback(null);
              setCardFailed(true);
              if (isLastCard) setTimeout(() => setGameOver(true), 2000);
              else setTimeout(() => startNewCard(), 2000);
            }, 2500);
          }
        }
        return;
      }

      // --- WRONG CELL ---
      setFeedback({ type: "incorrect", answer: currentDef.word });
      playBeep();
      const newResults = { ...currentCardResults, [currentDef.word]: "wrong" };
      setCurrentCardResults(newResults);
      setCells((prev) => {
        const n = [...prev];
        n[index] = { ...n[index], state: "wrong" };
        return n;
      });

      const next = findNextDef(defQueue, defIndex, cells);
      if (next) {
        setDefIndex(next.nextIndex);
        setTimeout(() => {
          setCells((prev) => {
            const n = [...prev];
            n[index] = { ...n[index], state: "default" };
            return n;
          });
          setFeedback(null);
          setCurrentDef(next.def);
        }, 3000);
      } else {
        setCardHistory((prev) => [...prev, { results: newResults, outcome: "failed" }]);
        setTimeout(() => {
          setCells((prev) => {
            const n = [...prev];
            n[index] = { ...n[index], state: "default" };
            return n;
          });
          setFeedback(null);
          setCardFailed(true);
          if (isLastCard) setTimeout(() => setGameOver(true), 2000);
          else setTimeout(() => startNewCard(), 2000);
        }, 3000);
      }
    },
    [cells, currentDef, defQueue, defIndex, currentCardResults, cardHistory, words,
     winMessage, cardFailed, gameWon, gameOver, feedback, startNewCard]
  );

  if (!selectedList) {
    return (
      <div className="app">
        <h1>Vocab Bingo</h1>
        <ListPicker lists={lists} onSelect={setSelectedList} />
      </div>
    );
  }

  const canNewCard = !winMessage && !cardFailed && !gameWon && !gameOver;
  const correctCount = Object.values(wordStatus).filter((s) => s.correct).length;

  return (
    <div className="app">
      <h1>Vocab Bingo</h1>
      <button className="back-btn" onClick={handleBack}>&larr; Back to Lists</button>
      <DefinitionPrompt definition={currentDef} />
      {feedback && (
        <div className="feedback-overlay">
          <div className={`feedback-popup ${feedback.type}`}>
            <div className="feedback-label">
              {feedback.type === "correct" ? "Correct" : "Wrong"}
            </div>
            <div className="feedback-answer">
              {feedback.answer || currentDef?.word}
            </div>
          </div>
        </div>
      )}
      {winMessage && <div className="win-banner">Bingo! New card coming...</div>}
      {cardFailed && <div className="fail-banner">Out of words! New card coming...</div>}
      <div className="game-layout">
        <BingoCard cells={cells} onCellClick={handleCellClick} />
        <Scoreboard
          allWords={words}
          cardHistory={cardHistory}
          currentCardResults={currentCardResults}
          gameOver={gameOver}
          onNewCard={canNewCard ? handleManualNewCard : null}
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
      {gameOver && !gameWon && (
        <div className="game-won-overlay">
          <div className="game-won-modal">
            <h2>Game Over</h2>
            <p>You got {correctCount}/{words.length} words correct.</p>
            <button onClick={resetGame}>Try Again</button>
          </div>
        </div>
      )}
    </div>
  );
}
