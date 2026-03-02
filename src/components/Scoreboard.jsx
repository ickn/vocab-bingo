export default function Scoreboard({ allWords, cardHistory, currentCardResults, gameOver, onNewCard }) {
  const sorted = [...allWords].sort((a, b) => a.word.localeCompare(b.word));
  const currentCardIndex = cardHistory.length;

  const correctWords = new Set();
  for (const card of cardHistory) {
    for (const [word, result] of Object.entries(card.results)) {
      if (result === "correct") correctWords.add(word);
    }
  }
  for (const [word, result] of Object.entries(currentCardResults)) {
    if (result === "correct") correctWords.add(word);
  }

  function getStarClass(i) {
    if (i < cardHistory.length) {
      return cardHistory[i].outcome === "bingo" ? "star-bingo" : "star-failed";
    }
    if (i === currentCardIndex && !gameOver) return "star-current";
    return "star-empty";
  }

  function getResult(word, i) {
    if (i < cardHistory.length) {
      return cardHistory[i].results[word] || null;
    }
    if (i === currentCardIndex && !gameOver) {
      return currentCardResults[word] || null;
    }
    return null;
  }

  return (
    <div className="scoreboard">
      <h2>Progress {correctWords.size}/{allWords.length}</h2>
      <table className="score-table">
        <thead>
          <tr>
            <th></th>
            {[0, 1, 2, 3, 4].map((i) => (
              <th key={i} className="star-header">
                <span className={`star ${getStarClass(i)}`}>{"\u2605"}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((w) => (
            <tr key={w.word} className={correctWords.has(w.word) ? "word-correct" : ""}>
              <td className="word-cell">{w.word}</td>
              {[0, 1, 2, 3, 4].map((i) => {
                const result = getResult(w.word, i);
                return (
                  <td key={i} className="result-cell">
                    {result === "correct" && <span className="correct-check">{"\u2713"}</span>}
                    {result === "wrong" && <span className="miss-x">{"\u2717"}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {onNewCard && (
        <div className="scoreboard-footer">
          <button className="new-card-btn" onClick={onNewCard}>New Card</button>
        </div>
      )}
    </div>
  );
}
