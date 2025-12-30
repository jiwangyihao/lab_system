"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconArrowUp,
  IconArrowDown,
  IconArrowsUpDown,
} from "@tabler/icons-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ========== 类型定义 ==========

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  showPagination?: boolean;
  showSearch?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (userInfo: any) => void; // Using any to avoid complex type imports for now, or importing RowSelectionState
  getRowId?: (originalRow: TData, index: number) => string;
}

// ========== 排序表头组件 ==========

interface SortableHeaderProps {
  column: {
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (desc?: boolean) => void;
  };
  children: React.ReactNode;
}

export function SortableHeader({ column, children }: SortableHeaderProps) {
  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="h-8 px-0 hover:bg-transparent"
    >
      {children}
      {sorted === "asc" ? (
        <IconArrowUp className="ml-2 h-4 w-4" />
      ) : sorted === "desc" ? (
        <IconArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <IconArrowsUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}

// ========== 数据表格组件 ==========

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "搜索...",
  pageSize = 10,
  showPagination = true,
  showSearch = true,
  onSelectionChange,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: setControlledRowSelection,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  // Internal state if uncontrolled
  const [internalRowSelection, setInternalRowSelection] = React.useState({});

  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const setRowSelection = setControlledRowSelection ?? setInternalRowSelection;

  const table = useReactTable({
    data,
    columns,
    getRowId, // Support custom ID
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  // Use a ref for the callback to avoid triggering re-renders
  const onSelectionChangeRef = React.useRef(onSelectionChange);
  React.useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  });

  React.useEffect(() => {
    if (onSelectionChangeRef.current) {
      const selectedRows = table
        .getFilteredSelectedRowModel()
        .rows.map((row) => row.original);
      onSelectionChangeRef.current(selectedRows);
    }
    // Only trigger when rowSelection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      {showSearch && searchKey && (
        <div className="flex items-center gap-4">
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="w-full max-w-sm"
          />
        </div>
      )}

      {/* 表格 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {showPagination && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>每页</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>条</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              第 {table.getState().pagination.pageIndex + 1} /{" "}
              {table.getPageCount()} 页
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
