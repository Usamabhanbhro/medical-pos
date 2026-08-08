export interface ApiError {
  status?: number;
  message?: string;
  data?: {
    detail?: string | Array<{ msg?: string; message?: string }>;
  };
}

export interface ItemRecord {
  id?: string;
  _id?: string;
  name: string;
  sell_price?: number;
  sellPrice?: number;
  price?: number;
  cost_price?: number;
  costPrice?: number;
  cost?: number;
  code?: string;
}

export interface DoctorRecord {
  id?: string;
  _id?: string;
  name: string;
  commission_type?: 'flat' | 'percentage' | string;
  commission_value?: number;
}

export interface PatientTest {
  sale_id: string;
  name?: string;
  test_name: string;
  amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  date: string;
}

export interface PatientRecord {
  id: string;
  name: string;
  phone: string;
  tests: PatientTest[];
  created_at: string;
}

export interface PatientResponse {
  patients: PatientRecord[];
  total_pages?: number;
  total?: number;
}

export interface SaleRecord {
  id: string;
  sale_id: string;
  test_name: string;
  patient_name: string;
  phone: string;
  doctor_name?: string;
  hospital_name?: string;
  subtotal?: number;
  discount_type?: string;
  discount_value?: number;
  total_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  date?: string;
  doctor_commission_amount?: number;
  final_amount?: number;
  is_partial?: boolean;
  created_at?: string;
}

export interface LedgerEntry {
  id: string;
  description: string;
  amount: number;
  category: string;
  notes?: string;
  date?: string;
  doctor_commission_amount?: number;
  final_amount?: number;
  is_partial?: boolean;
  created_at?: string;
}

export interface LedgerResponse {
  entries: LedgerEntry[];
  total_pages?: number;
}

export interface LedgerSummary {
  total_income?: number;
  total_expense?: number;
  balance?: number;
  [key: string]: number | undefined;
}

export interface ItemResponse {
  items: ItemRecord[];
  total_pages?: number;
  total?: number;
}

export interface DoctorResponse {
  doctors: DoctorRecord[];
  total_pages?: number;
  total?: number;
}

export interface SaleResponse {
  sale_id: string;
  test_names?: string[];
  patient_name?: string;
  doctor_name?: string;
  final_amount?: number;
  with_receipt?: boolean;
  [key: string]: number | string | boolean | string[] | undefined;
}

export interface GenericApiResponse {
  [key: string]: unknown;
  data?: { detail?: string };
  message?: string;
  status?: number;
  code?: string;
  test_names?: string[];
  patient_name?: string;
  doctor_name?: string;
  final_amount?: number;
  with_receipt?: boolean;
  patient_gender?: string;
  patient_age?: number;
  phone?: string;
  hospital_name?: string;
  sale_id?: string;
  discount_type?: string;
  discount_value?: number;
  subtotal?: number;
  paid_amount?: number;
  remaining_amount?: number;
  previous_paid_amount?: number;
  total_amount?: number;
  tests?: GenericApiResponse[];
}

export type LedgerPayload = {
  description: string;
  amount: number;
  category: string;
  notes?: string;
};

export type PatientUpdatePayload = {
  name: string;
  phone: string;
};

export type ItemPayload = {
  name: string;
  cost_price: number;
  sell_price: number;
};

export type DoctorPayload = {
  name: string;
  commission_type: string;
  commission_value: number;
};
