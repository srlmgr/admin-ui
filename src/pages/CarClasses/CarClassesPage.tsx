import { Navigate } from "react-router-dom";

// Redirect to the manage page
export function CarClassesPage() {
	return <Navigate to="/car-classes/manage" replace />;
}
