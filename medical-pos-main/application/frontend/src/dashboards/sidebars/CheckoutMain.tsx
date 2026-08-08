import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { createSale, listItems, listDoctors, updateSalePayment, getSaleById, getStoreDetails } from '../../routes/api';
import { printReceipt } from '../../utils/printReceipt';
import type { ReceiptData } from '../../utils/printReceipt';
import PartialPaymentModal from './PartialPaymentModal';

const IconTest = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M4 7h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		<path d="M8 7V5a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const IconUser = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		<circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const IconPhone = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
	<svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M22 16.92V21a1 1 0 0 1-1.11 1c-6.22-.93-11.18-5.9-12.11-12.11A1 1 0 0 1 10 7h4.09a1 1 0 0 1 1 .75l.38 2.25a1 1 0 0 1-.27.88l-1.27 1.27a11 11 0 0 0 4.48 4.48l1.27-1.27a1 1 0 0 1 .88-.27l2.25.38a1 1 0 0 1 .75 1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

type GenderOption = '' | 'male' | 'female' | 'other';
type StoreDetails = { name: string; address: string; phone: string };

const CheckoutMain: React.FC = () => {
	const [testName, setTestName] = useState('');
	const [patientName, setPatientName] = useState('');
	const [phone, setPhone] = useState('');
	const [patientGender, setPatientGender] = useState<GenderOption>('');
	const [patientAge, setPatientAge] = useState('');
	const [referredBy, setReferredBy] = useState('');
	const [selectedTests, setSelectedTests] = useState<any[]>([]);
	const [discountType, setDiscountType] = useState<'none' | 'flat' | 'percent'>('none');
	const [discountValue, setDiscountValue] = useState('0');
	const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
	const [doctors, setDoctors] = useState<any[]>([]);
	const [showModal, setShowModal] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [suggestions, setSuggestions] = useState<any[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [saleData, setSaleData] = useState<any>(null);
	const [isPartialPayment, setIsPartialPayment] = useState(false);
	const [paidAmount, setPaidAmount] = useState('0');
	
	// Partial Payment Modal States
	const [showPartialModal, setShowPartialModal] = useState(false);
	const [partialSaleId, setPartialSaleId] = useState('');
	const [partialSaleData, setPartialSaleData] = useState<any>(null);
	const [additionalPayment, setAdditionalPayment] = useState('');
	const [partialSuccessMessage, setPartialSuccessMessage] = useState<string | null>(null);
	const [partialOverlayPhase, setPartialOverlayPhase] = useState<'none' | 'loading' | 'success'>('none');
	const [partialErrorMessage, setPartialErrorMessage] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	
	// Ref to prevent double-click submissions
	const isSubmittingRef = useRef(false);

	// Store information
	const [storeInfo, setStoreInfo] = useState<StoreDetails>(() => {
		if (typeof window !== 'undefined') {
			try {
				return {
					name: localStorage.getItem('storeName') ?? '',
					address: localStorage.getItem('storeAddress') ?? '',
					phone: localStorage.getItem('storePhone') ?? '',
				};
			} catch (err) {
				console.warn('Failed to read cached store info', err);
			}
		}
		return { name: '', address: '', phone: '' };
	});

	const inputRef = useRef<HTMLInputElement>(null);

	const resetPartialModalState = useCallback(() => {
		setPartialSaleId('');
		setPartialSaleData(null);
		setAdditionalPayment('');
		setPartialSuccessMessage(null);
		setPartialOverlayPhase('none');
		setPartialErrorMessage(null);
	}, []);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

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

	useEffect(() => {
		let ignore = false;
		const fetchStoreDetails = async () => {
			try {
				const data = await getStoreDetails();
				if (!ignore) {
					setStoreInfo(data);
					try {
						localStorage.setItem('storeName', data.name);
						localStorage.setItem('storeAddress', data.address);
						localStorage.setItem('storePhone', data.phone);
					} catch (err) {
						console.warn('Failed to cache store info', err);
					}
				}
			} catch (err) {
				console.warn('Failed to fetch store details', err);
			}
		};
		fetchStoreDetails();
		return () => {
			ignore = true;
		};
	}, []);

	const remainingPartialAmount = partialSaleData ? Number(partialSaleData.remaining_amount ?? 0) : 0;
	const saleHasOutstandingBalance = !!partialSaleData && remainingPartialAmount > 0;
	const saleAllowsAdditionalPayment = saleHasOutstandingBalance && (partialSaleData?.is_partial ?? false);

	const computedFinal = useMemo(() => {
		const base = selectedTests.reduce((sum, test) => sum + Number(test.sell_price ?? test.sellPrice ?? 0), 0);
		const disc = parseFloat(discountValue || '0') || 0;
		let finalAmt = base;
		if (discountType === 'percent') finalAmt = base - (base * disc) / 100;
		else if (discountType === 'flat') finalAmt = base - disc;
		if (finalAmt < 0) finalAmt = 0;
		return finalAmt;
	}, [selectedTests, discountType, discountValue]);

	const searchTests = async (query: string) => {
		try {
			// If query is empty, load all tests (or a reasonable subset)
			const searchQuery = query.trim() || '';
			const res = await listItems(searchQuery, 1, query.trim() ? 10 : 20);
			const items = res?.items ?? [];
			setSuggestions(items);
			setShowSuggestions(true);
		} catch (err) {
			console.error('Error searching tests:', err);
			setSuggestions([]);
			setShowSuggestions(false);
		}
	};

	const handleTestNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setTestName(value);
		setMessage(null);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => searchTests(value), 300);
	};

	const handleInputFocus = () => {
		if (suggestions.length > 0) {
			setShowSuggestions(true);
		} else {
			// Load all tests when clicking the dropdown for the first time
			searchTests('');
		}
	};

	const selectSuggestion = (item: any) => {
		const normalized = {
			...item,
			id: item._id ?? item.id,
			sell_price: item.sell_price ?? item.sellPrice ?? item.price ?? 0,
			cost_price: item.cost_price ?? item.costPrice ?? item.cost ?? 0,
		};
		setSelectedTests(prev => {
			if (prev.some(test => (test.id ?? test._id) === (normalized.id ?? normalized._id))) {
				setMessage('This test is already selected');
				return prev;
			}
			return [...prev, normalized];
		});
		setTestName('');
		setShowSuggestions(false);
		setSuggestions([]);
		setMessage(null);
		inputRef.current?.focus();
	};



	const openModal = (e: React.FormEvent) => {
		e.preventDefault();
		if (selectedTests.length === 0) {
			setMessage('Please select at least one test');
			return;
		}
		setShowModal(true);
	};

	const doCreateSale = async (withReceipt: boolean) => {
		// Prevent double-click submissions using ref (immediate check)
		if (isSubmittingRef.current) {
			return;
		}
		
		// Validate phone number before submission
		if (!phone || !phone.trim()) {
			setMessage('Phone number is required');
			return;
		}
		
		isSubmittingRef.current = true;
		setSubmitting(true);
		setMessage(null);

		try {
			const subtotal = selectedTests.reduce((sum, test) => sum + Number(test.sell_price ?? test.sellPrice ?? 0), 0);
			let discountAmount = 0;
			let discountLabel = '';
			if (discountType === 'percent') {
				const disc = parseFloat(discountValue) || 0;
				discountAmount = (subtotal * disc) / 100;
				discountLabel = `${disc}%`;
			} else if (discountType === 'flat') {
				discountAmount = parseFloat(discountValue) || 0;
				discountLabel = `Rs ${discountAmount}`;
			}

			// Calculate paid amount and handle partial payment logic
			let paidAmountValue = isPartialPayment ? parseFloat(paidAmount) || 0 : computedFinal;
			
			// Ensure paid amount doesn't exceed final amount
			if (paidAmountValue > computedFinal) {
				paidAmountValue = computedFinal;
			}
			
			// If paid amount equals or exceeds final amount, treat as full payment
			const isActuallyPartial = isPartialPayment && paidAmountValue < computedFinal;
			const remainingAmount = isActuallyPartial ? computedFinal - paidAmountValue : 0;

			// Create a sale with all selected tests
			const salePayload = {
				tests: selectedTests.map(test => ({
					name: test.name,
				sell_price: Number(test.sell_price ?? test.sellPrice ?? 0),
				cost_price: Number(test.cost_price ?? test.costPrice ?? 0),
			})),
			patient_name: patientName || 'Walk-in Customer',
			phone: phone || '',
			patient_gender: patientGender || undefined,
			patient_age: patientAge ? parseInt(patientAge) : undefined,
			hospital_name: referredBy || undefined,
			subtotal,
			discount_type: discountType !== 'none' ? discountType : undefined,
			discount_value: discountType !== 'none' ? parseFloat(discountValue) : undefined,
			discount_amount: discountAmount,
				final_amount: computedFinal,
				with_receipt: withReceipt,
				doctor_id: selectedDoctor?.id || undefined,
				doctor_name: selectedDoctor?.name || undefined,
				doctor_commission_type: selectedDoctor?.commission_type || undefined,
				doctor_commission_value: selectedDoctor?.commission_value || undefined,
				is_partial: isActuallyPartial,
				paid_amount: paidAmountValue,
				remaining_amount: remainingAmount,
			};

			const result = await createSale(salePayload);
			const saleId = result.sale_id;

			setSaleData({
				sale_id: saleId,
				test_names: selectedTests.map(test => test.name),
				patient_name: patientName || 'Walk-in Customer',
				doctor_name: selectedDoctor?.name || 'N/A',
				final_amount: computedFinal,
				with_receipt: withReceipt,
				is_partial: isActuallyPartial,
				paid_amount: paidAmountValue,
				remaining_amount: remainingAmount,
		});

		setShowSuccessModal(true);

		if (withReceipt) {
			const receiptData: ReceiptData = {
				patientName: patientName || 'Walk-in Customer',
				patientPhone: phone || undefined,
				patientGender: patientGender || undefined,
				patientAge: patientAge ? parseInt(patientAge) : undefined,
				referredBy: referredBy || undefined,
				doctorName: selectedDoctor?.name || 'N/A',
				date: new Date(),
				tests: selectedTests.map(test => ({
					name: test.name,
					sell_price: Number(test.sell_price ?? test.sellPrice ?? 0),
				})),
				subtotal,
					discountAmount,
					discountLabel,
					total: computedFinal,
					storeName: storeInfo.name,
					storeAddress: storeInfo.address,
					storePhone: storeInfo.phone,
					saleId,
					isPartial: isActuallyPartial,
					paidAmount: paidAmountValue,
					remainingAmount,
					printerNotes: isActuallyPartial ? 'Pending balance must be cleared before report delivery.' : undefined,
				};
				printReceipt(receiptData);
			}

			// Clear form
			setTestName('');
			setPatientName('');
			setPhone('');
			setPatientGender('');
			setPatientAge('');
			setReferredBy('');
			setSelectedTests([]);
			setDiscountType('none');
			setDiscountValue('0');
			setIsPartialPayment(false);
			setPaidAmount('0');
			setShowModal(false);
			setSuggestions([]);
			setShowSuggestions(false);
		} catch (err: any) {
			let msg = 'Failed to create sale';
			
			if (err?.data?.detail) {
				if (Array.isArray(err.data.detail)) {
					// If detail is an array of validation errors
					msg = err.data.detail.map((error: any) => {
						if (typeof error === 'string') return error;
						if (error.msg) return error.msg;
						if (error.message) return error.message;
						return JSON.stringify(error);
					}).join(', ');
				} else if (typeof err.data.detail === 'string') {
					msg = err.data.detail;
				} else {
					msg = JSON.stringify(err.data.detail);
				}
			} else if (err?.data) {
				if (typeof err.data === 'string') {
					msg = err.data;
				} else {
					msg = JSON.stringify(err.data);
				}
			} else if (err?.message) {
				msg = err.message;
			}
			
			setMessage(msg);
		} finally {
			setSubmitting(false);
			isSubmittingRef.current = false;
		}
	};

	return (
		<div className="p-4">
			<h2 className="text-2xl font-bold mb-3 flex items-center gap-3"><IconTest /> Checkout</h2>
			<p className="text-gray-600 mb-4">Create a sale and optionally print a receipt.</p>
			
			<div className="mb-6">
				<button 
					onClick={() => setShowPartialModal(true)}
					className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 hover:scale-105 hover:shadow-lg transition-all duration-200 font-medium flex items-center gap-2"
				>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
					</svg>
					Partial Payments
				</button>
			</div>

			{/* Message Display */}
			{message && (
				<div className="mb-6 max-w-lg">
					<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
						<div className="flex items-center">
							<svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<p className="text-red-700 font-medium text-sm">Alert</p>
								<p className="text-red-600 text-sm">{message}</p>
							</div>
							<button
								onClick={() => setMessage(null)}
								className="ml-auto text-red-500 hover:text-red-700 p-1"
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
				</div>
			)}

			<form className="space-y-6 max-w-lg" onSubmit={openModal}>
				<div className="relative">
					<label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
						<IconTest className="w-4 h-4 text-purple-600" />
						Select Test
					</label>
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
							<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<input 
							ref={inputRef}
							value={testName} 
							onChange={handleTestNameChange} 
							onFocus={handleInputFocus}
							onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} 
							className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md" 
							placeholder="Click to browse tests or start typing to search..." 
						/>
						{testName && (
							<button
								type="button"
								onClick={() => {
									setTestName('');
									setShowSuggestions(false);
									setSuggestions([]);
									inputRef.current?.focus();
								}}
								className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						)}
					</div>
					{showSuggestions && suggestions.length > 0 && (
						<div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
							<div className="p-2 bg-gray-50 border-b border-gray-100">
								<p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Available Tests ({suggestions.length})</p>
							</div>
							{suggestions.map((item, index) => (
								<div
									key={item._id || index}
									onMouseDown={() => selectSuggestion(item)}
									className="px-4 py-3 hover:bg-purple-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors duration-150 hover:shadow-sm"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3 flex-1 min-w-0">
											<div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
												<IconTest className="w-4 h-4 text-purple-600" />
											</div>
											<div className="flex-1 min-w-0 pr-2">
												<p className="font-medium text-gray-800 break-all overflow-wrap-anywhere leading-relaxed py-1">
													{item.name}
												</p>
												{item.code && (
													<p className="text-xs text-gray-500 break-all overflow-wrap-anywhere">Code: {item.code}</p>
												)}
											</div>
										</div>
										<div className="text-right flex-shrink-0 ml-3">
											<p className="font-semibold text-green-600 whitespace-nowrap">Rs {Number(item.sell_price ?? item.sellPrice ?? item.price ?? 0).toFixed(2)}</p>
											<p className="text-xs text-gray-500 whitespace-nowrap">Click to add</p>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
					{showSuggestions && suggestions.length === 0 && testName.trim() && (
						<div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
							<div className="p-4 text-center text-gray-500">
								<svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.674-2.583M15 9.34c0-3.87-3.13-7-7-7s-7 3.13-7 7M15 9.34V12a3 3 0 11-6 0V9.34" />
								</svg>
								<p className="text-sm font-medium">No tests found</p>
								<p className="text-xs">Try a different search term</p>
							</div>
						</div>
					)}
				</div>

				<div className="flex flex-wrap gap-3">
					{selectedTests.length > 0 && (
						<button type="submit" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 hover:scale-105 hover:shadow-lg transition-all duration-200 font-medium flex items-center gap-2">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
							</svg>
							Proceed to Checkout ({selectedTests.length})
						</button>
					)}
					{selectedTests.length > 0 && (
						<button type="button" onClick={() => { 
							setTestName(''); 
							setSelectedTests([]); 
							setMessage(null); 
							setSuggestions([]); 
							setShowSuggestions(false);
							setSelectedDoctor(null);
							setIsPartialPayment(false);
							setPaidAmount('0');
							inputRef.current?.focus();
						}} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:scale-105 hover:shadow-md transition-all duration-200 font-medium flex items-center gap-2">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							Clear All
						</button>
					)}
				</div>
			</form>

			{/* Selected Tests Display */}
			{selectedTests.length > 0 && (
				<div className="mt-8 max-w-lg">
					<div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-100 shadow-sm">
						<h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
							<div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
								<IconTest className="w-4 h-4 text-white" />
							</div>
							Selected Tests ({selectedTests.length})
						</h3>
						<div className="space-y-3 mb-4">
							{selectedTests.map((test, index) => (
								<div key={test._id || index} className="flex items-start justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
									<div className="flex items-start gap-4 flex-1 min-w-0 pr-2">
										<div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
											<IconTest className="w-5 h-5 text-purple-600" />
										</div>
										<div className="flex-1 min-w-0">
											<div className="font-semibold text-gray-800 break-all overflow-wrap-anywhere leading-relaxed py-0.5">
												{test.name}
											</div>
											{test.code && (
												<div className="text-sm text-gray-500 break-all overflow-wrap-anywhere mt-1">Code: {test.code}</div>
											)}
										</div>
									</div>
									<div className="flex items-center gap-3 flex-shrink-0">
										<div className="text-right">
											<div className="font-bold text-green-600 whitespace-nowrap">Rs {Number(test.sell_price ?? test.sellPrice ?? 0).toFixed(2)}</div>
											<div className="text-xs text-gray-500">Price</div>
										</div>
										<button
											onClick={() => setSelectedTests(prev => prev.filter((_, i) => i !== index))}
											className="w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
											title="Remove test"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								</div>
							))}
						</div>
						<div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
							<div className="flex justify-between items-center">
								<div className="flex items-center gap-2">
									<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
									</svg>
									<span className="font-semibold text-green-800">Subtotal:</span>
								</div>
								<span className="text-2xl font-bold text-green-600">
									Rs {selectedTests.reduce((sum, test) => sum + Number(test.sell_price ?? test.sellPrice ?? 0), 0).toFixed(2)}
								</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Success Modal */}
			{showSuccessModal && saleData && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)} />
					<div className="bg-white rounded-2xl shadow-2xl p-8 z-10 w-full max-w-md mx-4 transform transition-all duration-300 scale-100 hover:scale-105">
						<div className="text-center">
							<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 transform transition-all duration-300 hover:scale-110 hover:bg-green-200">
								<svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
								</svg>
							</div>
							
							<h3 className="text-2xl font-bold text-gray-800 mb-2">Sale Created Successfully!</h3>
							<p className="text-gray-600 mb-6">The sale has been recorded in the system.</p>
							
							<div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-gray-600">Sales Created:</span>
									<span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">{saleData.sale_id}</span>
								</div>
								<div className="space-y-2">
									<span className="text-gray-600 font-medium">Tests:</span>
									<div className="bg-white rounded-lg border p-3 space-y-2 max-w-full">
										{saleData.test_names.map((testName: string, index: number) => (
											<div key={index} className="text-sm">
												<div className="font-medium text-gray-800 break-all overflow-wrap-anywhere leading-relaxed">
													{testName}
												</div>
											</div>
										))}
									</div>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-gray-600">Patient:</span>
									<span className="font-medium">{saleData.patient_name}</span>
								</div>
								{saleData.doctor_name && (
									<div className="flex justify-between items-center">
										<span className="text-gray-600">Doctor:</span>
										<span className="font-medium">{saleData.doctor_name}</span>
									</div>
								)}
								<div className="flex justify-between items-center">
									<span className="text-gray-600">Total Amount:</span>
									<span className="font-medium text-green-600">Rs {saleData.final_amount?.toFixed(2)}</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-gray-600">Receipt:</span>
									<span className={`font-medium ${saleData.with_receipt ? 'text-green-600' : 'text-gray-500'}`}>
										{saleData.with_receipt ? 'Generated' : 'Not Generated'}
									</span>
								</div>
							</div>
							
							<div className="flex gap-3 justify-center">
								<button 
									onClick={() => setShowSuccessModal(false)}
									className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:scale-105 hover:shadow-lg transition-all duration-200 font-medium"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Modal */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
					<div className="bg-white rounded-xl shadow-2xl p-6 z-10 w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
						<h3 className="text-lg font-semibold mb-3">Confirm Sale</h3>
						
						{message && (
							<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
								<div className="flex items-center">
									<svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span className="text-red-700 text-sm">{message}</span>
								</div>
							</div>
						)}
						
						<div className="space-y-4 mb-4">
							{/* Selected Tests */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<h4 className="text-sm font-medium text-gray-700">Selected Tests ({selectedTests.length})</h4>
									<span className="text-xs text-gray-500">Click to remove</span>
								</div>
								<div className="space-y-2 max-h-32 overflow-y-auto">
									{selectedTests.map((test, index) => (
										<div key={test._id || index} className="flex items-start justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
											<div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
												<IconTest className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
												<div className="min-w-0 flex-1">
													<div className="font-medium text-sm break-all overflow-wrap-anywhere leading-relaxed py-0.5">
														{test.name}
													</div>
													<div className="text-xs text-gray-600 mt-1">Rs {Number(test.sell_price ?? test.sellPrice ?? 0).toFixed(2)}</div>
												</div>
											</div>
											<button
												onClick={() => setSelectedTests(prev => prev.filter((_, i) => i !== index))}
												className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0 ml-2 mt-0.5"
												title="Remove test"
											>
												<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										</div>
									))}
								</div>
								{selectedTests.length === 0 && (
									<div className="text-center py-4 text-gray-500">
										No tests selected
									</div>
								)}
							</div>

							{/* Total Amount */}
							<div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
								<span className="text-sm font-medium text-gray-700">Total Amount:</span>
								<span className="font-semibold text-blue-600">
									Rs {computedFinal.toFixed(2)}
								</span>
							</div>
							<div className="relative">
								<label className="block text-sm font-medium mb-1">Patient Name</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<IconUser />
									</div>
									<input value={patientName} onChange={e => setPatientName(e.target.value)} className="w-full pl-10 px-3 py-2 border rounded" />
								</div>
							</div>
							<div className="relative">
								<label className="block text-sm font-medium mb-1">Phone</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<IconPhone />
									</div>
									<input value={phone} onChange={e => setPhone(e.target.value)} className="w-full pl-10 px-3 py-2 border rounded" />
								</div>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium mb-1">Gender</label>
									<select
										value={patientGender}
										onChange={e => setPatientGender(e.target.value as GenderOption)}
										className="w-full px-3 py-2 border rounded"
									>
										<option value="">Select gender</option>
										<option value="male">Male</option>
										<option value="female">Female</option>
										<option value="other">Other</option>
									</select>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1">Age</label>
								<input
									type="number"
									value={patientAge}
									onChange={e => setPatientAge(e.target.value)}
									className="w-full px-3 py-2 border rounded"
									placeholder="Enter age"
									min="0"
									max="150"
								/>
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label className="block text-sm font-medium mb-1">Referred By</label>
								<input
									value={referredBy}
									onChange={e => setReferredBy(e.target.value)}
									className="w-full px-3 py-2 border rounded"
									placeholder="e.g. Alex"
								/>
							</div>
						</div>
						<div className="relative">
							<label className="block text-sm font-medium mb-1">Doctor</label>
							<select 
								value={selectedDoctor?.id || ''} 
								onChange={e => {
										const doctor = doctors.find(d => d.id === e.target.value);
										setSelectedDoctor(doctor);
									}} 
									className="w-full px-3 py-2 border rounded"
								>
									<option value="">Select doctor</option>
									{doctors.map(doctor => (
										<option key={doctor.id} value={doctor.id}>
											{doctor.name}
										</option>
									))}
								</select>
								{doctors.length === 0 && <div className="text-xs text-gray-500 mt-1">No doctors found</div>}
							</div>
							<div className="grid grid-cols-3 gap-2 items-end">
								<div>
									<label className="block text-sm font-medium mb-1">Discount Type</label>
									<select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className="w-full px-3 py-2 border rounded">
										<option value="none">None</option>
										<option value="percent">Percent</option>
										<option value="flat">Flat</option>
									</select>
								</div>
								<div className="col-span-2">
									<label className="block text-sm font-medium mb-1">Discount Value</label>
									<input value={discountValue} onChange={e => setDiscountValue(e.target.value)} type="number" min="0" step="0.01" className="w-full px-3 py-2 border rounded" />
								</div>
							</div>
							<div className="flex items-center gap-3">
								<input type="checkbox" id="partial" checked={isPartialPayment} onChange={e => setIsPartialPayment(e.target.checked)} />
								<label htmlFor="partial" className="text-sm font-medium">Partial Payment</label>
							</div>
							{isPartialPayment && (
								<div>
									<label className="block text-sm font-medium mb-1">
										Paid Amount 
										<span className="text-xs text-gray-500 ml-2">(Max: Rs {computedFinal.toFixed(2)})</span>
									</label>
									<input 
										value={paidAmount} 
										onChange={e => {
											const inputValue = e.target.value;
											// Allow only numbers and decimal point
											if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
												const value = parseFloat(inputValue) || 0;
												// Limit the input to the final amount
												if (inputValue === '' || value <= computedFinal) {
													setPaidAmount(inputValue);
												} else {
													setPaidAmount(computedFinal.toString());
												}
											}
										}} 
										type="text"
										inputMode="decimal"
										pattern="[0-9]*\.?[0-9]*"
										className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" 
										placeholder={`Enter amount up to ${computedFinal.toFixed(2)}`}
									/>
									{parseFloat(paidAmount) >= computedFinal && (
										<p className="text-xs text-green-600 mt-1">Full payment - will be marked as paid</p>
									)}
									{parseFloat(paidAmount) > 0 && parseFloat(paidAmount) < computedFinal && (
										<p className="text-xs text-orange-600 mt-1">Remaining: Rs {(computedFinal - parseFloat(paidAmount)).toFixed(2)}</p>
									)}
								</div>
							)}
							<div className="flex items-center gap-3"><div className="text-sm text-gray-500">Final Amount</div><div className="font-medium">Rs {computedFinal.toFixed(2)}</div></div>
							{isPartialPayment && parseFloat(paidAmount) < computedFinal && (
								<div className="flex items-center gap-3">
									<div className="text-sm text-gray-500">Remaining Amount</div>
									<div className="font-medium text-orange-600">Rs {(computedFinal - (parseFloat(paidAmount) || 0)).toFixed(2)}</div>
								</div>
							)}
							{isPartialPayment && parseFloat(paidAmount) >= computedFinal && (
								<div className="flex items-center gap-3">
									<div className="text-sm text-gray-500">Payment Status</div>
									<div className="font-medium text-green-600">✓ Fully Paid</div>
								</div>
							)}
						</div>

						<div className="flex justify-end gap-3">
							<button onClick={() => setShowModal(false)} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 hover:scale-105 hover:shadow-md transition-all duration-200">Cancel</button>
							<button 
								onClick={() => doCreateSale(false)} 
								disabled={submitting || selectedTests.length === 0} 
								className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-white hover:scale-105 hover:shadow-md transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100"
							>
								Without receipt
							</button>
							<button 
								onClick={() => doCreateSale(true)} 
								disabled={submitting || selectedTests.length === 0} 
								className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white hover:scale-105 hover:shadow-md transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100"
							>
								With receipt
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Partial Payment Modal */}
			<PartialPaymentModal
				show={showPartialModal}
				onClose={() => setShowPartialModal(false)}
				saleData={partialSaleData}
				saleId={partialSaleId}
				additionalPayment={additionalPayment}
				setAdditionalPayment={setAdditionalPayment}
				successMessage={partialSuccessMessage}
				overlayPhase={partialOverlayPhase}
				setOverlayPhase={setPartialOverlayPhase}
				resetModalState={resetPartialModalState}
				saleAllowsAdditionalPayment={saleAllowsAdditionalPayment}
				remainingPartialAmount={remainingPartialAmount}
				updateSalePayment={updateSalePayment}
				storeInfo={storeInfo}
				getSaleById={getSaleById}
				setSaleData={setPartialSaleData}
				setSaleId={setPartialSaleId}
				errorMessage={partialErrorMessage}
				setErrorMessage={setPartialErrorMessage}
			/>
		</div>
	);
};

export default CheckoutMain;