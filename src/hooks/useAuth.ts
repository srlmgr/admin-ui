import { RootState } from "@/store";
import type { User } from "@/store/slices/authSlice";
import { clearUser, setUser } from "@/store/slices/authSlice";
import { useDispatch, useSelector } from "react-redux";

export const useAuth = () => {
	const dispatch = useDispatch();
	const { user, isLoading, error } = useSelector(
		(state: RootState) => state.auth,
	);

	return {
		user,
		isLoading,
		error,
		login: (userData: User) => dispatch(setUser(userData)),
		logout: () => dispatch(clearUser()),
	};
};
