// Compact key for the visual encodings that the filter checkboxes don't cover.
export default function Legend() {
  return (
    <section className="filter-group legend">
      <h3>How to read it</h3>
      <ul className="legend-list">
        <li>
          <span className="legend-swatch node-size" /> Node size = number of
          connections
        </li>
        <li>
          <span className="legend-swatch pulse">A<small>a</small></span> Label size
          = pulse (recent news attention)
        </li>
        <li>
          <span className="legend-swatch dashed" /> Dashed = draft / uncurated
        </li>
        <li>
          <span className="legend-swatch arrow">→</span> Arrow = relationship
          direction
        </li>
      </ul>
      <p className="filter-note">
        Click a node to focus its neighborhood; click empty space to reset.
        <strong> Drag</strong> a node to elastically pull its neighbors along. Zoom
        in to reveal more labels — the highest-pulse topics stay legible first.
      </p>
    </section>
  )
}
