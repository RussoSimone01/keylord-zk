import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import Navbar from "./Navbar";

function ProtectedRoute() {
	const accessToken = useAuthStore((state) => state.accessToken);
	if (!accessToken) {
		return <Navigate to="/login" replace />;
	}
	return (
		<>
			<Navbar />
			<Outlet />
		</>
	);
}

export default ProtectedRoute;
