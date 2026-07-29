

import AdminDashboard from './adminDashboard';
import UserDashboard from './userDashboard';
import { useAuth } from '../context/auth_context';

interface DashboardProps {
	userType: 'admin' | 'user';
}

const Dashboard: React.FC<DashboardProps> = ({ userType }) => {
	useAuth(); // keep auth provider in use for potential redirect/guards

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="titlebar flex items-center justify-between px-6 py-3 bg-white shadow-sm">
				<div className="flex items-center space-x-3">
					<div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md px-3 py-2 font-bold text-lg">Medical POS</div>
					<h1 className="text-lg font-semibold text-gray-700">Dashboard</h1>
				</div>
				<div className="flex items-center space-x-4">
					{/* Email removed from header to avoid layout/overlay issues */}
				</div>
				{/* TitlebarButtons are rendered globally in main.tsx; duplicate removed */}
			</header>

			<main>
				{userType === 'admin' ? <AdminDashboard /> : <UserDashboard />}
			</main>
		</div>
	);
};

export default Dashboard;
