import React, { useEffect, useState } from 'react';
import { listItems, createItem, updateItem, deleteItem } from '../../routes/api';

type Item = {
	id: string;
	name: string;
	cost_price?: number;
	sell_price?: number;
	price?: number;
};


const Items: React.FC = () => {
	const [items, setItems] = useState<Item[]>([]);
	const [name, setName] = useState('');

	const [costPrice, setCostPrice] = useState('');
	const [sellPrice, setSellPrice] = useState('');
	const [fieldErrors, setFieldErrors] = useState<{ costPrice?: string; sellPrice?: string; name?: string }>({});
	const PER_PAGE = 10;
	const [query, setQuery] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [editing, setEditing] = useState<Item | null>(null);
	const [showConfirmDelete, setShowConfirmDelete] = useState<Item | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [loading, setLoading] = useState(false);
	const [modalActive, setModalActive] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');

	useEffect(() => {
		if (showModal) {
			// trigger enter animation on next frame
			setModalActive(false);
			requestAnimationFrame(() => setModalActive(true));
		} else {
			setModalActive(false);
		}
	}, [showModal]);

		useEffect(() => {
			// load items from backend
			let mounted = true;
				(async () => {
					try {
						const data = await listItems(query, page, PER_PAGE);
						if (mounted) {
							setItems(data.items ? data.items.map((d: any) => ({ id: d.id, name: d.name, cost_price: d.cost_price || 0, sell_price: d.sell_price || 0 })) : data.map((d: any) => ({ id: d.id, name: d.name, cost_price: d.cost_price || 0, sell_price: d.sell_price || 0 })));
							setTotal(data.total ?? (Array.isArray(data) ? data.length : (data.items ? data.items.length : 0)));
						}
					} catch (err) {
						console.error('load items error', err);
					}
				})();
			return () => { mounted = false; };
		}, [query, page]);

		useEffect(() => {
			setTotal(items.length);
		}, [items]);

	const resetForm = () => {
		setName('');
		setCostPrice('');
		setSellPrice('');
		setEditing(null);
		setFieldErrors({});
	};

	const startEdit = (it: Item) => {
		setEditing(it);
		setName(it.name);
		setCostPrice(String(it.cost_price ?? ''));
		setSellPrice(String(it.sell_price ?? it.price ?? ''));
		setFieldErrors({});
		setShowModal(true);
	};

	const confirmDelete = (it: Item) => setShowConfirmDelete(it);

		const doDelete = async () => {
			if (!showConfirmDelete) return;
			try {
				await deleteItem(showConfirmDelete.id);
				setItems(prev => prev.filter(i => i.id !== showConfirmDelete.id));
				setShowConfirmDelete(null);
			} catch (err) {
				console.error('delete error', err);
				alert('Failed to delete item. See console for details.');
			}
		};

	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="text-2xl font-bold flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
						</svg>
						Inventory — Medical Tests
					</h2>
					<p className="text-gray-600 text-sm">Add and manage medical tests and their prices.</p>
				</div>
				<div className="text-right">
					<div className="text-2xl font-bold text-blue-600">{total || items.length}</div>
					<div className="text-sm text-gray-500">Total Tests</div>
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
				<input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search tests..." className="w-full md:w-1/2 px-3 py-2 border rounded" />
			</div>

			<div className="bg-white rounded shadow-sm p-6 mb-6 flex items-center justify-between">
				<div>
					<h4 className="text-lg font-medium">Add tests</h4>
					<p className="text-sm text-gray-500">Use the button to open a modal for adding new tests.</p>
				</div>
				<div>
					<button onClick={() => { resetForm(); setShowModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded shadow transition transform hover:-translate-y-1 hover:shadow-lg hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Add Test
					</button>
				</div>
			</div>

			<div className="bg-white rounded shadow-sm p-6">
				<h3 className="text-lg font-semibold mb-3">Available tests</h3>
				<div className="text-sm text-gray-500 mb-3">Showing page {page} — {total || items.length} items</div>
				{items.length === 0 ? (
					<div className="text-gray-600">No tests yet. Click "Add Test" to create one.</div>
				) : (
					<ul className="space-y-3">
						{items.map((it, idx) => {
							const num = (page - 1) * PER_PAGE + idx + 1;
							return (
								<li key={it.id} className="flex items-center justify-between border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
									<div className="flex items-center gap-3">
										<div className="text-sm text-gray-500 w-8 text-right">{num}.</div>
										<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
										</svg>
										<div>
											<div className="font-medium">{it.name}</div>
											<div className="text-sm text-gray-600">PKR {Number(it.sell_price ?? it.price ?? 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<button onClick={() => startEdit(it)} className="px-3 py-1 rounded border text-sm transition transform hover:-translate-y-0.5 hover:shadow-sm hover:bg-gray-50 flex items-center gap-1">
											<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
											Edit
										</button>
										<button onClick={() => confirmDelete(it)} className="px-3 py-1 rounded bg-red-50 text-red-600 text-sm border transition transform hover:-translate-y-0.5 hover:shadow-sm hover:bg-red-100 flex items-center gap-1">
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
						<h4 className="text-lg font-semibold mb-2">Delete test</h4>
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
								<h4 className="text-lg font-semibold">{editing ? 'Edit Test' : 'Add Test'}</h4>
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
								// duplicate name check (case-insensitive), ignore the currently editing item
								const normalized = name.trim().toLowerCase();
								const duplicate = items.find(it => it.name && it.name.toLowerCase() === normalized && (!editing || it.id !== editing.id));
								if (duplicate) {
									setFieldErrors(f => ({ ...f, name: 'A test with this name already exists' }));
									hasError = true;
								}
								const cpNum = costPrice === '' ? 0 : Number(costPrice);
								const spNum = Number(sellPrice);
								if (costPrice !== '' && (Number.isNaN(cpNum) || cpNum < 0)) {
									setFieldErrors(f => ({ ...f, costPrice: 'Enter a valid non-negative number' }));
									hasError = true;
								}
								if (sellPrice === '' || Number.isNaN(spNum) || spNum < 0) {
									setFieldErrors(f => ({ ...f, sellPrice: 'Enter a valid non-negative sell price' }));
									hasError = true;
								}
								if (hasError) return;
								setLoading(true);
								try {
									const parsedCp = cpNum;
									const parsedSp = spNum;
									if (editing) {
										try {
											const updated = await updateItem(editing.id, { name: name.trim(), cost_price: parsedCp, sell_price: parsedSp });
											setItems(prev => prev.map(it => (it.id === updated.id ? { id: updated.id, name: updated.name, cost_price: updated.cost_price, sell_price: updated.sell_price } : it)));
											setSuccessMessage('Test updated successfully!');
											setTimeout(() => setSuccessMessage(''), 3000);
										} catch (err: any) {
											if (err?.status === 409) {
												setFieldErrors(f => ({ ...f, name: 'A test with this name already exists' }));
												setLoading(false);
												return;
											}
											throw err;
										}
									} else {
										try {
											const created = await createItem({ name: name.trim(), cost_price: parsedCp, sell_price: parsedSp });
											setItems(prev => [{ id: created.id, name: created.name, cost_price: created.cost_price, sell_price: created.sell_price }, ...prev]);
											setSuccessMessage('Test added successfully!');
											setTimeout(() => setSuccessMessage(''), 3000);
										} catch (err: any) {
											if (err?.status === 409) {
												setFieldErrors(f => ({ ...f, name: 'A test with this name already exists' }));
												setLoading(false);
												return;
											}
											throw err;
										}
									}
									setShowModal(false);
									resetForm();
								} catch (err) {
									console.error('save item error', err);
									alert('Failed to save item. See console for details.');
								} finally {
									setLoading(false);
								}
							}} className="grid grid-cols-1 gap-3">
							<div>
								<label className="block text-sm font-medium mb-1">Test name</label>
								<input
									value={name}
									onChange={e => { setName(e.target.value); setFieldErrors(f => ({ ...f, name: undefined })); }}
									onBlur={() => {
										const normalized = name.trim().toLowerCase();
										if (!normalized) return;
										const duplicate = items.find(it => it.name && it.name.toLowerCase() === normalized && (!editing || it.id !== editing.id));
										if (duplicate) {
											setFieldErrors(f => ({ ...f, name: 'A test with this name already exists' }));
										}
									}}
									aria-invalid={!!fieldErrors.name}
									className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
									placeholder="e.g. Complete Blood Count"
								/>
								{fieldErrors.name ? <div className="text-xs text-red-600 mt-1">{fieldErrors.name}</div> : null}
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium mb-1">Cost Price (PKR)</label>
									<input value={costPrice} onChange={e => { setCostPrice(e.target.value); setFieldErrors(f => ({ ...f, costPrice: undefined })); }} inputMode="decimal" pattern="^\d+(\.\d{1,2})?$" type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" placeholder="e.g. 2000" />
									{fieldErrors.costPrice ? <div className="text-xs text-red-600 mt-1">{fieldErrors.costPrice}</div> : null}
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">Sell Price (PKR)</label>
									<input value={sellPrice} onChange={e => { setSellPrice(e.target.value); setFieldErrors(f => ({ ...f, sellPrice: undefined })); }} inputMode="decimal" pattern="^\d+(\.\d{1,2})?$" type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200" placeholder="e.g. 2500" />
									{fieldErrors.sellPrice ? <div className="text-xs text-red-600 mt-1">{fieldErrors.sellPrice}</div> : null}
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
									<span className="font-medium">{editing ? 'Save' : 'Add Test'}</span>
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
				const nextDisabled = totalPages ? page >= totalPages : items.length < PER_PAGE;
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

export default Items;

