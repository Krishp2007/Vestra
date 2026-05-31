export default function EmptyState({ icon, title, text, buttonText, onButtonClick }) {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-icon">{icon}</div>
        <div className="empty-state-title">{title}</div>
        <div className="empty-state-text">{text}</div>
        {buttonText && onButtonClick && (
          <button className="btn btn-primary" onClick={onButtonClick}>
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
