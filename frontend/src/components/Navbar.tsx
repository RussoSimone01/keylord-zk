import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function Navbar() {
	const clearAuth = useAuthStore((state) => state.clearAuth);
	const navigate = useNavigate();

	function handleClick() {
		clearAuth();
		navigate("/login");
	}

	return (
		<div>
			<Link to="/vault">Vault</Link>
			<Link to="/settings">Settings</Link>
			<button type="button" onClick={handleClick}>
				Logout
			</button>
		</div>
	);
}

export default Navbar;
