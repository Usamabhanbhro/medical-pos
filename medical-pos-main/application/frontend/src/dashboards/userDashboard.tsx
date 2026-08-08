import { useState } from 'react';
import { useAuth } from '../context/use_auth';
import Checkout from './sidebars/checkout';
import UserSettings from './sidebars/userSettings';
import UserPatientHistory from './sidebars/userPatientHistory';
import UserLedger from './sidebars/userLedger';

const tabs = [
	{ name: 'Checkout', key: 'checkout', icon: IconShoppingCart },
	{ name: 'Patient History', key: 'patients', icon: IconUser },
	{ name: 'Ledger', key: 'ledger', icon: IconMoney},
	{ name: 'Settings', key: 'settings', icon: IconCog },
];

function IconShoppingCart(props: { className?: string }) {
	return (
		<svg className={props.className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4" />
			<circle cx="9" cy="19" r="1" />
			<circle cx="20" cy="19" r="1" />
		</svg>
	);
}

function IconUser(props: { className?: string }) {
	return (
		<svg className={props.className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
		</svg>
	);
}

function IconCog(props: { className?: string }) {
	return (
		<svg className={props.className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
	);
}

function IconMoney(props: { className?: string }) {
	return (
		<svg className={props.className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
		</svg>
	);
}

function IconLogout(props: { className?: string }) {
	return (
		<svg className={props.className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4-4-4" />
			<path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 12H9" />
			<path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M13 19H6a2 2 0 01-2-2V7a2 2 0 012-2h7" />
		</svg>
	);
}

const UserDashboard = () => {
	const [activeTab, setActiveTab] = useState('checkout');
	const [collapsed, setCollapsed] = useState<boolean>(() => {
		try {
			const v = localStorage.getItem('mp_sidebar_collapsed');
			return v === '1';
		} catch {
			return false;
		}
	});

	const toggleCollapsed = () => {
		try {
			localStorage.setItem('mp_sidebar_collapsed', collapsed ? '0' : '1');
		} catch {
		// Storage may be unavailable in restricted browser contexts.
	}
		setCollapsed(s => !s);
	};

	// get auth once at top-level of component to follow Rules of Hooks
	const auth = useAuth();
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

	return (
		<div className="flex min-h-[80vh]">
			{/* Sidebar */}
			<aside className={`flex flex-col bg-gradient-to-b from-blue-50 to-white border-r border-gray-200 shadow-sm p-2 transition-all ${collapsed ? 'w-20' : 'w-56'}`}>
				<div className="flex items-center justify-between mb-4 px-2">
					<div>
						<div className="text-xs text-gray-500 uppercase tracking-wide">User</div>
						{!collapsed && <div className="text-lg font-semibold text-gray-800">Point of Sale</div>}
					</div>
					<button
						onClick={toggleCollapsed}
						aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
						className="p-1 rounded hover:bg-gray-100"
						title={collapsed ? 'Expand' : 'Collapse'}
					>
						<svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							{collapsed ? (
								<path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
							) : (
								<path d="M4 6h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
							)}
						</svg>
					</button>
				</div>
			<nav className="flex-1 space-y-2 px-1">
					{tabs.map(tab => (
						<div key={tab.key} className="group">
							<button
								onClick={() => setActiveTab(tab.key)}
								title={tab.name}
								className={`flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-r-lg transition w-full text-left ${
									activeTab === tab.key ? 'bg-white shadow text-blue-600' : 'text-gray-700 hover:bg-blue-50'
								}`}
							>
								<tab.icon className="w-5 h-5" />
								{!collapsed && <span>{tab.name}</span>}
							</button>
						</div>
					))}
						</nav>

						<div className="mt-4 px-2">
							{collapsed ? (
								<button
									title="Logout"
									onClick={() => setShowLogoutConfirm(true)}
									className="w-10 h-10 flex items-center justify-center rounded-md bg-white shadow"
								>
									<IconLogout className="w-5 h-5 text-gray-700" />
								</button>
							) : (
								<button
									onClick={() => setShowLogoutConfirm(true)}
									className="w-full inline-flex items-center gap-2 justify-center bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-3 py-2 rounded-md shadow"
								>
									<IconLogout className="w-4 h-4" />
									<span className="font-medium">Logout</span>
								</button>
							)}
						</div>
			</aside>

			{showLogoutConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40" onClick={() => setShowLogoutConfirm(false)} />
					<div className="bg-white rounded shadow p-6 z-10 w-full max-w-sm">
						<h3 className="text-lg font-semibold mb-2">Confirm logout</h3>
						<p className="text-sm text-gray-600 mb-4">Are you sure you want to logout?</p>
						<div className="flex justify-end gap-3">
							<button className="px-3 py-2 rounded" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
							<button
								className="px-3 py-2 rounded bg-red-500 text-white"
								onClick={async () => {
									await auth.logout();
									setShowLogoutConfirm(false);
								}}
							>
								Logout
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Main Content */}
			<div className="flex-1">
				{activeTab === 'checkout' && <Checkout />}
				{activeTab === 'patients' && <UserPatientHistory />}
				{activeTab === 'ledger' && <UserLedger />}
				{activeTab === 'settings' && <UserSettings />}
			</div>
		</div>
	);
};

export default UserDashboard;
