export const DATASET_FILE_TYPES = ["CSV", "Excel"] as const;
export type DatasetFileType = (typeof DATASET_FILE_TYPES)[number];

export function datasetFileAccept(types: readonly DatasetFileType[]) {
  return types
    .flatMap((type) =>
      type === "CSV"
        ? [".csv", "text/csv"]
        : [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    )
    .join(",");
}

export function datasetFileRejection(file: File | null, types: readonly DatasetFileType[] = DATASET_FILE_TYPES) {
  if (!file) return "Choose a dataset file.";
  let type: DatasetFileType | null = null;
  if (/\.csv$/i.test(file.name)) type = "CSV";
  else if (/\.xlsx$/i.test(file.name)) type = "Excel";
  if (!type) return "Choose a CSV or Excel (.xlsx) file.";
  if (!types.includes(type)) return `${type} uploads are not allowed by this project's settings.`;
  if (!file.size) return "The file is empty.";
  if (file.size > 50 * 1024 * 1024) return "The file must be no larger than 50 MiB.";
  return null;
}
