export interface FilePreviewTable {
  headers: string[];
  rows: string[][];
  firstRow: number;
}

export type ExcelPreviewRequest = { type: "load"; buffer: ArrayBuffer } | { type: "sheet"; index: number };

export type ExcelPreviewResponse =
  | { type: "ready"; sheets: string[]; index: number; table: FilePreviewTable }
  | { type: "sheet"; index: number; table: FilePreviewTable }
  | { type: "error" };
