import { read, utils, type WorkBook } from "xlsx";

import type { ExcelPreviewRequest, ExcelPreviewResponse, FilePreviewTable } from "./project-file-preview-types";

let workbook: WorkBook | undefined;

function previewSheet(index: number): FilePreviewTable {
  const sheet = workbook?.Sheets[workbook.SheetNames[index]];
  if (!sheet?.["!ref"]) return { headers: [], rows: [], firstRow: 1 };
  const range = utils.decode_range(sheet["!ref"]);
  range.e.r = Math.min(range.e.r, range.s.r + 99);
  range.e.c = Math.min(range.e.c, range.s.c + 49);
  return {
    headers: Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) => utils.encode_col(range.s.c + index)),
    rows: utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "", blankrows: true, range }),
    firstRow: range.s.r + 1,
  };
}

function reply(response: ExcelPreviewResponse) {
  self.postMessage(response);
}

self.onmessage = (event: MessageEvent<ExcelPreviewRequest>) => {
  try {
    if (event.data.type === "load") {
      workbook = read(event.data.buffer, {
        type: "array",
        dense: true,
        sheetRows: 100,
        cellHTML: false,
        cellFormula: false,
        cellStyles: false,
      });
      reply({ type: "ready", sheets: workbook.SheetNames, index: 0, table: previewSheet(0) });
    } else {
      reply({ type: "sheet", index: event.data.index, table: previewSheet(event.data.index) });
    }
  } catch {
    reply({ type: "error" });
  }
};
