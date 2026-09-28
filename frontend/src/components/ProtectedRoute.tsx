import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import Navbar from "./Navbar";

function ProtectedRoute() {
	const accessToken = useAuthStore((state) => state.accessToken);
	const encryptionKey = useAuthStore((state) => state.encryptionKey);
	// Without the key the vault cannot be decrypted: the user has to unlock it again
	if (!accessToken || !encryptionKey) {
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
