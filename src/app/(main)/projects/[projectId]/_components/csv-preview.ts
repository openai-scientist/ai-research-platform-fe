// CSV quoting includes escaped quotes, embedded commas and line breaks.
export function previewRows(text: string, delimiter: string, complete = true) {
  const csv = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < csv.length && rows.length < 101; i++) {
    const character = csv[i];
    if (character === '"') {
      if (quoted && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && csv[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (complete && rows.length < 101 && (cell || row.length)) rows.push([...row, cell]);
  return rows.map((values) => values.slice(0, 50));
}
