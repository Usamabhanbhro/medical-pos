import React, { useRef } from 'react';
import { printReceipt, type ReceiptData } from '../../utils/printReceipt';

interface PartialPaymentModalProps {
  show: boolean;
  onClose: () => void;
  saleData: any;
  saleId: string;
  additionalPayment: string;
  setAdditionalPayment: (val: string) => void;
  successMessage: string | null;
  overlayPhase: 'none' | 'loading' | 'success';
  setOverlayPhase: (val: 'none' | 'loading' | 'success') => void;
  resetModalState: () => void;
  saleAllowsAdditionalPayment: boolean;
  remainingPartialAmount: number;
  updateSalePayment: (saleId: string, amount: number, options?: { withReceipt?: boolean }) => Promise<any>;
  storeInfo: { name: string; address: string; phone: string };
  getSaleById: (saleId: string) => Promise<any>;
  setSaleData: (data: any) => void;
  setSaleId: (id: string) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
}

const PartialPaymentModal: React.FC<PartialPaymentModalProps> = ({
  show,
  onClose,
  saleData,
  saleId,
  additionalPayment,
  setAdditionalPayment,
  successMessage,
  overlayPhase,
  setOverlayPhase,
  resetModalState,
  saleAllowsAdditionalPayment,
  remainingPartialAmount,
  updateSalePayment,
  storeInfo,
  getSaleById,
  setSaleData,
  setSaleId,
  errorMessage,
  setErrorMessage,
}) => {
  // Refs to prevent double-click submissions
  const isFetchingRef = useRef(false);
  const isUpdatingRef = useRef(false);
  
  const buildReceiptPayload = (sale: any, latestPayment: number): ReceiptData => {
    const toNumber = (value: any, fallback = 0) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const normalizedLatest = Math.max(toNumber(latestPayment, 0), 0);

    const testsArray = Array.isArray(sale?.tests) ? sale.tests : [];
    const mappedTests: ReceiptData['tests'] = testsArray.length > 0
      ? testsArray.map((item: any) => ({
          name: String(item?.name ?? item?.test_name ?? sale?.test_name ?? 'Test'),
          sell_price: toNumber(item?.sell_price ?? item?.amount ?? item?.price, 0),
        }))
      : [{
          name: String(sale?.test_name ?? 'Test'),
          sell_price: toNumber(sale?.final_amount ?? sale?.subtotal ?? normalizedLatest, normalizedLatest),
        }];

    const subtotal = (() => {
      const explicit = toNumber(sale?.subtotal, NaN);
      if (!Number.isNaN(explicit) && explicit > 0) return explicit;
      return mappedTests.reduce((sum: number, test: ReceiptData['tests'][number]) => sum + toNumber(test.sell_price, 0), 0);
    })();

    const total = (() => {
      const explicit = toNumber(sale?.final_amount, NaN);
      if (!Number.isNaN(explicit) && explicit >= 0) return explicit;
      return subtotal;
    })();

    const totalPaidAfter = Math.max(toNumber(sale?.paid_amount, normalizedLatest), normalizedLatest);
    const previousPaidAmount = Math.max(totalPaidAfter - normalizedLatest, 0);
    const remainingAmount = Math.max(toNumber(sale?.remaining_amount, Math.max(total - totalPaidAfter, 0)), 0);

    const discountAmount = (() => {
      const explicit = toNumber(sale?.discount_amount, NaN);
      if (!Number.isNaN(explicit)) return Math.max(explicit, 0);
      return Math.max(subtotal - total, 0);
    })();

    const discountLabel = (() => {
      const dtype = sale?.discount_type;
      const dval = sale?.discount_value;
      if (!dtype || dval === undefined || dval === null) return undefined;
      const numVal = toNumber(dval, 0);
      if (dtype === 'percent') return `${numVal}%`;
      if (dtype === 'flat') return `Rs ${numVal.toFixed(2)}`;
      return undefined;
    })();

    const stillPartial = remainingAmount > 0;

    return {
      patientName: sale?.patient_name ?? 'Walk-in Customer',
      patientGender: sale?.patient_gender ?? undefined,
      patientAge: sale?.patient_age ?? undefined,
      patientPhone: sale?.phone ?? undefined,
      referredBy: sale?.hospital_name ?? undefined,
      doctorName: sale?.doctor_name ?? 'N/A',
      date: new Date(),
      tests: mappedTests,
      subtotal,
      discountAmount,
      discountLabel,
      total,
      storeName: storeInfo.name,
      storeAddress: storeInfo.address,
  storePhone: storeInfo.phone,
      saleId: sale?.sale_id ?? '',
      isPartial: stillPartial,
      paidAmount: normalizedLatest,
      remainingAmount,
      previousPaidAmount,
      latestPaymentAmount: normalizedLatest,
      totalPaidAmount: totalPaidAfter,
    };
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl p-8 z-10 w-full max-w-lg mx-auto transform transition-all duration-300 scale-100 relative">
        {/* Loading Overlay */}
        {overlayPhase === 'loading' && (
          <div className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Processing Payment</h3>
            <p className="text-gray-600 text-center">Please wait while we update your payment...</p>
          </div>
        )}
        {/* Success Overlay */}
        {overlayPhase === 'success' && (
          <div className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center z-50">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Payment Updated!</h3>
            <p className="text-green-600 text-center">{successMessage}</p>
            <div className="mt-4 text-sm text-gray-500">Closing automatically...</div>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Partial Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-red-700 font-medium text-sm">Error</p>
                <p className="text-red-600 text-sm">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="ml-auto text-red-500 hover:text-red-700 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {!saleData ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sale ID</label>
              <div className="relative">
                <input
                  value={saleId}
                  onChange={e => setSaleId(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter sale ID (e.g., 2025-000016)"
                />
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={async () => {
                  // Prevent double-click
                  if (isFetchingRef.current) return;
                  isFetchingRef.current = true;
                  try {
                    setErrorMessage(null);
                    const sale = await getSaleById(saleId);
                    setSaleData(sale);
                    const remaining = Number(sale?.remaining_amount ?? 0);
                    setAdditionalPayment(remaining > 0 ? String(remaining) : '');
                  } catch (err: any) {
                    setErrorMessage('Sale not found or error: ' + (err?.data?.detail || 'Unknown error'));
                  } finally {
                    isFetchingRef.current = false;
                  }
                }}
                disabled={isFetchingRef.current}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 hover:scale-105 hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fetch Sale Details
              </button>
              <button
                onClick={() => {
                  resetModalState();
                  onClose();
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:scale-105 hover:shadow-md transition-all duration-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Sale Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Test:</span>
                  <p className="text-gray-800 font-medium break-all overflow-wrap-anywhere leading-relaxed py-1">
                    {saleData.test_name}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Patient:</span>
                  <p className="text-gray-800 font-medium">{saleData.patient_name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Phone:</span>
                  <p className="text-gray-800">{saleData.phone}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Total Amount:</span>
                  <p className="text-gray-800 font-semibold">Rs {saleData.final_amount?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Paid:</span>
                  <p className="text-green-600 font-semibold">Rs {saleData.paid_amount?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Remaining:</span>
                  <p className="text-red-600 font-semibold">Rs {saleData.remaining_amount?.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {saleAllowsAdditionalPayment ? (
              <>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Additional Payment Amount</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-medium">Rs</span>
                    </div>
                    <input
                      value={additionalPayment}
                      onChange={e => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setAdditionalPayment('');
                          return;
                        }
                        let numeric = parseFloat(raw);
                        if (Number.isNaN(numeric)) {
                          setAdditionalPayment('');
                          return;
                        }
                        numeric = Math.min(Math.max(numeric, 0), remainingPartialAmount);
                        const normalized = Math.round(numeric * 100) / 100;
                        setAdditionalPayment(normalized.toString());
                      }}
                      type="number"
                      min="0"
                      max={remainingPartialAmount}
                      step="0.01"
                      disabled={overlayPhase !== 'none'}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter payment amount"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Maximum: Rs {remainingPartialAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                </div>

                {/* Error messages only (non-overlay errors) */}
                {successMessage && overlayPhase === 'none' && (successMessage.includes('Error') || successMessage.includes('error')) && (
                  <div className="p-3 rounded-lg border text-sm font-medium bg-red-50 border-red-200 text-red-700">
                    {successMessage}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={async () => {
                      // Prevent double-click submissions
                      if (isUpdatingRef.current) return;
                      isUpdatingRef.current = true;
                      
                      setErrorMessage(null);
                      if (!saleAllowsAdditionalPayment) {
                        setOverlayPhase('none');
                        isUpdatingRef.current = false;
                        return;
                      }

                      const amount = parseFloat(additionalPayment);
                      if (Number.isNaN(amount) || amount <= 0) {
                        setErrorMessage('Please enter an amount greater than zero.');
                        isUpdatingRef.current = false;
                        return;
                      }
                      if (amount > remainingPartialAmount) {
                        setAdditionalPayment(remainingPartialAmount.toString());
                        setErrorMessage('Amount exceeds remaining balance.');
                        isUpdatingRef.current = false;
                        return;
                      }

                      const normalizedAmount = Math.round(amount * 100) / 100;
                      setOverlayPhase('loading');
                      try {
                        const updatedSale = await updateSalePayment(saleData.sale_id, normalizedAmount, { withReceipt: true });
                        setSaleData(updatedSale);

                        const receiptPayload = buildReceiptPayload(updatedSale, normalizedAmount);
                        printReceipt(receiptPayload);

                        setOverlayPhase('success');
                        setAdditionalPayment('');
                        setTimeout(() => {
                          resetModalState();
                          isUpdatingRef.current = false;
                          onClose();
                        }, 2000);
                      } catch (err: any) {
                        setOverlayPhase('none');
                        isUpdatingRef.current = false;
                        setErrorMessage('Failed to update payment: ' + (err?.data?.detail || err?.message || 'Unknown error'));
                      }
                    }}
                    disabled={!saleAllowsAdditionalPayment || !additionalPayment || parseFloat(additionalPayment) <= 0 || overlayPhase !== 'none' || isUpdatingRef.current}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 hover:scale-105 hover:shadow-lg transition-all duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {overlayPhase === 'loading' ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </div>
                    ) : (
                      'Update Payment'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSaleData(null);
                      setAdditionalPayment('');
                    }}
                    disabled={overlayPhase !== 'none'}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:scale-105 hover:shadow-md transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    Back
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                      <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856C19.403 19 20 18.403 20 17.586V6.414C20 5.597 19.403 5 18.586 5H5.414C4.597 5 4 5.597 4 6.414v11.172C4 18.403 4.597 19 5.414 19z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-base font-semibold text-gray-800">No additional payment required</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        This sale is either fully settled or wasn't marked for partial payments, so no extra amount can be collected here.
                        If the customer still owes a balance, recreate the sale with the partial payment option enabled from the checkout screen.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setSaleData(null);
                      setAdditionalPayment('');
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:scale-105 hover:shadow-md transition-all duration-200 font-medium"
                  >
                    Search another sale
                  </button>
                  <button
                    onClick={() => {
                      resetModalState();
                      onClose();
                    }}
                    className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 hover:scale-105 hover:shadow-md transition-all duration-200 font-medium"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartialPaymentModal;
