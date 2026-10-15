import React from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";

export const AdminTable = ({
  columns,
  data = [],
  keyField = "id",
  isLoading = false,
  emptyMessage = "No records found.",
  selectedIds = [],
  onSelectAll,
  onSelectRow,
  selectable = false,
  pagination = null,
}) => {
  const allSelected =
    selectable &&
    data.length > 0 &&
    data.every((item) => selectedIds.includes(item[keyField]));

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm text-stone-700">
          <thead className="bg-stone-50/80 text-xs font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200">
            <tr>
              {selectable && (
                <th scope="col" className="w-10 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`px-4 py-3.5 font-semibold ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  } ${col.headerClassName || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center text-stone-500"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#173D2A] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium">Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center text-stone-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 stroke-1 text-stone-400" />
                    <span className="text-xs font-medium">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const isRowSelected = selectedIds.includes(row[keyField]);
                return (
                  <tr
                    key={row[keyField] || rowIndex}
                    className={`hover:bg-stone-50/80 transition-colors ${
                      isRowSelected ? "bg-emerald-50/40" : ""
                    }`}
                  >
                    {selectable && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={(e) =>
                            onSelectRow?.(row[keyField], e.target.checked)
                          }
                          className="h-4 w-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                        />
                      </td>
                    )}
                    {columns.map((col, colIndex) => (
                      <td
                        key={colIndex}
                        className={`px-4 py-3.5 text-stone-700 align-middle ${
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        } ${col.cellClassName || ""}`}
                      >
                        {col.render
                          ? col.render(row, rowIndex)
                          : row[col.accessor]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-4 text-xs text-stone-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-stone-800">
              {(pagination.currentPage - 1) * pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-stone-800">
              {Math.min(
                pagination.currentPage * pagination.pageSize,
                pagination.totalItems
              )}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-stone-800">
              {pagination.totalItems}
            </span>{" "}
            entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() =>
                pagination.onPageChange(pagination.currentPage - 1)
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="px-3 py-1.5 font-medium text-stone-700 bg-stone-100 rounded-md">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() =>
                pagination.onPageChange(pagination.currentPage + 1)
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

