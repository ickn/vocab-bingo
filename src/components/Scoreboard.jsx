export default function Scoreboard({ words, totalWords, cardsPlayed, onNewCard }) {
  return (
    <div className="scoreboard">
      <h2>Correct {words.length}/{totalWords}</h2>
      {words.length === 0 && <p className="empty">No words yet</p>}
      <ul>
        {words.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
      <div className="scoreboard-footer">
        <p>Cards played: {cardsPlayed}</p>
        <button className="new-card-btn" onClick={onNewCard}>New Card</button>
      </div>
    </div>
  );
}
