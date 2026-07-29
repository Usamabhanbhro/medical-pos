


import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/auth_context';

const Login: React.FC = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const { login } = useAuth();
	const [submitting, setSubmitting] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const errorTimerRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (errorTimerRef.current) {
				window.clearTimeout(errorTimerRef.current);
			}
		};
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		try {
			setSubmitting(true);
			await login(email, password);
			// clear any existing error timer if login succeeds
			if (errorTimerRef.current) {
				window.clearTimeout(errorTimerRef.current);
				errorTimerRef.current = null;
			}
		} catch (err: any) {
			// Debug/log the error so we can see unexpected shapes in the console
			console.error('Login attempt failed:', err);
			// Derive a friendly message from several possible fields
			const msg =
				err?.data?.detail ||
				err?.data?.message ||
				err?.message ||
				(typeof err === 'string' ? err : '') ||
				'Login failed';
			setError(String(msg));
			if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
			errorTimerRef.current = window.setTimeout(() => setError(''), 3000);
		}
		finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-green-100">
			<motion.div
				initial={{ opacity: 0, y: 40 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7, type: 'spring' }}
				className="bg-white/90 shadow-2xl rounded-3xl p-8 md:p-12 w-full max-w-md border-t-8 border-blue-400"
			>
				<motion.div
					initial={{ scale: 0.8 }}
					animate={{ scale: 1 }}
					transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
					className="flex flex-col items-center mb-8"
				>
					<svg width="60" height="60" viewBox="0 0 24 24" fill="none" className="mb-2">
						<circle cx="12" cy="12" r="10" fill="#38bdf8" />
						<path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
					</svg>
					<h2 className="text-2xl font-bold text-blue-700">Medical POS Login</h2>
				</motion.div>
				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label className="block text-gray-700 font-semibold mb-1" htmlFor="email">Email</label>
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M3 6.5A2.5 2.5 0 015.5 4h13A2.5 2.5 0 0121 6.5v11A2.5 2.5 0 0118.5 20h-13A2.5 2.5 0 013 18.5v-12z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
									<path d="M3.5 6.75l8.5 5 8.5-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
							<input
								id="email"
								type="email"
								autoComplete="username"
								className="w-full pl-10 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-300 focus:outline-none transition"
								value={email}
								onChange={e => setEmail(e.target.value)}
								required
							/>
						</div>
					</div>
					<div>
						<label className="block text-gray-700 font-semibold mb-1" htmlFor="password">Password</label>
						<div className="relative">
							<input
								id="password"
								type={showPassword ? 'text' : 'password'}
								autoComplete="current-password"
								className="w-full pr-10 pl-10 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-300 focus:outline-none transition"
								value={password}
								onChange={e => setPassword(e.target.value)}
								required
							/>
							<button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(s => !s)} className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-gray-700 transition">
								{showPassword ? (
									<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M13.875 18.825A10.05 10.05 0 0112 19.5c-5.25 0-9.375-4.5-9.375-7.5 0-1.05.375-2.025 1.05-2.85M21 21L3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
										<path d="M10.59 10.59a3 3 0 104.82 4.82" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								) : (
									<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M1.5 12s4.5-7.5 10.5-7.5S22.5 12 22.5 12 18 19.5 12 19.5 1.5 12 1.5 12z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
										<circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.2" />
									</svg>
								)}
							</button>
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M16 11a4 4 0 11-8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
									<path d="M12 15v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
						</div>
					</div>
					{error && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="text-red-500 text-sm text-center"
							role="alert"
						>
							{error}
						</motion.div>
					)}
					<motion.button
						whileHover={{ scale: 1.04 }}
						whileTap={{ scale: 0.98 }}
						type="submit"
						disabled={submitting}
						className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{submitting ? (
							<span className="flex items-center justify-center">
								<svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
								</svg>
								Logging in...
							</span>
						) : (
							'Login'
						)}
					</motion.button>
				</form>
			</motion.div>
		</div>
	);
};



export default Login;
