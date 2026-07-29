import { useState } from 'react';
import { useAuth } from '../context/auth_context';
import Settings from './sidebars/settings';
import Items from './sidebars/items';
import Checkout from './sidebars/checkout';
import PatientHistory from './sidebars/patientHistory';
import Doctors from './sidebars/docktors';
import Sales from './sidebars/sales';
import UserManagement from './sidebars/userManagement';
import Ledger from './sidebars/ledger';

const tabs = [
	{ name: 'Checkout', key: 'checkout', icon: IconShoppingCart },
	{ name: 'Patient History', key: 'patientHistory', icon: IconUser },
	{ name: 'Examination', key: 'sales', icon: IconChart },
	{ name: 'Inventory', key: 'inventory', icon: IconBoxes },
	{ name: 'Doctors', key: 'doctors', icon: IconStethoscope },
	{ name: 'Ledger', key: 'ledger', icon: IconMoney },
	{ name: 'User Management', key: 'userManagement', icon: IconUsers },
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

function IconStethoscope(props: { className?: string }) {
	return (
		<svg className={props.className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
		</svg>
	);
}

function IconChart(props: { className?: string }) {
	return (
		<svg className={props.className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3v18M4 12h6m-6 4h12" />
		</svg>
	);
}

function IconBoxes(props: { className?: string }) {
	return (
		<svg className={props.className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7l9-4 9 4-9 4-9-4z" />
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 17l9-4 9 4" />
		</svg>
	);
}

function IconCog(props: { className?: string }) {
	return (
		<svg className={props.className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.5 3.5l1 0M5 12h14M12 5v14" />
		</svg>
	);
}

function IconUsers(props: { className?: string }) {
	return (
		<svg className={props.className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
			<circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 21v-2a3 3 0 0 0-3-3h-1" />
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 8a3 3 0 1 0-6 0" />
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

function IconUser(props: { className?: string }) {
	return (
		<svg className={props.className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

// NavItem removed; using inline buttons for sidebar items

const AdminDashboard = () => {
	const [activeTab, setActiveTab] = useState('checkout');
	const [collapsed, setCollapsed] = useState<boolean>(() => {
		try {
			const v = localStorage.getItem('mp_sidebar_collapsed');
			return v === '1';
		} catch {
			return false;
		}
	});

	// get auth once at top-level of component to follow Rules of Hooks
	const auth = useAuth();
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

	const toggleCollapsed = () => {
		try {
			localStorage.setItem('mp_sidebar_collapsed', collapsed ? '0' : '1');
		} catch {}
		setCollapsed(s => !s);
	};

	return (
		<div className="flex min-h-[80vh]">
			{/* Sidebar */}
			<aside className={`flex flex-col bg-gradient-to-b from-blue-50 to-white border-r border-gray-200 shadow-sm p-2 transition-all duration-300 ease-in-out ${collapsed ? 'w-20' : 'w-56'}`}>
				<div className="flex items-center justify-between mb-4 px-2">
					<div>
						<div className="text-xs text-gray-500 uppercase tracking-wide">Admin</div>
						{!collapsed && <div className="text-lg font-semibold text-gray-800">Control Panel</div>}
					</div>
					<button
						onClick={toggleCollapsed}
						aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
						className="p-1 rounded hover:bg-gray-200 hover:scale-110 transition-all duration-200"
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
								className={`flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-r-lg transition-all duration-200 w-full text-left hover:scale-105 hover:shadow-md ${
									activeTab === tab.key ? 'bg-white shadow text-blue-600' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
								}`}
							>
								<tab.icon className="w-5 h-5" />
								{!collapsed && <span>{tab.name}</span>}
							</button>
						</div>
					))}
						</nav>

						{/* Sidebar footer: logout */}
						<div className="mt-4 px-2">
							{collapsed ? (
								<button
									title="Logout"
									onClick={() => setShowLogoutConfirm(true)}
									className="w-10 h-10 flex items-center justify-center rounded-md bg-white shadow hover:shadow-lg hover:scale-110 transition-all duration-200"
								>
									<IconLogout className="w-5 h-5 text-gray-700" />
								</button>
							) : (
								<button
									onClick={() => setShowLogoutConfirm(true)}
									className="w-full inline-flex items-center gap-2 justify-center bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-3 py-2 rounded-md shadow hover:shadow-lg hover:scale-105 transition-all duration-200"
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
			<div className="flex-1 p-8">
				<div className="bg-white rounded shadow-sm p-6">
					{activeTab === 'checkout' && (
						<Checkout />
					)}
					{activeTab === 'patientHistory' && (
						<PatientHistory />
					)}
					{activeTab === 'sales' && (
						<div>
							<Sales />
						</div>
					)}
					{activeTab === 'inventory' && (
						<div>
							<Items />
						</div>
					)}
					{activeTab === 'doctors' && (
						<div>
							<Doctors />
						</div>
					)}
					{activeTab === 'ledger' && (
						<div>
							<Ledger />
						</div>
					)}
					{activeTab === 'userManagement' && (
						<div>
							<UserManagement />
						</div>
					)}
					{activeTab === 'settings' && (
						<div>
							{/* Settings component moved to sidebars/settings.tsx */}
							<Settings />
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AdminDashboard;
