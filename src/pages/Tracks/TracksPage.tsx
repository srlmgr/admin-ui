import { Navigate } from "react-router-dom";

// Redirect to the manage page
export function TracksPage() {
	return <Navigate to="/tracks/manage" replace />;
}
