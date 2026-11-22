/** A label for UI; the original name still identifies the column in the run. */
export function displayFieldName(name: string): string {
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(name)) return name;
  return name[0].toUpperCase() + name.slice(1).replace(/_id$/, " identifier").replaceAll("_", " ");
}
