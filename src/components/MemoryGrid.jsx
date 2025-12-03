import "./MemoryGrid.css";

export default function MemoryGrid() {
  const cards = Array.from({ length: 16 }, (_, i) => i);

  return (
    <div className="memory-grid">
      {cards.map((card) => (
        <div key={card} className="memory-card">
          {card}
        </div>
      ))}
    </div>
  );
}
