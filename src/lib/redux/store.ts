import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/auth-slice";

// Session data lives in memory. The HttpOnly cookie and /auth/me are authoritative.
export function createAuthStore() {
  return configureStore({
    reducer: { auth: authReducer },
    devTools: process.env.NODE_ENV !== "production",
  });
}
export type AppStore = ReturnType<typeof createAuthStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
