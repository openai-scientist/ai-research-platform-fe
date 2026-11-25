"use client";

import { createContext, useContext } from "react";

/** Whether the Platform applies a field of the open section; a row for a field it does not apply is not shown. */
const FieldSupport = createContext<(field: string) => boolean>(() => true);

export const FieldSupportProvider = FieldSupport.Provider;

/** True when a row has no field, or its field is applied. */
export function useFieldShown(field?: string) {
  const supported = useContext(FieldSupport);
  return field === undefined || supported(field);
}
