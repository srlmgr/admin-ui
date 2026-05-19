import { Navigate } from "react-router-dom";

// Redirect to the manage page
export function CarsPage() {
	return <Navigate to="/cars/manage" replace />;
}
