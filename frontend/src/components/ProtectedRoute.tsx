import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore, selectIsLocked } from "../store/authStore";
import Navbar from "./Navbar";
import Unlock from "./Unlock";
import Toaster from "./Toaster";
import { useAutoLock } from "../hooks/useAutoLock";

function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isLocked = useAuthStore(selectIsLocked);
  useAutoLock(Boolean(accessToken) && !isLocked);
  // No session at all: a full login is needed
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  // Session alive but key gone: the master password alone is enough
  if (isLocked) {
    return <Unlock />;
  }
  return (
    <>
      <Navbar />
      <Outlet />
      <Toaster />
    </>
  );
}

export default ProtectedRoute;
