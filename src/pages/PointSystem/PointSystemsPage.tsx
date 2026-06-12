import { Navigate } from "react-router-dom";

// Redirect to the manage page
export function PointSystemsPage() {
	return <Navigate to="/point-systems/manage" replace />;
}
