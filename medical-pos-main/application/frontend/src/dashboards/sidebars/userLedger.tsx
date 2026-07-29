import React, { useState } from 'react';
import { createLedgerEntry } from '../../routes/api';

const IconMoney = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const IconPlus = ({ className = 'w-5 h-5' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const UserLedger: React.FC = () => {
	const [showAddModal, setShowAddModal] = useState(false);
	
	// Form state
	const [description, setDescription] = useState('');
	const [amount, setAmount] = useState('');
	const [category, setCategory] = useState('');
	const [notes, setNotes] = useState('');
	
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const resetForm = () => {
		setDescription('');
		setAmount('');
		setCategory('');
		setNotes('');
	};

	const handleAddEntry = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const entryData: any = {
				description,
				amount: parseFloat(amount),
				category,
				notes: notes || undefined,
			};

			await createLedgerEntry(entryData);
			setSuccessMessage('Entry added successfully!');
			setShowAddModal(false);
			resetForm();
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err: any) {
			setError(err?.data?.detail || 'Failed to add entry');
			setTimeout(() => setError(null), 3000);
		}
	};

	return (
		<div className="p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-2xl font-bold flex items-center gap-3">
						<IconMoney className="text-green-600" /> Add Expense
					</h2>
					<p className="text-gray-600 mt-1">Create new expense entry</p>
				</div>
				<div className="flex gap-3">
					<button
						onClick={() => {
							resetForm();
							setShowAddModal(true);
						}}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
					>
						<IconPlus className="w-4 h-4" />
						Add Expense
					</button>
				</div>
			</div>

			{/* Messages */}
			{error && (
				<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
					{error}
				</div>
			)}
			{successMessage && (
				<div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
					{successMessage}
				</div>
			)}

			{/* Add Modal */}
			{showAddModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					{/* Backdrop */}
					<div 
						className="absolute inset-0 bg-black opacity-50"
						onClick={() => {
							setShowAddModal(false);
							resetForm();
						}}
					></div>
					
					{/* Modal Content */}
					<div className="bg-white rounded-lg max-w-md w-full p-6 relative z-10">
						<h3 className="text-xl font-bold mb-4">Add New Expense</h3>
						<form onSubmit={handleAddEntry}>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Description *
									</label>
									<input
										type="text"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										required
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
										placeholder="Enter description"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Amount (Rs) *
									</label>
									<input
										type="number"
										step="0.01"
										value={amount}
										onChange={(e) => setAmount(e.target.value)}
										required
										min="0.01"
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
										placeholder="0.00"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Category *
									</label>
									<input
										type="text"
										value={category}
										onChange={(e) => setCategory(e.target.value)}
										required
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
										placeholder="e.g., Office, Equipment, Supplies, Utilities, etc."
									/>
									<p className="text-xs text-gray-500 mt-1">Enter any category name you'd like</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Notes
									</label>
									<textarea
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										rows={3}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
										placeholder="Additional notes (optional)"
									/>
								</div>
							</div>
							<div className="flex gap-3 mt-6">
								<button
									type="submit"
									className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
								>
									Add
								</button>
								<button
									type="button"
									onClick={() => {
										setShowAddModal(false);
										resetForm();
									}}
									className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default UserLedger;
