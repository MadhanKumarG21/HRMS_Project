import Icon from "../Icon.jsx";

const CATEGORIES = ["HR", "Finance", "IT", "General", "Operations"];

export default function ModuleFilters({
  search, category, status,
  onSearch, onCategory, onStatus, onClear,
  total, filtered,
}) {
  const isDirty = search || category || status;

  return (
    <div className="mf-bar">

      {/* Search */}
      <div className="mf-search-wrap">
       
        <input
          type="text"
          className="mf-search-input"
          placeholder=" 🔍︎ Search by name or label..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Category */}
      <select className="mf-select" value={category} onChange={(e) => onCategory(e.target.value)}>
        <option value="">All Categories</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Status */}
      <select className="mf-select" value={status} onChange={(e) => onStatus(e.target.value)}>
        <option value="">All Status</option>
        <option value="Active">Active</option>
        <option value="Suspended">Suspended</option>
      </select>

      {/* Result count */}
      <span className="mf-count">
        {filtered} of {total} module{total !== 1 ? "s" : ""}
      </span>

      {/* Clear */}
      {isDirty && (
        <button className="mf-clear-btn" onClick={onClear}>
          <Icon name="close" />
          Clear
        </button>
      )}

    </div>
  );
}