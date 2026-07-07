import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import Pagination from "./Pagination";

function SortIcon({ direction }) {
  if (!direction) return (
    <span className="inline-flex flex-col leading-none opacity-30 group-hover:opacity-60 ml-1">
      <svg className="w-3 h-3 -mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
      <svg className="w-3 h-3 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );
  return (
    <span className="inline-flex ml-1">
      {direction === "asc" ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </span>
  );
}

export default function DataTable({
  columns,
  data,
  totalCount = 0,
  pageIndex = 0,
  pageSize = 50,
  isLoading = false,
  onPageChange,
  onSortChange,
  serverSide = false,
  emptyMessage = "No data found",
}) {
  const [sorting, setSorting] = useState([]);

  const tableOptions = {
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: !serverSide || !!onSortChange,
  };

  if (serverSide) {
    tableOptions.state = {
      sorting,
      pagination: { pageIndex, pageSize },
    };
    tableOptions.onSortingChange = (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      if (onSortChange) onSortChange(next);
    };
    tableOptions.manualPagination = true;
    tableOptions.manualSorting = true;
    tableOptions.pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  } else {
    tableOptions.initialState = { pagination: { pageSize } };
    tableOptions.getSortedRowModel = getSortedRowModel();
    tableOptions.getPaginationRowModel = getPaginationRowModel();
  }

  const table = useReactTable(tableOptions);

  const totalPages = serverSide
    ? Math.max(1, Math.ceil(totalCount / pageSize))
    : Math.max(1, Math.ceil(data.length / pageSize));

  const displayTotal = serverSide ? totalCount : data.length;

  const rows = table.getRowModel().rows;
  const headerGroups = table.getHeaderGroups();

  function handlePageChange(p) {
    if (serverSide) {
      if (onPageChange) onPageChange(p);
    } else {
      table.setPageIndex(p - 1);
    }
  }

  const currentPage = serverSide ? pageIndex + 1 : (table.getState().pagination?.pageIndex ?? 0) + 1;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            {headerGroups.map((headerGroup) => (
              <tr key={headerGroup.id} className="text-left text-gray-500 font-medium">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  const isResponsive = header.column.columnDef.meta?.responsive;
                  return (
                    <th
                      key={header.id}
                      className={`px-6 py-3 ${canSort ? "cursor-pointer select-none group" : ""} ${
                        isResponsive ? "hidden md:table-cell" : ""
                      }`}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon direction={sortDir} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="w-6 h-6 border-2 border-shield-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-6 py-4 ${
                        cell.column.columnDef.meta?.responsive ? "hidden md:table-cell" : ""
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        total={displayTotal}
        limit={pageSize}
        onPageChange={handlePageChange}
        loading={isLoading}
      />
    </div>
  );
}
