'use client';

import * as React from 'react';
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
} from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * 数据表格配置
 */
interface DataTableConfig<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchColumn?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  enableRowSelection?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
}

/**
 * 数据表格组件
 *
 * 基于 TanStack Table 的强大数据表格，支持：
 * - 排序
 * - 筛选
 * - 分页
 * - 列显示/隐藏
 * - 行选择（批量操作）
 * - 搜索
 *
 * @example
 * ```tsx
 * const columns: ColumnDef<Course>[] = [
 *   { accessorKey: 'title', header: '课程标题' },
 *   { accessorKey: 'is_published', header: '状态' },
 * ];
 *
 * <DataTable
 *   columns={columns}
 *   data={courses}
 *   searchColumn="title"
 *   searchPlaceholder="搜索课程..."
 *   pageSize={20}
 *   enableRowSelection={true}
 *   onSelectionChange={(selected) => console.log(selected)}
 * />
 * ```
 */
export function DataTable<TData>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = '搜索...',
  pageSize = 10,
  enableRowSelection = false,
  onSelectionChange,
}: DataTableConfig<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      setRowSelection(updater);
      if (onSelectionChange) {
        const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
        onSelectionChange(selectedRows as TData[]);
      }
    },
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

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {searchColumn && (
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''}
              onChange={(event) => table.getColumn(searchColumn)?.setFilterValue(event.target.value)}
              className="max-w-sm"
            />
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              列显示 <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 表格 */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {enableRowSelection && (
                  <th className="h-10 px-4 text-left align-middle w-[40px]">
                    <Checkbox
                      checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                      }
                      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                      aria-label="全选"
                    />
                  </th>
                )}
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
                        header.column.getCanSort() && 'cursor-pointer hover:text-foreground select-none'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="ml-2 text-xs">
                          {header.column.getIsSorted() === 'asc'
                            ? '↑'
                            : header.column.getIsSorted() === 'desc'
                              ? '↓'
                              : '↕'}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  {enableRowSelection && (
                    <td className="p-4">
                      <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="选择行"
                      />
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          共 {table.getFilteredRowModel().rows.length} 条记录，
          已选择 {table.getFilteredSelectedRowModel().rows.length} 项
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}
