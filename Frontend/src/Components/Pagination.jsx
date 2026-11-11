import Icon from "./Icon.jsx";
import "../styles/Pagination.css";

const getVisiblePages = (page, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  if (page > 3) pages.push("...");

  for (let current = Math.max(2, page - 1); current <= Math.min(totalPages - 1, page + 1); current += 1) {
    pages.push(current);
  }

  if (page < totalPages - 2) pages.push("...");
  pages.push(totalPages);
  return pages;
};

export default function Pagination({
  page,
  totalPages,
  itemCount,
  pageSize,
  itemLabel = "items",
  onPageChange,
}) {
  const count = Math.max(0, Number(itemCount) || 0);
  const pages = Math.max(1, Number(totalPages) || 1);
  const currentPage = Math.min(Math.max(1, Number(page) || 1), pages);
  const size = Math.max(1, Number(pageSize) || 1);

  if (count === 0) return null;

  const firstItem = (currentPage - 1) * size + 1;
  const lastItem = Math.min(currentPage * size, count);

  return (
    <div className="shared-pagination">
      <span className="shared-pagination-summary" aria-live="polite">
        Showing {firstItem}-{lastItem} of {count} {itemLabel}
      </span>

      {pages > 1 && (
        <nav className="shared-pagination-controls" aria-label={`${itemLabel} pagination`}>
          <button
            type="button"
            className="shared-pagination-button"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <Icon name="chevron_left" />
          </button>

          {getVisiblePages(currentPage, pages).map((visiblePage, index) =>
            visiblePage === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="shared-pagination-ellipsis"
                aria-hidden="true"
              >
                ...
              </span>
            ) : (
              <button
                key={visiblePage}
                type="button"
                className={`shared-pagination-button${visiblePage === currentPage ? " active" : ""}`}
                aria-label={`Page ${visiblePage}`}
                aria-current={visiblePage === currentPage ? "page" : undefined}
                onClick={() => onPageChange(visiblePage)}
              >
                {visiblePage}
              </button>
            ),
          )}

          <button
            type="button"
            className="shared-pagination-button"
            aria-label="Next page"
            disabled={currentPage === pages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <Icon name="chevron_right" />
          </button>
        </nav>
      )}
    </div>
  );
}
