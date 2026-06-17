import axios from "axios";
import { useAuthStore } from "../store/authStore";

const client = axios.create({
	baseURL: "/api",
});

client.interceptors.request.use((config) => {
	const accessToken = useAuthStore.getState().accessToken;
	if (accessToken) {
		config.headers.Authorization = `Bearer ${accessToken}`;
	}
	return config;
});

client.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;
		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true;
			try {
				const refreshToken = useAuthStore.getState().refreshToken;
				const { data } = await axios.post("/api/auth/refresh", {
					refreshToken,
				});
				useAuthStore
					.getState()
					.setAuth(
						useAuthStore.getState().encryptionKey,
						data.accessToken,
						data.refreshToken,
					);
				originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
				return client(originalRequest);
			} catch {
				useAuthStore.getState().clearAuth();
				return Promise.reject(error);
			}
		}
		return Promise.reject(error);
	},
);

export default client;
