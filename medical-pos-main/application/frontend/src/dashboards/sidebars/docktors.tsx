import React, { useEffect, useState } from 'react';
import { listDoctors, createDoctor, updateDoctor, deleteDoctor } from '../../routes/api';

type Doctor = {
	id: string;
	name: string;
	commission_type: 'percentage' | 'flat';
	commission_value: number;
};

const Doctors: React.FC = () => {
	const [doctors, setDoctors] = useState<Doctor[]>([]);
	const [name, setName] = useState('');
	const [commissionType, setCommissionType] = useState<'percentage' | 'flat'>('percentage');
	const [commissionValue, setCommissionValue] = useState('');
	const [fieldErrors, setFieldErrors] = useState<{ name?: string; commissionValue?: string }>({});
	const PER_PAGE = 10;
	const [query, setQuery] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [editing, setEditing] = useState<Doctor | null>(null);
	const [showConfirmDelete, setShowConfirmDelete] = useState<Doctor | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [loading, setLoading] = useState(false);
	const [modalActive, setModalActive] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');

	useEffect(() => {
		if (showModal) {
			setModalActive(false);
			requestAnimationFrame(() => setModalActive(true));
		} else {
			setModalActive(false);
		}
	}, [showModal]);

	useEffect(() => {
		// load doctors from backend
		let mounted = true;
		(async () => {
			try {
				const data = await listDoctors(query, page, PER_PAGE);
				if (mounted) {
					setDoctors(data.doctors ? data.doctors.map((d: any) => ({ id: d.id, name: d.name, commission_type: d.commission_type, commission_value: d.commission_value })) : data.map((d: any) => ({ id: d.id, name: d.name, commission_type: d.commission_type, commission_value: d.commission_value })));
					setTotal(data.total ?? (Array.isArray(data) ? data.length : (data.doctors ? data.doctors.length : 0)));
				}
			} catch (err) {
				console.error('load doctors error', err);
			}
		})();
		return () => { mounted = false; };
	}, [query, page]);

	useEffect(() => {
		setTotal(doctors.length);
	}, [doctors]);

	const resetForm = () => {
		setName('');
		setCommissionType('percentage');
		setCommissionValue('');
		setEditing(null);
		setFieldErrors({});
	};

	const startEdit = (doc: Doctor) => {
		setEditing(doc);
		setName(doc.name);
		setCommissionType(doc.commission_type);
		setCommissionValue(String(doc.commission_value));
		setFieldErrors({});
		setShowModal(true);
	};

	const confirmDelete = (doc: Doctor) => setShowConfirmDelete(doc);

	const doDelete = async () => {
		if (!showConfirmDelete) return;
		try {
			await deleteDoctor(showConfirmDelete.id);
			setDoctors(prev => prev.filter(d => d.id !== showConfirmDelete.id));
			setShowConfirmDelete(null);
		} catch (err) {
			console.error('delete error', err);
			alert('Failed to delete doctor. See console for details.');
		}
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="text-2xl font-bold flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						Doctors Management
					</h2>
					<p className="text-gray-600 text-sm">Add and manage doctors with their commission settings.</p>
				</div>
				<div className="text-right">
					<div className="text-2xl font-bold text-blue-600">{total}</div>
					<div className="text-sm text-gray-500">Total Doctors</div>
				</div>
			</div>

			{successMessage && (
				<div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{successMessage}
				</div>
			)}

			{/* Search */}
			<div className="mb-4">
				<input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search doctors..." className="w-full md:w-1/2 px-3 py-2 border rounded" />
			</div>

			<div className="bg-white rounded shadow-sm p-6 mb-6 flex items-center justify-between">
				<div>
					<h4 className="text-lg font-medium">Add doctors</h4>
					<p className="text-sm text-gray-500">Use the button to open a modal for adding new doctors.</p>
				</div>
				<div>
					<button onClick={() => { resetForm(); setShowModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded shadow transition transform hover:-translate-y-1 hover:shadow-lg hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Add Doctor
					</button>
				</div>
			</div>

			<div className="bg-white rounded shadow-sm p-6">
				<h3 className="text-lg font-semibold mb-3">Available doctors</h3>
				<div className="text-sm text-gray-500 mb-3">Showing page {page} — {total} doctors</div>
				{doctors.length === 0 ? (
					<div className="text-gray-600">No doctors yet. Click "Add Doctor" to create one.</div>
				) : (
					<ul className="space-y-3">
						{doctors.map((doc, idx) => {
							const num = (page - 1) * PER_PAGE + idx + 1;
							return (
								<li key={doc.id} className="flex items-center justify-between border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
									<div className="flex items-center gap-3">
										<div className="text-sm text-gray-500 w-8 text-right">{num}.</div>
										<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
										<div>
											<div className="font-medium">{doc.name}</div>
											<div className="text-sm text-gray-600">
												Commission: {doc.commission_type === 'percentage' ? `${doc.commission_value}%` : `Rs ${doc.commission_value}`}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<button onClick={() => startEdit(doc)} className="px-3 py-1 rounded border text-sm transition transform hover:-translate-y-0.5 hover:shadow-sm hover:bg-gray-50 flex items-center gap-1">
											<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
											Edit
										</button>
										<button onClick={() => confirmDelete(doc)} className="px-3 py-1 rounded bg-red-50 text-red-600 text-sm border transition transform hover:-translate-y-0.5 hover:shadow-sm hover:bg-red-100 flex items-center gap-1">
											<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
											Delete
										</button>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			{showConfirmDelete && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/30" onClick={() => setShowConfirmDelete(null)} />
					<div className="bg-white rounded shadow p-6 z-10 w-full max-w-sm transition transform hover:-translate-y-0.5 hover:shadow-lg">
						<h4 className="text-lg font-semibold mb-2">Delete doctor</h4>
						<p className="text-sm text-gray-600 mb-4">Are you sure you want to delete "{showConfirmDelete.name}"?</p>
						<div className="flex justify-end gap-3">
							<button onClick={() => setShowConfirmDelete(null)} className="px-3 py-2 rounded border hover:bg-gray-50 transition">Cancel</button>
							<button onClick={doDelete} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition transform active:scale-95 shadow-sm flex items-center gap-1">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal for Add/Edit */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out ${modalActive ? 'opacity-100' : 'opacity-0'}`} onClick={() => { if (!loading) { setShowModal(false); resetForm(); } }} />
					<div className={`bg-white rounded-lg shadow-2xl p-0 z-10 w-full max-w-lg transform transition-all duration-300 ease-out ${modalActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`}>
						{/* accent bar */}
						<div className="h-1 rounded-t-lg bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse" />
						<div className="p-6">
							<div className="flex items-start justify-between mb-4">
								<h4 className="text-lg font-semibold">{editing ? 'Edit Doctor' : 'Add Doctor'}</h4>
								<button type="button" aria-label="Close modal" onClick={() => { if (!loading) { setShowModal(false); resetForm(); } }} className="text-gray-400 hover:text-gray-700 transition-colors duration-200">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
								</button>
							</div>
							<form onSubmit={async (e) => {
								e.preventDefault();
								setFieldErrors({});
								// client-side validation
								let hasError = false;
								if (!name.trim()) {
									setFieldErrors(f => ({ ...f, name: 'Name is required' }));
									hasError = true;
								}
								const val = Number(commissionValue);
								if (!commissionValue || Number.isNaN(val) || val < 0) {
									setFieldErrors(f => ({ ...f, commissionValue: 'Enter a valid non-negative commission value' }));
									hasError = true;
								}
								if (hasError) return;
								setLoading(true);
								try {
									if (editing) {
										const updated = await updateDoctor(editing.id, { name: name.trim(), commission_type: commissionType, commission_value: val });
										setDoctors(prev => prev.map(d => (d.id === editing.id ? { id: updated.id, name: updated.name, commission_type: updated.commission_type, commission_value: updated.commission_value } : d)));
										setSuccessMessage('Doctor updated successfully!');
									} else {
										const created = await createDoctor({ name: name.trim(), commission_type: commissionType, commission_value: val });
										setDoctors(prev => [{ id: created.id, name: created.name, commission_type: created.commission_type, commission_value: created.commission_value }, ...prev]);
										setSuccessMessage('Doctor added successfully!');
									}
									setTimeout(() => setSuccessMessage(''), 3000);
									setShowModal(false);
									resetForm();
								} catch (err: any) {
									if (err?.status === 409) {
										setFieldErrors(f => ({ ...f, name: 'A doctor with this name already exists' }));
										setLoading(false);
										return;
									}
									console.error('save doctor error', err);
									alert('Failed to save doctor. See console for details.');
								} finally {
									setLoading(false);
								}
							}} className="grid grid-cols-1 gap-3">
								<div>
									<label className="block text-sm font-medium mb-1">Doctor name</label>
									<input
										value={name}
										onChange={e => { setName(e.target.value); setFieldErrors(f => ({ ...f, name: undefined })); }}
										aria-invalid={!!fieldErrors.name}
										className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
										placeholder="e.g. Dr. John Smith"
									/>
									{fieldErrors.name ? <div className="text-xs text-red-600 mt-1">{fieldErrors.name}</div> : null}
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-sm font-medium mb-1">Commission Type</label>
										<select
											value={commissionType}
											onChange={e => setCommissionType(e.target.value as 'percentage' | 'flat')}
											className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
										>
											<option value="percentage">Percentage (%)</option>
											<option value="flat">Flat Amount (Rs)</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">Commission Value</label>
										<input
											value={commissionValue}
											onChange={e => { setCommissionValue(e.target.value); setFieldErrors(f => ({ ...f, commissionValue: undefined })); }}
											inputMode="decimal"
											pattern="^\d+(\.\d{1,2})?$"
											type="number"
											min="0"
											step="0.01"
											className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
											placeholder={commissionType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
										/>
										{fieldErrors.commissionValue ? <div className="text-xs text-red-600 mt-1">{fieldErrors.commissionValue}</div> : null}
									</div>
								</div>
								<div className="flex justify-end gap-3 mt-4">
									<button type="button" onClick={() => { if (!loading) { setShowModal(false); resetForm(); } }} className="px-3 py-2 rounded-md border hover:bg-gray-50 transition-all duration-200">Cancel</button>
									<button type="submit" disabled={loading || !name.trim()} className={`px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 shadow-md hover:bg-blue-700 transform hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ${loading || !name.trim() ? 'opacity-50 cursor-not-allowed hover:bg-blue-600 hover:translate-y-0' : ''}`}>
										{loading ? (<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>) : editing ? (
											<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
											</svg>
										) : (
											<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
											</svg>
										)}
										<span className="font-medium">{editing ? 'Save' : 'Add Doctor'}</span>
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

			{/* Pagination controls */}
			<div className="flex items-center justify-between mt-4">
				{(() => {
					const totalPages = total ? Math.max(1, Math.ceil(total / PER_PAGE)) : undefined;
					const prevDisabled = page <= 1;
					const nextDisabled = totalPages ? page >= totalPages : doctors.length < PER_PAGE;
					return (
						<>
							<div className="text-sm text-gray-600">{totalPages ? `Page ${page} of ${totalPages}` : `Page ${page}`}</div>
							<div className="flex items-center gap-2">
								<button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={prevDisabled} className={`px-3 py-1 rounded border ${prevDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}>Prev</button>
								{totalPages ? (
									<select value={page} onChange={e => setPage(Number(e.target.value))} className="px-2 py-1 border rounded">
										{Array.from({ length: totalPages }).map((_, i) => (
											<option key={i+1} value={i+1}>Page {i+1}</option>
										))}
									</select>
								) : null}
								<button onClick={() => setPage(p => p + 1)} disabled={nextDisabled} className={`px-3 py-1 rounded border ${nextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}>Next</button>
							</div>
						</>
					);
				})()}
			</div>
		</div>
	);
};

export default Doctors;