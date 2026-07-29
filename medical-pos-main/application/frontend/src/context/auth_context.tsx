
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { validateSession, login as apiLogin, logout as apiLogout } from '../routes/api';
import type { User } from '../routes/api';

interface AuthContextType {
	user: User | null;
	loading: boolean;
	login: (username: string, password: string) => Promise<void>;
	logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const logoutTimer = useRef<number | null>(null);

	const clearLogoutTimer = () => {
		if (logoutTimer.current) {
			window.clearTimeout(logoutTimer.current);
			logoutTimer.current = null;
		}
	};

	const saveExpToStorage = (exp?: number) => {
		try {
			if (exp) {
				localStorage.setItem('mp_session_exp', String(exp));
			} else {
				localStorage.removeItem('mp_session_exp');
			}
		} catch {}
	};

	const setAutoLogout = (exp?: number) => {
		clearLogoutTimer();
		if (!exp) return;
		const msUntilExpiry = exp * 1000 - Date.now();
		if (msUntilExpiry <= 0) {
			// Already expired
			logout();
			return;
		}
		logoutTimer.current = window.setTimeout(() => {
			logout();
		}, msUntilExpiry);
	};

	useEffect(() => {
		// On mount, restore any saved expiry so the auto-logout timer continues
		// even if the tab was closed and reopened.
		try {
			const saved = localStorage.getItem('mp_session_exp');
			if (saved) {
				const savedExp = Number(saved);
				if (!Number.isNaN(savedExp)) {
					// If it's already expired, remove it. Otherwise start timer immediately.
					if (savedExp * 1000 - Date.now() <= 0) {
						localStorage.removeItem('mp_session_exp');
					} else {
						setAutoLogout(savedExp);
					}
				}
			}
		} catch {}

		// Then validate session with backend to sync state and get fresh exp
		(async () => {
			setLoading(true);
			const sessionUser = await validateSession();
			setUser(sessionUser);
			setLoading(false);
			if (sessionUser?.exp) {
				setAutoLogout(sessionUser.exp);
				saveExpToStorage(sessionUser.exp);
			}
		})();
	}, []);

	const login = async (username: string, password: string) => {
		// Do not toggle global `loading` here. `loading` is used for initial
		// session validation on mount. Per-attempt submit state should be
		// handled by the caller (e.g. Login component) to avoid unmounting the
		// login form while an attempt is in progress which can cause error
		// messages to be lost.
		const data = await apiLogin(username, password);
		setUser(data);
		if ((data as User).exp) {
			setAutoLogout((data as User).exp);
			saveExpToStorage((data as User).exp);
		}
		return data;
	};

		const logout = async () => {
			await apiLogout();
			clearLogoutTimer();
			saveExpToStorage(undefined);
			setUser(null);
			window.location.reload();
		};

	return (
		<AuthContext.Provider value={{ user, loading, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}
