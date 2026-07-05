import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function PublicRoute() {
	const accessToken = useAuthStore((state) => state.accessToken);
	if (accessToken) {
		return <Navigate to="/vault" replace />;
	}
	return <Outlet />;
}

export default PublicRoute;
