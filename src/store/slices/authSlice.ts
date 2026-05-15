import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface User {
	id: string;
	name: string;
	firstName?: string;
	lastName?: string;
	email?: string;
}

interface AuthState {
	user: User | null;
	isLoading: boolean;
	error: string | null;
}

const initialState: AuthState = {
	user: null,
	isLoading: false,
	error: null,
};

const authSlice = createSlice({
	name: "auth",
	initialState,
	reducers: {
		setUser: (state: AuthState, action: PayloadAction<User>) => {
			state.user = action.payload;
			state.error = null;
		},
		clearUser: (state: AuthState) => {
			state.user = null;
			state.error = null;
		},
		setLoading: (state: AuthState, action: PayloadAction<boolean>) => {
			state.isLoading = action.payload;
		},
		setError: (state: AuthState, action: PayloadAction<string>) => {
			state.error = action.payload;
		},
	},
});

export const { setUser, clearUser, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
