import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { fetchAuth } from "@/lib/api/services/fetch-auth";
import { SESSION_INVALID_CODES } from "@/lib/auth/auth-config";
import type { CurrentUser } from "@/lib/auth/types";
import { ApiError } from "@/types/api";

import type { RootState } from "../store";

interface AuthState {
  user: CurrentUser["user"] | null;
  session: CurrentUser["session"] | null;
  memberships: CurrentUser["memberships"];
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  error: string | null;
  requestId: string | null;
}
const initialState: AuthState = {
  user: null,
  session: null,
  memberships: [],
  isAuthenticated: false,
  isLoading: false,
  initialized: false,
  error: null,
  requestId: null,
};

export const restoreSession = createAsyncThunk("auth/restoreSession", async (_, { rejectWithValue, signal }) => {
  try {
    return await fetchAuth.me(signal);
  } catch (error) {
    return rejectWithValue({
      code: error instanceof ApiError ? error.code : "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Unable to load your session.",
    });
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<CurrentUser>) => {
      state.user = action.payload.user;
      state.session = action.payload.session;
      state.memberships = action.payload.memberships;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.initialized = true;
      state.error = null;
      state.requestId = null;
    },
    logout: () => ({ ...initialState, initialized: true }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state, action) => {
        state.isLoading = true;
        state.requestId = action.meta.requestId;
        state.error = null;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.memberships = action.payload.memberships;
        state.isAuthenticated = true;
        state.initialized = true;
        state.isLoading = false;
        state.requestId = null;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.isLoading = false;
        state.initialized = true;
        state.requestId = null;
        if (action.meta.aborted) return;
        if (action.payload && SESSION_INVALID_CODES.includes(action.payload.code)) {
          state.user = null;
          state.session = null;
          state.memberships = [];
          state.isAuthenticated = false;
        } else {
          state.error = action.payload?.message ?? "Unable to load your session.";
        }
      });
  },
});

export const { setSession, logout } = authSlice.actions;
export default authSlice.reducer;
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
