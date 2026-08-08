import { getErrorMessage } from '../../utils/error';
import React, { useState, useEffect } from 'react';
import type { DoctorRecord, SaleRecord } from '../../types/api';
import { getSales, getSalesSummary, listDoctors, backend_url } from '../../routes/api';

const IconChart = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		<path d="M7 14l4-4 4 4 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const IconDollar = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const IconTrendingUp = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const IconDownload = ({ className = 'w-5 h-5' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const Sales: React.FC = () => {
	const [salesData, setSalesData] = useState<SaleRecord[]>([]);
	const [initialLoading, setInitialLoading] = useState(true);
	const [dataLoading, setDataLoading] = useState(false);
	const [totalSubtotal, setTotalSubtotal] = useState(0);
	const [totalDiscount, setTotalDiscount] = useState(0);
	const [totalProfit, setTotalProfit] = useState(0);
	const [totalRevenue, setTotalRevenue] = useState(0);
	const [totalSales, setTotalSales] = useState(0);
	const [totalDoctorShare, setTotalDoctorShare] = useState(0);
	const [totalProfitAfterShare, setTotalProfitAfterShare] = useState(0);
	const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [selectedDoctor, setSelectedDoctor] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [error, setError] = useState<string | null>(null);
	
	// Excel export states
	const [showExportModal, setShowExportModal] = useState(false);
	const [exportDoctor, setExportDoctor] = useState('');
	const [exportDateFrom, setExportDateFrom] = useState('');
	const [exportDateTo, setExportDateTo] = useState('');
	const [exportMonth, setExportMonth] = useState('');
	const [exportYear, setExportYear] = useState('');
	const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
	const [exporting, setExporting] = useState(false);

	const fetchSalesData = async () => {
		try {
			// Use different loading states for initial vs subsequent loads
			if (initialLoading) {
				setInitialLoading(true);
			} else {
				setDataLoading(true);
			}
			setError(null);

		// Fetch sales summary
		const summaryResponse = await getSalesSummary(filter === 'all' ? undefined : filter);
		setTotalSubtotal(summaryResponse.total_subtotal || 0);
		setTotalDiscount(summaryResponse.total_discount || 0);
		setTotalProfit(summaryResponse.total_profit || 0);
		setTotalRevenue(summaryResponse.total_revenue || 0);
		setTotalSales(summaryResponse.total_sales || 0);
		setTotalDoctorShare(summaryResponse.total_doctor_share || 0);
		setTotalProfitAfterShare(summaryResponse.total_profit_after_share || 0);

		// (no per-day summary needed — only total profit is shown)

			// Fetch sales list with doctor filter
			const salesResponse = await getSales(
				debouncedSearch || undefined,
				currentPage,
				15,
				filter === 'all' ? undefined : filter,
				selectedDoctor || undefined
			);

			setSalesData(salesResponse.sales || []);
			setTotalPages(salesResponse.total_pages || 1);

		} catch (err: unknown) {
			console.error('Failed to fetch sales data:', err);
			setError(getErrorMessage(err, 'Failed to load sales data'));
		} finally {
			setInitialLoading(false);
			setDataLoading(false);
		}
	};

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
			setCurrentPage(1); // Reset to first page on search
		}, 500); // 500ms delay

		return () => clearTimeout(timer);
	}, [searchQuery]);

	useEffect(() => {
		fetchSalesData();
	}, [filter, debouncedSearch, selectedDoctor, currentPage]);

	useEffect(() => {
		const fetchDoctors = async () => {
			try {
				const response = await listDoctors('', 1, 100);
				setDoctors(response.doctors || []);
			} catch (err) {
				console.error('Failed to fetch doctors', err);
			}
		};
		fetchDoctors();
	}, []);

	const handleExportToExcel = async () => {
		try {
			setExporting(true);
			const params = new URLSearchParams();
			
			if (exportDoctor) params.append('doctor_name', exportDoctor);
			if (exportDateFrom) params.append('date_from', exportDateFrom);
			if (exportDateTo) params.append('date_to', exportDateTo);
			if (exportMonth) params.append('month', exportMonth);
			if (exportYear) params.append('year', exportYear);

			const url = `${backend_url}/api/sales/export/excel?${params.toString()}`;
			
			// Download file
			const link = document.createElement('a');
			link.href = url;
			link.download = `sales_report_${new Date().getTime()}.xlsx`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			
			setShowExportModal(false);
			// Reset filters
			setExportDoctor('');
			setExportDateFrom('');
			setExportDateTo('');
			setExportMonth('');
			setExportYear('');
		} catch (err) {
			console.error('Failed to export:', err);
			alert('Failed to generate Excel report');
		} finally {
			setExporting(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		// Date is already in Pakistan time from backend, no conversion needed
		return date.toLocaleString('en-PK', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		});
	};

	// Only show initial loading spinner on first load
	if (initialLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error && !salesData.length) {
		return (
			<div className="p-4">
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<div className="flex items-center">
						<svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span className="text-red-700">{error}</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-4">
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-bold flex items-center gap-3">
					<IconChart className="text-blue-600" />
					Sales Analytics
				</h2>
				<div className="flex gap-2">
					<button
						onClick={() => setShowExportModal(true)}
						className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
					>
						<IconDownload className="w-4 h-4" />
						Export to Excel
					</button>
					<select
						value={selectedDoctor}
						onChange={(e) => {
							setSelectedDoctor(e.target.value);
							setCurrentPage(1); // Reset to first page on filter change
						}}
						className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
					>
						<option value="">All Doctors</option>
						<option value="none">No Doctor</option>
						{doctors.map((doc) => (
							<option key={doc.id} value={doc.id}>
								{doc.name}
							</option>
						))}
					</select>
					<input
						type="text"
						placeholder="Search sales(e.g, 2025-000016)"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
					/>
					<select
						value={filter}
						onChange={(e) => setFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
						className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
					>
						<option value="all">All Time</option>
						<option value="today">Today</option>
						<option value="week">This Week</option>
						<option value="month">This Month</option>
					</select>
				</div>
			</div>

			{/* Summary Cards */}
	    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
		<div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white h-24 sm:h-28 flex flex-col justify-between">
					<div>
			<p className="text-sm opacity-90">Total Subtotal</p>
					</div>
					<div className="flex items-center justify-between">
			<p className="text-lg sm:text-xl md:text-2xl font-bold">Rs {totalSubtotal.toLocaleString()}</p>
			<IconDollar className="w-6 h-6 sm:w-7 sm:h-7 text-blue-200" />
					</div>
				</div>

		<div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white h-24 sm:h-28 flex flex-col justify-between">
					<div>
						<p className="text-sm opacity-90">Total Discount</p>
					</div>
					<div className="flex items-center justify-between">
			<p className="text-lg sm:text-xl md:text-2xl font-bold">Rs {totalDiscount.toLocaleString()}</p>
			<IconDollar className="w-6 h-6 sm:w-7 sm:h-7 text-red-200" />
					</div>
				</div>

		<div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-4 text-white h-24 sm:h-28 flex flex-col justify-between">
				<div>
					<p className="text-sm opacity-90">Total Revenue</p>
				</div>
				<div className="flex items-center justify-between">
		<p className="text-lg sm:text-xl md:text-2xl font-bold">Rs {totalRevenue.toLocaleString()}</p>
		<IconDollar className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-200" />
				</div>
			</div>

		<div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white h-24 sm:h-28 flex flex-col justify-between">
				<div>
					<p className="text-sm opacity-90">Total Profit</p>
				</div>
				<div className="flex items-center justify-between">
		<p className="text-lg sm:text-xl md:text-2xl font-bold">Rs {totalProfit.toLocaleString()}</p>
		<IconTrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-green-200" />
				</div>
			</div>

		<div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white h-24 sm:h-28 flex flex-col justify-between">
				<div>
					<p className="text-sm opacity-90">Doctor Share</p>
				</div>
				<div className="flex items-center justify-between">
		<p className="text-lg sm:text-xl md:text-2xl font-bold">Rs {totalDoctorShare.toLocaleString()}</p>
		<IconDollar className="w-6 h-6 sm:w-7 sm:h-7 text-purple-200" />
				</div>
			</div>

		<div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white h-24 sm:h-28 flex flex-col justify-between">
				<div>
					<p className="text-sm opacity-90">Net Profit (After Share)</p>
				</div>
				<div className="flex items-center justify-between">
		<p className="text-lg sm:text-xl md:text-2xl font-bold">Rs {totalProfitAfterShare.toLocaleString()}</p>
		<IconTrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-orange-200" />
				</div>
			</div>

		<div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg p-4 text-white h-24 sm:h-28 flex flex-col justify-between">
				<div>
					<p className="text-sm opacity-90">Total Sales</p>
				</div>
				<div className="flex items-center justify-between">
		<p className="text-lg sm:text-xl md:text-2xl font-bold">{totalSales}</p>
		<IconChart className="w-6 h-6 sm:w-7 sm:h-7 text-teal-200" />
				</div>
			</div>
		</div>
			<div className="bg-white rounded-lg shadow-sm border relative">
				{/* Loading overlay for data refresh */}
				{dataLoading && (
					<div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
						<div className="flex flex-col items-center">
							<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
							<p className="mt-2 text-sm text-gray-600">Loading sales...</p>
						</div>
					</div>
				)}
				
				<div className="p-6 border-b">
					<h3 className="text-lg font-semibold">Recent Sales</h3>
					<p className="text-gray-600 text-sm">Showing {salesData.length} sales</p>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full min-w-[800px] table-auto border-separate border-spacing-y-4">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Sale ID</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referred By</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
								<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
							</tr>
						</thead>
						<tbody className="bg-transparent">
							{salesData.map((sale) => (
								<tr key={sale.id} className="bg-white hover:shadow-md transition-shadow rounded-lg">
									<td className="px-3 py-4 align-top text-xs text-gray-700 font-medium">
										<div title={sale.sale_id} className="break-words">{sale.sale_id}</div>
									</td>
									<td className="px-3 py-4 align-top text-sm text-gray-900">
										<div className="break-all overflow-wrap-anywhere leading-relaxed max-w-xs">
											{sale.test_name}
										</div>
									</td>
									<td className="px-3 py-4 align-top text-sm text-gray-900">
										<div>
											<div className="font-medium text-sm">{sale.patient_name}</div>
											<div className="text-gray-500 text-xs">{sale.phone}</div>
										</div>
									</td>
									<td className="px-3 py-4 align-top text-sm text-gray-900">
										{sale.doctor_name || '-'}
									</td>
									<td className="px-3 py-4 align-top text-sm text-gray-900">
										{sale.hospital_name || '-'}
									</td>
									<td className="px-3 py-4 align-top text-sm text-gray-900">
										Rs {sale.subtotal?.toLocaleString() || '0'}
									</td>
									<td className="px-3 py-4 align-top text-sm text-gray-900">
										{sale.discount_type ? (
											<span className="text-red-600 text-sm">
												{sale.discount_type === 'percent' ? `${sale.discount_value}%` : `Rs ${sale.discount_value}`}
											</span>
										) : (
											<span className="text-sm">-</span>
										)}
									</td>
									<td className="px-3 py-4 align-top text-sm text-gray-900">
										Rs {sale.doctor_commission_amount?.toLocaleString() || '0'}
									</td>
									<td className="px-3 py-4 align-top text-sm font-medium text-green-600">
										Rs {sale.final_amount?.toLocaleString() || '0'}
									</td>
									<td className="px-3 py-4 align-top">
										{sale.is_partial ? (
											<span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
												Partial - Rs {sale.remaining_amount} remaining
											</span>
										) : (
											<span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
												Paid
											</span>
										)}
									</td>
									<td className="px-3 py-4 align-top text-sm text-gray-900">
										{formatDate(sale.created_at ?? '')}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{salesData.length === 0 && (
					<div className="p-12 text-center">
						<IconChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">No sales found</h3>
						<p className="text-gray-500">No sales match the selected filter criteria.</p>
					</div>
				)}

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="px-6 py-4 bg-gray-50 border-t">
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
							<div className="text-sm text-gray-700">
								Page {currentPage} of {totalPages}
							</div>
							
							<div className="flex items-center gap-3">
								{/* Previous Button */}
								<button
									onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
								>
									Prev
								</button>

								{/* Page Dropdown Selector */}
								<div className="flex items-center gap-2">
									<select
										value={currentPage}
										onChange={(e) => setCurrentPage(parseInt(e.target.value))}
										className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
									>
										{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
											<option key={page} value={page}>
												Page {page}
											</option>
										))}
									</select>
								</div>

								{/* Next Button */}
								<button
									onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
									className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
								>
									Next
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Export Modal */}
			{showExportModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					{/* Semi-transparent backdrop */}
					<div 
						className="absolute inset-0 bg-black opacity-40"
						onClick={() => setShowExportModal(false)}
					></div>
					
					{/* Modal content */}
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative z-10">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-2xl font-bold text-gray-800">Export Sales to Excel</h3>
							<button
								onClick={() => setShowExportModal(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<div className="space-y-4">
							{/* Doctor Filter */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Filter by Doctor</label>
								<select
									value={exportDoctor}
									onChange={(e) => setExportDoctor(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									<option value="">All Doctors</option>
									{doctors.map((doctor) => (
										<option key={doctor.id} value={doctor.name}>
											{doctor.name}
										</option>
									))}
								</select>
							</div>

							{/* Date Range Filter */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
									<input
										type="date"
										value={exportDateFrom}
										onChange={(e) => {
											setExportDateFrom(e.target.value);
											setExportMonth('');
											setExportYear('');
										}}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
									<input
										type="date"
										value={exportDateTo}
										onChange={(e) => {
											setExportDateTo(e.target.value);
											setExportMonth('');
											setExportYear('');
										}}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>
							</div>

							<div className="text-center text-sm text-gray-500 font-medium">OR</div>

							{/* Month/Year Filter */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
									<select
										value={exportMonth}
										onChange={(e) => {
											setExportMonth(e.target.value);
											if (e.target.value) {
												setExportDateFrom('');
												setExportDateTo('');
											}
										}}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									>
										<option value="">All Months</option>
										<option value="1">January</option>
										<option value="2">February</option>
										<option value="3">March</option>
										<option value="4">April</option>
										<option value="5">May</option>
										<option value="6">June</option>
										<option value="7">July</option>
										<option value="8">August</option>
										<option value="9">September</option>
										<option value="10">October</option>
										<option value="11">November</option>
										<option value="12">December</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
									<input
										type="number"
										value={exportYear}
										onChange={(e) => {
											setExportYear(e.target.value);
											if (e.target.value) {
												setExportDateFrom('');
												setExportDateTo('');
											}
										}}
										placeholder="e.g., 2025"
										min="2020"
										max="2100"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>
							</div>

							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
								<p className="text-sm text-blue-800">
									<strong>Tip:</strong> You can use date range (From/To) OR month/year filters. 
									Leave all blank to export all sales records.
								</p>
							</div>
						</div>

						<div className="flex justify-end gap-3 mt-6">
							<button
								onClick={() => setShowExportModal(false)}
								className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								disabled={exporting}
							>
								Cancel
							</button>
							<button
								onClick={handleExportToExcel}
								disabled={exporting}
								className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
							>
								{exporting ? (
									<>
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										Generating...
									</>
								) : (
									<>
										<IconDownload className="w-4 h-4" />
										Download Excel
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Sales;