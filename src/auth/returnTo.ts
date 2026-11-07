export function getSafeReturnTo(value: string | null): string | null {
	if (
		!value ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.includes("\\")
	) {
		return null;
	}

	try {
		const url = new URL(value, window.location.origin);

		if (
			url.origin !== window.location.origin ||
			url.pathname === "/login" ||
			url.pathname === "/callback"
		) {
			return null;
		}

		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return null;
	}
}

export function createLoginUrl(returnTo: string | null): string {
	const safeReturnTo = getSafeReturnTo(returnTo);
	if (!safeReturnTo) {
		return "/login";
	}

	const params = new URLSearchParams({ returnTo: safeReturnTo });
	return `/login?${params.toString()}`;
}
