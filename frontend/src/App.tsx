import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Vault from "./pages/Vault";
import Settings from "./pages/Settings";
import Generator from "./pages/Generator";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<PublicRoute />}>
					<Route path="/login" element={<Login />} />
					<Route path="/signup" element={<Signup />} />
				</Route>
				<Route element={<ProtectedRoute />}>
					<Route path="/vault" element={<Vault />} />
					<Route path="/generator" element={<Generator />} />
					<Route path="/settings" element={<Settings />} />
				</Route>
				<Route path="/" element={<Navigate to="/login" replace />} />
				<Route path="*" element={<Navigate to="/login" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
