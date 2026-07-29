const backend_url = import.meta.env.VITE_BACKEND_URL || "https://72.60.197.215.sslip.io";

// Export backend_url for file downloads and other direct usage
export { backend_url };

// production backend url
// https://72.60.197.215.sslip.io

// development backend url
// http://localhost:8000

export interface User {
  id: string;
  email: string;
  user_type: 'salesman' | 'admin';
  exp?: number;
}


export interface ManagedUser {
  id: string;
  email: string;
  user_type: 'salesman' | 'admin';
}

export interface StoreDetailsPayload {
  name: string;
  address: string;
  phone: string;
}

const normalizeStoreDetails = (data: any): StoreDetailsPayload => ({
  name: data?.name ?? data?.storeName ?? '',
  address: data?.address ?? data?.storeAddress ?? '',
  phone: data?.phone ?? data?.storePhone ?? '',
});

const safeParseJson = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch (err) {
    try {
      const text = await response.text();
      return text ? { detail: text } : {};
    } catch (innerErr) {
      return {};
    }
  }
};

export async function getStoreDetails(): Promise<StoreDetailsPayload> {
  const response = await fetch(`${backend_url}/api/store`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await safeParseJson(response);
  if (!response.ok) {
    throw { status: response.status, data };
  }
  return normalizeStoreDetails(data);
}

export async function saveStoreDetails(payload: StoreDetailsPayload): Promise<StoreDetailsPayload> {
  const response = await fetch(`${backend_url}/api/store`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await safeParseJson(response);
  if (!response.ok) {
    throw { status: response.status, data };
  }
  return normalizeStoreDetails(data);
}

// Session management
export async function login(username: string, password: string): Promise<any> {
  const response = await fetch(`${backend_url}/api/session/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  // Parse response safely: some servers may return empty/non-JSON bodies on errors
  let data: any = null;
  try {
    data = await response.json();
  } catch (err) {
    // fallback to text or status
    try {
      const txt = await response.text();
      data = txt ? { detail: txt } : { detail: response.statusText };
    } catch (e) {
      data = { detail: response.statusText };
    }
  }

  if (!response.ok) {
    throw { status: response.status, data };
  }

  return data;
}

// Validate session/token
export async function validateSession(): Promise<User | null> {
  try {
    const response = await fetch(`${backend_url}/api/session/validate`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data as User;
  } catch {
    return null;
  }
}

// Logout session
export async function logout(): Promise<void> {
  await fetch(`${backend_url}/api/session/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
}

// Items API helpers
export async function listItems(q: string, page: number, per_page: number): Promise<any> {
  const response = await fetch(`${backend_url}/api/items?q=${encodeURIComponent(q ?? '')}&page=${page}&per_page=${per_page}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function createItem(payload: Record<string, any>): Promise<any> {
  const response = await fetch(`${backend_url}/api/items`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function updateItem(id: string, payload: Record<string, any>): Promise<any> {
  const response = await fetch(`${backend_url}/api/items/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function deleteItem(id: string): Promise<any> {
  const response = await fetch(`${backend_url}/api/items/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

// Doctors API helpers
export async function listDoctors(q: string, page: number, per_page: number): Promise<any> {
  const response = await fetch(`${backend_url}/api/doctors?q=${encodeURIComponent(q ?? '')}&page=${page}&per_page=${per_page}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function createDoctor(payload: Record<string, any>): Promise<any> {
  const response = await fetch(`${backend_url}/api/doctors`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function updateDoctor(id: string, payload: Record<string, any>): Promise<any> {
  const response = await fetch(`${backend_url}/api/doctors/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function deleteDoctor(id: string): Promise<any> {
  const response = await fetch(`${backend_url}/api/doctors/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

// Sales
export async function createSale(payload: Record<string, any>): Promise<any> {
  const response = await fetch(`${backend_url}/api/sales`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  // Some responses may not be JSON
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    try {
      const txt = await response.text();
      data = txt ? { detail: txt } : { detail: response.statusText };
    } catch {
      data = { detail: response.statusText };
    }
  }
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function getPatients(page: number = 1, per_page: number = 15, searchQuery?: string): Promise<any> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: per_page.toString()
  });
  
  if (searchQuery && searchQuery.trim()) {
    params.append('q', searchQuery.trim());
  }
  
  const response = await fetch(`${backend_url}/api/sales/patients?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function updatePatient(patientId: string, patientData: any): Promise<any> {
  const response = await fetch(`${backend_url}/api/sales/patients/${patientId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function deletePatient(patientId: string): Promise<any> {
  const response = await fetch(`${backend_url}/api/sales/patients/${patientId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function deletePatientTest(patientId: string, saleId: string): Promise<any> {
  const response = await fetch(`${backend_url}/api/sales/patients/${patientId}/tests/${saleId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

// Sales Analytics API helpers
export async function getSales(
  q?: string,
  page?: number,
  per_page?: number,
  date_filter?: string,
  doctor_id?: string
): Promise<any> {
  const params = new URLSearchParams();
  if (q) params.append('q', q);
  if (page) params.append('page', page.toString());
  if (per_page) params.append('per_page', per_page.toString());
  if (date_filter) params.append('date_filter', date_filter);
  if (doctor_id) params.append('doctor_id', doctor_id);

  const response = await fetch(`${backend_url}/api/sales?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function getSalesSummary(date_filter?: string): Promise<any> {
  const params = new URLSearchParams();
  if (date_filter) params.append('date_filter', date_filter);

  const response = await fetch(`${backend_url}/api/sales/summary?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function updateSalePayment(
  saleId: string,
  additionalPayment: number,
  options?: { withReceipt?: boolean }
): Promise<any> {
  const payload: { additional_payment: number; with_receipt?: boolean } = {
    additional_payment: additionalPayment,
  };

  if (options && options.withReceipt !== undefined) {
    payload.with_receipt = options.withReceipt;
  }

  const response = await fetch(`${backend_url}/api/sales/${saleId}/payment`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function getSaleById(saleId: string): Promise<any> {
  const response = await fetch(`${backend_url}/api/sales/${saleId}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

// User management (admin)
export async function listManagedUsers(query = '', userType?: 'admin' | 'salesman'): Promise<ManagedUser[]> {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (userType) params.append('user_type', userType);
  const qs = params.toString();

  const response = await fetch(`${backend_url}/api/admin/users${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data as ManagedUser[];
}

export interface CreateManagedUserPayload {
  email: string;
  password: string;
  user_type: 'admin' | 'salesman';
}

export interface UpdateManagedUserPayload {
  email?: string;
  password?: string;
  user_type?: 'admin' | 'salesman';
}

export async function createManagedUser(payload: CreateManagedUserPayload): Promise<ManagedUser> {
  const response = await fetch(`${backend_url}/api/admin/users`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data as ManagedUser;
}

export async function updateManagedUser(userId: string, payload: UpdateManagedUserPayload): Promise<ManagedUser> {
  const response = await fetch(`${backend_url}/api/admin/users/${userId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data as ManagedUser;
}

export async function deleteManagedUser(userId: string): Promise<void> {
  const response = await fetch(`${backend_url}/api/admin/users/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok && response.status !== 204) {
    let data: any = null;
    try {
      data = await response.json();
    } catch {
      // ignore parse errors
    }
    throw { status: response.status, data };
  }
}

// Ledger management
export async function getLedgerEntries(
  category?: string | string[],
  date_from?: string,
  date_to?: string,
  q?: string,
  page: number = 1,
  per_page: number = 15
): Promise<any> {
  const params = new URLSearchParams();
  
  // Handle multiple categories
  if (category) {
    if (Array.isArray(category)) {
      category.forEach(cat => params.append('category', cat));
    } else {
      params.append('category', category);
    }
  }
  
  if (date_from) params.append('date_from', date_from);
  if (date_to) params.append('date_to', date_to);
  if (q) params.append('q', q);
  params.append('page', String(page));
  params.append('per_page', String(per_page));

  const response = await fetch(`${backend_url}/api/ledger/entries?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await safeParseJson(response);
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function createLedgerEntry(payload: any): Promise<any> {
  const response = await fetch(`${backend_url}/api/ledger/entries`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await safeParseJson(response);
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function updateLedgerEntry(entryId: string, payload: any): Promise<any> {
  const response = await fetch(`${backend_url}/api/ledger/entries/${entryId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await safeParseJson(response);
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function deleteLedgerEntry(entryId: string): Promise<void> {
  const response = await fetch(`${backend_url}/api/ledger/entries/${entryId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok && response.status !== 204) {
    const data = await safeParseJson(response);
    throw { status: response.status, data };
  }
}

export async function getLedgerSummary(
  category?: string | string[],
  date_from?: string,
  date_to?: string
): Promise<any> {
  const params = new URLSearchParams();
  
  // Handle multiple categories
  if (category) {
    if (Array.isArray(category)) {
      category.forEach(cat => params.append('category', cat));
    } else {
      params.append('category', category);
    }
  }
  
  if (date_from) params.append('date_from', date_from);
  if (date_to) params.append('date_to', date_to);

  const response = await fetch(`${backend_url}/api/ledger/summary?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await safeParseJson(response);
  if (!response.ok) throw { status: response.status, data };
  return data;
}

// User Settings API
export interface UserProfileData {
  username: string;
  email: string;
  role: string;
}

export async function getUserProfile(): Promise<UserProfileData> {
  const response = await fetch(`${backend_url}/api/user/profile`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  const data = await safeParseJson(response);
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function updateUserEmail(email: string): Promise<any> {
  const response = await fetch(`${backend_url}/api/user/update-email`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  const data = await safeParseJson(response);
  if (!response.ok) throw { status: response.status, data };
  return data;
}

export async function updateUserPassword(currentPassword: string, newPassword: string): Promise<any> {
  const response = await fetch(`${backend_url}/api/user/update-password`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      current_password: currentPassword,
      new_password: newPassword 
    }),
  });
  
  const data = await safeParseJson(response);
  if (!response.ok) throw { status: response.status, data };
  return data;
}
