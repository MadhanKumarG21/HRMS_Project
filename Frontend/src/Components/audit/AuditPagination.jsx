import Pagination from "../Pagination.jsx";

export default function AuditPagination({
  current,
  total,
  filtered,
  itemsPerPage,
  onChange,
}) {
  return (
    <Pagination
      page={current}
      totalPages={total}
      itemCount={filtered}
      pageSize={itemsPerPage}
      itemLabel="logs"
      onPageChange={onChange}
    />
  );
}
