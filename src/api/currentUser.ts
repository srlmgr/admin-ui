import { getConfig } from "@/config";
import type { User } from "@/store/slices/authSlice";

export interface CurrentUserResult {
	status: number;
	user: User | null;
}

interface CurrentUserResponse {
	id: string;
	name: string;
	firstName?: string;
	lastName?: string;
	email?: string;
}

export async function fetchCurrentUser(): Promise<CurrentUserResult> {
	const config = getConfig();
	const response = await fetch(`${config.apiUrl}/currentuser`, {
		method: "GET",
		credentials: "include",
	});

	if (response.status !== 200) {
		return {
			status: response.status,
			user: null,
		};
	}

	const userData = (await response.json()) as CurrentUserResponse;

	return {
		status: response.status,
		user: {
			id: userData.id,
			name: userData.name,
			firstName: userData.firstName,
			lastName: userData.lastName,
			email: userData.email,
		},
	};
}
