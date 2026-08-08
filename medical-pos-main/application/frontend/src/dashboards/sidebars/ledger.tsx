import React, { useState, useEffect } from 'react';
import type { LedgerEntry, LedgerPayload, LedgerSummary } from '../../types/api';
import { getLedgerEntries, createLedgerEntry, updateLedgerEntry, deleteLedgerEntry, getLedgerSummary, backend_url } from '../../routes/api';

const IconMoney = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const IconDownload = ({ className = 'w-5 h-5' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const IconPlus = ({ className = 'w-5 h-5' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const IconChevronDown = ({ className = 'w-5 h-5' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

interface MultiSelectDropdownProps {
	value: string[];
	onChange: (value: string[]) => void;
	options: string[];
	placeholder?: string;
	label?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ 
	value, 
	onChange, 
	options, 
	placeholder = 'Select options...',
	label
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const dropdownRef = React.useRef<HTMLDivElement>(null);

	// Filter options based on search term
	const filteredOptions = options.filter(option =>
		option.toLowerCase().includes(searchTerm.toLowerCase())
	);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleToggleOption = (option: string) => {
		if (value.includes(option)) {
			onChange(value.filter(v => v !== option));
		} else {
			onChange([...value, option]);
		}
	};

	const handleRemoveTag = (option: string, e: React.MouseEvent) => {
		e.stopPropagation();
		onChange(value.filter(v => v !== option));
	};

	return (
		<div className="relative" ref={dropdownRef}>
			{label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between"
			>
				<div className="flex flex-wrap gap-1 flex-1">
					{value.length > 0 ? (
						value.map(v => (
							<span
								key={v}
								className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
							>
								{v}
								<button
									type="button"
									onClick={(e) => handleRemoveTag(v, e)}
									className="hover:text-blue-900"
								>
									×
								</button>
							</span>
						))
					) : (
						<span className="text-gray-500">{placeholder}</span>
					)}
				</div>
				<IconChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
			</button>

			{isOpen && (
				<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-40 max-h-64 overflow-y-auto">
					<div className="sticky top-0 p-2 bg-white border-b">
						<input
							type="text"
							placeholder="Search categories..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							onClick={(e) => e.stopPropagation()}
							className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
						/>
					</div>
					<div className="p-2">
						{filteredOptions.length > 0 ? (
							filteredOptions.map(option => (
								<label key={option} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
									<input
										type="checkbox"
										checked={value.includes(option)}
										onChange={() => handleToggleOption(option)}
										className="rounded"
									/>
									<span className="text-sm">{option}</span>
								</label>
							))
						) : (
							<div className="p-2 text-sm text-gray-500">No options found</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

const Ledger: React.FC = () => {
	const [entries, setEntries] = useState<LedgerEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
	
	// Filters
	const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
	const [availableCategories, setAvailableCategories] = useState<string[]>([]);
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	
	// Pagination
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	
	// Form state
	const [description, setDescription] = useState('');
	const [amount, setAmount] = useState('');
	const [category, setCategory] = useState('');
	const [notes, setNotes] = useState('');
	
	// Summary
	const [summary, setSummary] = useState<LedgerSummary>({});
	
	// Excel export
	const [showExportModal, setShowExportModal] = useState(false);
	const [exportCategory, setExportCategory] = useState<string[]>([]);
	const [exportDateFrom, setExportDateFrom] = useState('');
	const [exportDateTo, setExportDateTo] = useState('');
	const [exporting, setExporting] = useState(false);
	
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const fetchEntries = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await getLedgerEntries(
				categoryFilter.length > 0 ? categoryFilter : undefined,
				dateFrom || undefined,
				dateTo || undefined,
				searchQuery || undefined,
				currentPage,
				15
			);

			setEntries(response.entries || []);
			setTotalPages(response.total_pages || 1);
			
			// Extract unique categories from all entries (across all pages)
			// For a more accurate list, we should fetch all entries once to get all categories
			// But for now, we'll use the entries from the current fetch
				if (!categoryFilter.length && response.entries) {
					const categories = [...new Set(response.entries.map((e: LedgerEntry) => e.category).filter(Boolean))] as string[];
					setAvailableCategories(categories.sort());
				}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load ledger entries';
			console.error('Failed to fetch ledger entries:', errorMessage);
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	// Fetch all categories on component mount
	useEffect(() => {
		const fetchAllCategories = async () => {
			try {
				const response = await getLedgerEntries(
					undefined,
					undefined,
					undefined,
					undefined,
					1,
					10000 // Large number to get most entries
				);
				if (response.entries) {
					const categories = [...new Set(response.entries.map((e: LedgerEntry) => e.category).filter(Boolean))] as string[];
					setAvailableCategories(categories.sort());
				}
			} catch (err) {
				console.error('Failed to fetch categories:', err);
			}
		};
		
		fetchAllCategories();
	}, []);

	const fetchSummary = async () => {
		try {
			const response = await getLedgerSummary(
				categoryFilter.length > 0 ? categoryFilter : undefined,
				dateFrom || undefined,
				dateTo || undefined
			);
			setSummary(response);
		} catch (err) {
			console.error('Failed to fetch summary:', err);
		}
	};

	useEffect(() => {
		fetchEntries();
		fetchSummary();
	}, [categoryFilter, dateFrom, dateTo, searchQuery, currentPage]);

	const resetForm = () => {
		setDescription('');
		setAmount('');
		setCategory('');
		setNotes('');
	};

	const handleAddEntry = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const entryData: LedgerPayload = {
				description,
				amount: parseFloat(amount),
				category,
				notes: notes || undefined,
			};

			// Don't send date - backend will use current Pakistan time
			await createLedgerEntry(entryData);
			setSuccessMessage('Entry added successfully!');
			setShowAddModal(false);
			resetForm();
			fetchEntries();
			fetchSummary();
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to add entry');
			setTimeout(() => setError(null), 3000);
		}
	};

	const handleEditEntry = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingEntry) return;

		try {
			const updateData: Partial<LedgerPayload> = {
				description,
				amount: parseFloat(amount),
				category,
				notes: notes || undefined,
			};

			// Don't allow changing the date when editing
			await updateLedgerEntry(editingEntry.id, updateData);
			setSuccessMessage('Entry updated successfully!');
			setShowEditModal(false);
			setEditingEntry(null);
			resetForm();
			fetchEntries();
			fetchSummary();
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update entry');
			setTimeout(() => setError(null), 3000);
		}
	};

	const openEditModal = (entry: LedgerEntry) => {
		setEditingEntry(entry);
		setDescription(entry.description);
		setAmount(String(entry.amount));
		setCategory(entry.category);
		setNotes(entry.notes || '');
		setShowEditModal(true);
	};

	const handleDeleteEntry = async (entryId: string) => {
		setDeletingEntryId(entryId);
		setShowDeleteModal(true);
	};

	const confirmDelete = async () => {
		if (!deletingEntryId) return;

		try {
			await deleteLedgerEntry(deletingEntryId);
			setSuccessMessage('Entry deleted successfully!');
			setShowDeleteModal(false);
			setDeletingEntryId(null);
			fetchEntries();
			fetchSummary();
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete entry');
			setTimeout(() => setError(null), 3000);
		}
	};

	const handleExportToExcel = async () => {
		try {
			setExporting(true);
			const params = new URLSearchParams();
			
			// Add multiple categories if selected
			if (exportCategory.length > 0) {
				exportCategory.forEach(cat => params.append('category', cat));
			}
			if (exportDateFrom) params.append('date_from', exportDateFrom);
			if (exportDateTo) params.append('date_to', exportDateTo);

			const response = await fetch(`${backend_url}/api/ledger/export/excel?${params.toString()}`);
			
			if (!response.ok) throw new Error('Export failed');

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `ledger_report_${new Date().toISOString().split('T')[0]}.xlsx`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			setShowExportModal(false);
			setSuccessMessage('Excel report generated successfully!');
			setTimeout(() => setSuccessMessage(null), 3000);
} catch {
				setError('Failed to generate Excel report');
			setTimeout(() => setError(null), 3000);
		} finally {
			setExporting(false);
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		// Date is already in Pakistan time from backend, no conversion needed
		return date.toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		});
	};

	return (
		<div className="p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-2xl font-bold flex items-center gap-3">
						<IconMoney className="text-green-600" /> Expense Ledger
					</h2>
					<p className="text-gray-600 mt-1">Track expenses</p>
				</div>
				<div className="flex gap-3">
					<button
						onClick={() => setShowExportModal(true)}
						className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
					>
						<IconDownload className="w-4 h-4" />
						Export to Excel
					</button>
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

			{/* Summary Cards */}
			{summary && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
					<div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
						<p className="text-sm text-gray-600">Total Expenses</p>
						<p className="text-2xl font-bold text-gray-800">Rs {summary.total_amount?.toLocaleString() || 0}</p>
					</div>
					<div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
						<p className="text-sm text-gray-600">Total Entries</p>
						<p className="text-2xl font-bold text-purple-600">{summary.total_entries || 0}</p>
					</div>
				</div>
			)}

			{/* Filters */}
			<div className="bg-white p-4 rounded-lg shadow mb-6">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
					<MultiSelectDropdown
						value={categoryFilter}
						onChange={(value) => {
							setCategoryFilter(value);
							setCurrentPage(1);
						}}
						options={availableCategories}
						placeholder="Select categories..."
						label="Category"
					/>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
						<input
							type="date"
							value={dateFrom}
							onChange={(e) => {
								setDateFrom(e.target.value);
								setCurrentPage(1);
							}}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
						<input
							type="date"
							value={dateTo}
							onChange={(e) => {
								setDateTo(e.target.value);
								setCurrentPage(1);
							}}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setCurrentPage(1);
							}}
							placeholder="Search description..."
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div className="flex items-end">
						{(categoryFilter.length > 0 || dateFrom || dateTo || searchQuery) && (
							<button
								onClick={() => {
									setCategoryFilter([]);
									setDateFrom('');
									setDateTo('');
									setSearchQuery('');
									setCurrentPage(1);
								}}
								className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50"
							>
								Clear Filters
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Entries Table */}
			<div className="bg-white rounded-lg shadow overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{loading ? (
								<tr>
									<td colSpan={6} className="px-4 py-8 text-center text-gray-500">
										Loading...
									</td>
								</tr>
							) : entries.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-4 py-8 text-center text-gray-500">
										No entries found
									</td>
								</tr>
							) : (
								entries.map((entry) => (
									<tr key={entry.id} className="hover:bg-gray-50">
										<td className="px-4 py-3 text-sm">{formatDate(entry.date ?? '')}</td>
										<td className="px-4 py-3 text-sm">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												entry.category === 'official' 
													? 'bg-green-100 text-green-800' 
													: 'bg-orange-100 text-orange-800'
											}`}>
												{entry.category?.charAt(0).toUpperCase() + entry.category?.slice(1)}
											</span>
										</td>
										<td className="px-4 py-3 text-sm">{entry.description}</td>
										<td className="px-4 py-3 text-sm font-semibold text-green-600">
											Rs {entry.amount?.toLocaleString()}
										</td>
										<td className="px-4 py-3 text-sm text-gray-500">{entry.notes || '-'}</td>
										<td className="px-4 py-3 text-sm">
											<div className="flex gap-2">
												<button
													onClick={() => openEditModal(entry)}
													className="text-blue-600 hover:text-blue-800"
												>
													Edit
												</button>
												<button
													onClick={() => handleDeleteEntry(entry.id)}
													className="text-red-600 hover:text-red-800"
												>
													Delete
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Pagination controls */}
			<div className="flex items-center justify-between mt-4">
				{(() => {
					const prevDisabled = currentPage <= 1;
					const nextDisabled = currentPage >= totalPages;
					return (
						<>
							<div className="text-sm text-gray-600">
								{totalPages ? `Page ${currentPage} of ${totalPages}` : `Page ${currentPage}`}
							</div>
							<div className="flex items-center gap-2">
								<button 
									onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
									disabled={prevDisabled} 
									className={`px-3 py-1 rounded border ${prevDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
								>
									Prev
								</button>
								{totalPages > 1 && (
									<select 
										value={currentPage} 
										onChange={e => setCurrentPage(Number(e.target.value))} 
										className="px-2 py-1 border rounded"
									>
										{Array.from({ length: totalPages }).map((_, i) => (
											<option key={i+1} value={i+1}>Page {i+1}</option>
										))}
									</select>
								)}
								<button 
									onClick={() => setCurrentPage(p => p + 1)} 
									disabled={nextDisabled} 
									className={`px-3 py-1 rounded border ${nextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
								>
									Next
								</button>
							</div>
						</>
					);
				})()}
			</div>

			{/* Add/Edit Modal */}
			{(showAddModal || showEditModal) && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					{/* Backdrop */}
					<div 
						className="absolute inset-0 bg-black opacity-50"
						onClick={() => {
							setShowAddModal(false);
							setShowEditModal(false);
							setEditingEntry(null);
							resetForm();
						}}
					></div>
					
					{/* Modal Content */}
					<div className="bg-white rounded-lg max-w-md w-full p-6 relative z-10">
						<h3 className="text-xl font-bold mb-4">
							{showAddModal ? 'Add New Expense' : 'Edit Expense'}
						</h3>
						<form onSubmit={showAddModal ? handleAddEntry : handleEditEntry}>
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
									{showAddModal ? 'Add' : 'Update'}
								</button>
								<button
									type="button"
									onClick={() => {
										setShowAddModal(false);
										setShowEditModal(false);
										setEditingEntry(null);
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

			{/* Export Modal */}
			{showExportModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					{/* Backdrop */}
					<div 
						className="absolute inset-0 bg-black opacity-50"
						onClick={() => !exporting && setShowExportModal(false)}
					></div>
					
					{/* Modal Content */}
					<div className="bg-white rounded-lg max-w-md w-full p-6 relative z-10">
						<h3 className="text-xl font-bold mb-4">Export to Excel</h3>
						<div className="space-y-4">
							<MultiSelectDropdown
								value={exportCategory}
								onChange={(value) => setExportCategory(value)}
								options={availableCategories}
								placeholder="Select categories (leave empty for all)..."
								label="Category"
							/>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									From Date
								</label>
								<input
									type="date"
									value={exportDateFrom}
									onChange={(e) => setExportDateFrom(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									To Date
								</label>
								<input
									type="date"
									value={exportDateTo}
									onChange={(e) => setExportDateTo(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>
						<div className="flex gap-3 mt-6">
							<button
								onClick={handleExportToExcel}
								disabled={exporting}
								className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
							>
								{exporting ? 'Generating...' : (
									<>
										<IconDownload className="w-4 h-4" />
										Generate Excel
									</>
								)}
							</button>
							<button
								onClick={() => setShowExportModal(false)}
								disabled={exporting}
								className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					{/* Backdrop */}
					<div 
						className="absolute inset-0 bg-black opacity-50"
						onClick={() => {
							setShowDeleteModal(false);
							setDeletingEntryId(null);
						}}
					></div>
					
					{/* Modal Content */}
					<div className="bg-white rounded-lg max-w-md w-full p-6 relative z-10">
						<h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
						<p className="text-gray-600 mb-6">Are you sure you want to delete this entry? This action cannot be undone.</p>
						<div className="flex gap-3">
							<button
								onClick={confirmDelete}
								className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
							>
								Delete
							</button>
							<button
								onClick={() => {
									setShowDeleteModal(false);
									setDeletingEntryId(null);
								}}
								className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Ledger;
