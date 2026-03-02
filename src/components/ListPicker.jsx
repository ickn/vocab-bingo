export default function ListPicker({ lists, onSelect }) {
  return (
    <div className="list-picker">
      <h2>Choose a Word List</h2>
      <div className="list-picker-grid">
        {lists.map((list) => (
          <button
            key={list.id}
            className="list-picker-card"
            onClick={() => onSelect(list)}
          >
            <span className="list-picker-name">{list.name}</span>
            <span className="list-picker-count">{list.words.length} words</span>
          </button>
        ))}
      </div>
    </div>
  );
}
