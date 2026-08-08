import { getErrorMessage } from '../../utils/error';
import React, { useState, useEffect } from 'react';
import { getPatients, updatePatient, deletePatient, deletePatientTest } from '../../routes/api';

interface Patient {
  id: string;
  phone: string;
  name: string;
  tests: Array<{
    test_name: string;
    amount: number;
    date: string;
    sale_id: string;
    paid_amount?: number;
    remaining_amount?: number;
    is_partial?: boolean;
  }>;
  created_at: string;
}

// Icons
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

const IconCalendar = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconRupee = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 3h12l-1 3H7l1 3h10l-1 3H8l1 3h9l-2 6H6l2-6H5l1-3h2l-1-3H5L6 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconEdit = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconTrash = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 11v6m-4-6v6m-4-6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSearch = ({ className = 'w-5 h-5 text-gray-500' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PatientHistory: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showTestDeleteConfirm, setShowTestDeleteConfirm] = useState<{ patientId: string; saleId: string } | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);

  useEffect(() => {
    fetchPatients();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    // Reset to page 1 when search term changes
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await getPatients(currentPage, 9, searchTerm);
      setPatients(data.patients || []);
      setTotalPages(data.total_pages || 1);
      setTotalPatients(data.total || 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Request failed'))
    } finally {
      setLoading(false);
    }
  };

  const formatPakistanTime = (dateString: string) => {
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

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setEditForm({ name: patient.name, phone: patient.phone });
  };

  const handleUpdate = async () => {
    if (!editingPatient) return;

    try {
      await updatePatient(editingPatient.id, editForm);
      setPatients(patients.map(p =>
        p.id === editingPatient.id ? { ...p, ...editForm } : p
      ));
      setEditingPatient(null);
      setEditForm({ name: '', phone: '' });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Request failed'))
    }
  };

  const handleDelete = async (patientId: string) => {
    try {
      await deletePatient(patientId);
      setPatients(patients.filter(p => p.id !== patientId));
      setShowDeleteConfirm(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Request failed'))
    }
  };

  const handleDeleteTest = async (patientId: string, saleId: string) => {
    try {
      await deletePatientTest(patientId, saleId);
      setPatients(patients.map(p =>
        p.id === patientId
          ? { ...p, tests: p.tests.filter(t => t.sale_id !== saleId) }
          : p
      ));
      setShowTestDeleteConfirm(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Request failed'))
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700">Error: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <IconUser className="w-8 h-8 text-blue-600" />
        <h2 className="text-3xl font-bold text-gray-800">Patient History</h2>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors duration-200 flex items-center gap-2"
          >
            <IconSearch className="w-4 h-4" />
            Search
          </button>
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:outline-none transition-colors duration-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-12">
          <IconUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {searchTerm ? 'No patients found matching your search.' : 'No patients found.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => (
            <div key={patient.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-105 min-h-[400px] flex flex-col">
              <div className="p-6 flex-1 flex flex-col">
                {/* Patient Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <IconUser className="w-7 h-7 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-semibold text-gray-800 truncate">{patient.name}</h3>
                      <div className="flex items-center gap-2 text-gray-600 mt-1">
                        <IconPhone className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{patient.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => handleEdit(patient)}
                      className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 hover:scale-110 border border-transparent hover:border-blue-200"
                      title="Edit Patient"
                    >
                      <IconEdit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(patient.id)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 hover:scale-110 border border-transparent hover:border-red-200"
                      title="Delete Patient"
                    >
                      <IconTrash className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Test History */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <IconCalendar className="w-5 h-5" />
                      Test History
                    </h4>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {patient.tests.length} test{patient.tests.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {patient.tests.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No tests recorded</p>
                  ) : (
                    <div className="space-y-3 max-h-56 overflow-y-auto">
                      {patient.tests.map((test, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4 group hover:bg-gray-100 transition-colors duration-200 border border-gray-200">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-medium text-gray-800 text-sm mb-1 break-all overflow-wrap-anywhere leading-relaxed">
                                {test.test_name}
                              </p>
                              <p className="text-xs text-gray-600 mb-1">{formatPakistanTime(test.date)}</p>
                              <p className="text-xs text-gray-500">ID: {test.sale_id}</p>
                              {test.is_partial && test.remaining_amount && test.remaining_amount > 0 && (
                                <p className="text-xs text-orange-600 font-medium">
                                  Remaining: Rs {test.remaining_amount.toFixed(2)}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <div className="flex items-center gap-1 text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-md">
                                <IconRupee className="w-4 h-4" />
                                <span className="text-sm">Rs {test.amount.toFixed(2)}</span>
                              </div>
                              {test.is_partial && test.paid_amount !== undefined && (
                                <div className="flex items-center gap-1 text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded-md">
                                  <span>Paid: Rs {test.paid_amount.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <button
                                onClick={() => setShowTestDeleteConfirm({ patientId: patient.id, saleId: test.sale_id })}
                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110 flex-shrink-0 border border-transparent hover:border-red-200"
                                title="Delete Test"
                              >
                                <IconTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total Amount */}
                {patient.tests.length > 0 && (
                  <div className="mt-auto pt-4 border-t border-gray-200">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                        <span className="text-lg font-bold text-blue-600">
                          Rs {patient.tests.reduce((sum, test) => sum + test.amount, 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Total Paid:</span>
                        <span className="text-lg font-bold text-green-600">
                          Rs {patient.tests.reduce((sum, test) => sum + (test.paid_amount || test.amount), 0).toFixed(2)}
                        </span>
                      </div>
                      {(() => {
                        const totalRemaining = patient.tests.reduce((sum, test) => sum + (test.remaining_amount || 0), 0);
                        return totalRemaining > 0 ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Total Remaining:</span>
                            <span className="text-lg font-bold text-orange-600">
                              Rs {totalRemaining.toFixed(2)}
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Tests: {patient.tests.length}</span>
                      <span className="text-xs text-gray-500">
                        Last: {patient.tests.length > 0 ? formatPakistanTime(new Date(Math.max(...patient.tests.map(t => new Date(t.date).getTime()))).toISOString()) : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center justify-between mt-4">
        {(() => {
          const prevDisabled = currentPage <= 1;
          const nextDisabled = currentPage >= totalPages;
          return (
            <>
              <div className="text-sm text-gray-600">
                {totalPages ? `Page ${currentPage} of ${totalPages} (${totalPatients} total patients)` : `Page ${currentPage}`}
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

      {/* Edit Modal */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingPatient(null)} />
          <div className="bg-white rounded-xl shadow-xl p-6 z-10 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <IconEdit className="w-5 h-5 text-blue-600" />
              Edit Patient
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingPatient(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(null)} />
          <div className="bg-white rounded-xl shadow-xl p-6 z-10 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconTrash className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Delete Patient</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this patient? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Test Confirmation Modal */}
      {showTestDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTestDeleteConfirm(null)} />
          <div className="bg-white rounded-xl shadow-xl p-6 z-10 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconTrash className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Delete Test</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this test from the patient's history? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowTestDeleteConfirm(null)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteTest(showTestDeleteConfirm.patientId, showTestDeleteConfirm.saleId)}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200"
                >
                  Delete Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientHistory;