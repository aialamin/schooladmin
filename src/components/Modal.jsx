export default function Modal({ children, onClose, title }) {
  return (
    <div className="modal-backdrop">
      <section className="modal-card">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn soft" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
