export default function BingoCard({ cells, onCellClick }) {
  return (
    <div className="bingo-card">
      {cells.map((cell, i) => (
        <button
          key={i}
          className={`bingo-cell ${cell.state}`}
          onClick={() => onCellClick(i)}
          disabled={cell.state === "correct" && cell.word !== "None"}
        >
          {cell.word}
        </button>
      ))}
    </div>
  );
}
