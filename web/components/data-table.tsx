"use client";

// The one table used across the dashboard: an MUI table styled like the
// iGrant console - grey header row, hairline grid, ellipsised cells with the
// full value on hover, and MUI pagination. Tables stand on their own (no
// surrounding card).
import type { ReactNode } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { Tip } from "@/components/tip";

export interface DataColumn<T> {
  key: string;
  header?: ReactNode;
  render: (row: T) => ReactNode;
  /** Fixed or percentage width; the table uses a fixed layout so every page renders identically. */
  width?: number | string;
  align?: "left" | "right" | "center";
  /** Clamp to one line with an ellipsis (default). Switch off for badges, buttons and selects. */
  ellipsis?: boolean;
  /** Full value shown in the hover tooltip; string cell content is used automatically. */
  title?: (row: T) => string | undefined;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowTitle?: string;
  /** Below this width the container scrolls horizontally instead of squashing columns. */
  minWidth?: number;
  pagination?: {
    page: number; // 1-indexed, matching the rest of the app
    pageSize: number;
    total: number;
    onPage: (page: number) => void;
  };
}

const headerCellSx = {
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-ink, #1d1d1f)",
  backgroundColor: "#f5f5f7",
  borderBottom: "1px solid #e0e0e0",
  padding: "10px 16px",
  whiteSpace: "nowrap" as const,
};

const bodyCellSx = {
  fontFamily: "inherit",
  fontSize: 14,
  color: "inherit",
  borderBottom: "1px solid #ececec",
  padding: "10px 16px",
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowTitle,
  minWidth = 720,
  pagination,
}: DataTableProps<T>) {
  return (
    <div>
      <TableContainer
        sx={{
          border: "1px solid #e0e0e0",
          borderRadius: "10px",
          backgroundColor: "#fff",
        }}
      >
        <Table sx={{ minWidth, tableLayout: "fixed", fontFamily: "inherit" }}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  align={c.align ?? "left"}
                  sx={{ ...headerCellSx, width: c.width }}
                >
                  {c.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const cells = columns.map((c) => {
                const content = c.render(row);
                const clamp = c.ellipsis !== false;
                const hover =
                  c.title?.(row) ??
                  (clamp && (typeof content === "string" || typeof content === "number")
                    ? String(content)
                    : undefined);
                return (
                  <TableCell
                    key={c.key}
                    align={c.align ?? "left"}
                    sx={{
                      ...bodyCellSx,
                      ...(clamp
                        ? {
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }
                        : {}),
                    }}
                  >
                    {hover ? (
                      // Every hover detail rides the one shared tooltip. The
                      // anchor is inline-block, so the bubble centres on the
                      // text itself rather than on the full-width cell.
                      <Tip content={hover}>
                        <span
                          className={
                            clamp ? "inline-block max-w-full truncate align-bottom" : undefined
                          }
                        >
                          {content}
                        </span>
                      </Tip>
                    ) : (
                      content
                    )}
                  </TableCell>
                );
              });
              const tr = (
                <TableRow
                  key={rowKey(row)}
                  hover={Boolean(onRowClick)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{
                    cursor: onRowClick ? "pointer" : undefined,
                    "&:last-child td": { borderBottom: "none" },
                  }}
                >
                  {cells}
                </TableRow>
              );
              // A row is a wide anchor; the bubble follows the pointer so it
              // never floats far from where the user is hovering.
              return onRowClick && rowTitle ? (
                <Tip key={rowKey(row)} content={rowTitle} followCursor>
                  {tr}
                </Tip>
              ) : (
                tr
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination && pagination.total > pagination.pageSize && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={(_, p) => pagination.onPage(p + 1)}
          rowsPerPage={pagination.pageSize}
          rowsPerPageOptions={[pagination.pageSize]}
          sx={{
            fontFamily: "inherit",
            "& .MuiTablePagination-toolbar, & .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel":
              { fontFamily: "inherit", fontSize: 13 },
          }}
        />
      )}
    </div>
  );
}
