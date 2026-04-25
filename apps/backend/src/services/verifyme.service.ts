import axios from 'axios';
import { getEnv } from '../config/env';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';

const QOREID_BASE      = 'https://api.qoreid.com';
const QOREID_TOKEN_URL = 'https://api.qoreid.com/token';

export interface VerifyMeNinData {
  nin:               string;
  firstname:         string;
  lastname:          string;
  middlename:        string;
  birthdate:         string;
  gender:            string;
  phone:             string;
  photo:             string | null;
  address?:          string;
  residenceTown?:    string;
  residenceLga?:     string;
  residenceState?:   string;
}

// ─── Token Cache ──────────────────────────────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const env = getEnv();
  console.log('[QoreID] Fetching token for clientId:', env.VERIFYME_CLIENT_ID?.slice(0, 8) + '...');
  const response = await axios.post(
    QOREID_TOKEN_URL,
    { clientId: env.VERIFYME_CLIENT_ID, secret: env.VERIFYME_API_KEY },
    { headers: { 'Content-Type': 'application/json' } }
  );
  cachedToken = response.data.accessToken as string;
  tokenExpiry = Date.now() + (response.data.expiresIn || 3600) * 1000 - 60000;
  console.log('[QoreID] Token obtained successfully');
  return cachedToken!;
}

async function qoreIdHeaders() {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function mapNinData(data: Record<string, unknown>): VerifyMeNinData {
  const nin = (data.nin || data.vnin || {}) as Record<string, string>;
  return {
    nin:           String(nin.nin              || ''),
    firstname:     String(nin.firstname        || ''),
    lastname:      String(nin.lastname         || ''),
    middlename:    String(nin.middlename       || ''),
    birthdate:     String(nin.birthdate        || ''),
    gender:        String(nin.gender           || ''),
    phone:         String(nin.telephoneno      || nin.phone || ''),
    photo:         nin.photo ? String(nin.photo) : null,
    address:       String(nin.residenceAddress || nin.address || ''),
    residenceTown: String(nin.residenceTown    || ''),
    residenceLga:  String(nin.residenceLga     || ''),
    residenceState:String(nin.residenceState   || ''),
  };
}

// ─── Verify NIN by Number ─────────────────────────────────────────────────────
export async function verifyNinByNumber(nin: string, matchData?: { firstname?: string; lastname?: string; dob?: string; gender?: string; phone?: string }): Promise<VerifyMeNinData> {
  try {
    console.log('[QoreID] Verifying NIN:', nin);
    const headers = await qoreIdHeaders();
    console.log('[QoreID] Auth header:', (headers.Authorization as string)?.slice(0, 20) + '...');
    // QoreID requires at least one matching field
    const body = {
      firstname: matchData?.firstname || 'A',
      lastname:  matchData?.lastname  || 'A',
      ...(matchData?.dob    ? { dob:    matchData.dob    } : {}),
      ...(matchData?.gender ? { gender: matchData.gender } : {}),
      ...(matchData?.phone  ? { phone:  matchData.phone  } : {}),
    };
    const response = await axios.post(
      `${QOREID_BASE}/v1/ng/identities/nin/${nin}`,
      body,
      { headers, timeout: 15000 }
    );
    console.log('[QoreID NIN] Response:', JSON.stringify(response.data, null, 2));
    const data = response.data;
    if (!data?.nin && !data?.id) throw new AppError('NIN verification failed. No data returned.', 502, ERROR_CODES.EXTERNAL_API_ERROR);
    return mapNinData(data);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const axiosErr = err as { response?: { data?: { message?: string; error?: string }; status?: number }; message?: string };
    const apiMsg = axiosErr.response?.data?.message || axiosErr.response?.data?.error;
    console.error('[QoreID NIN] Error:', axiosErr.response?.status, axiosErr.response?.data || axiosErr.message);
    if (axiosErr.response?.status === 404) throw new AppError('NIN not found. Please ensure the NIN is correct.', 404, ERROR_CODES.NOT_FOUND);
    throw new AppError(apiMsg || 'NIN verification failed. Please try again.', 502, ERROR_CODES.EXTERNAL_API_ERROR);
  }
}

// ─── Verify NIN by Phone ──────────────────────────────────────────────────────
export async function verifyNinByPhone(phone: string): Promise<VerifyMeNinData> {
  try {
    console.log('[QoreID] Verifying NIN by phone:', phone);
    const headers = await qoreIdHeaders();
    const response = await axios.post(
      `${QOREID_BASE}/v1/ng/identities/nin-phone/${phone}`,
      {},
      { headers, timeout: 15000 }
    );
    console.log('[QoreID NIN Phone] Response:', JSON.stringify(response.data, null, 2));
    const data = response.data;
    if (!data?.nin) throw new AppError('NIN verification failed. No data returned.', 502, ERROR_CODES.EXTERNAL_API_ERROR);
    return mapNinData(data);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const axiosErr = err as { response?: { data?: { message?: string; error?: string }; status?: number }; message?: string };
    const apiMsg = axiosErr.response?.data?.message || axiosErr.response?.data?.error;
    console.error('[QoreID NIN Phone] Error:', axiosErr.response?.status, axiosErr.response?.data || axiosErr.message);
    if (axiosErr.response?.status === 404) throw new AppError('No NIN record found for this phone number.', 404, ERROR_CODES.NOT_FOUND);
    throw new AppError(apiMsg || 'NIN verification by phone failed. Please try again.', 502, ERROR_CODES.EXTERNAL_API_ERROR);
  }
}

// ─── Verify Virtual NIN ───────────────────────────────────────────────────────
export async function verifyVirtualNin(vnin: string): Promise<VerifyMeNinData> {
  try {
    console.log('[QoreID] Verifying vNIN:', vnin);
    const headers = await qoreIdHeaders();
    const response = await axios.post(
      `${QOREID_BASE}/v1/ng/identities/vnin/${vnin}`,
      {},
      { headers, timeout: 15000 }
    );
    console.log('[QoreID vNIN] Response:', JSON.stringify(response.data, null, 2));
    const data = response.data;
    if (!data?.vnin && !data?.nin) throw new AppError('vNIN verification failed. No data returned.', 502, ERROR_CODES.EXTERNAL_API_ERROR);
    return mapNinData(data);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const axiosErr = err as { response?: { data?: { message?: string; error?: string }; status?: number }; message?: string };
    const apiMsg = axiosErr.response?.data?.message || axiosErr.response?.data?.error;
    console.error('[QoreID vNIN] Error:', axiosErr.response?.status, axiosErr.response?.data || axiosErr.message);
    if (axiosErr.response?.status === 404) throw new AppError('vNIN not found. Please ensure the vNIN is correct.', 404, ERROR_CODES.NOT_FOUND);
    throw new AppError(apiMsg || 'vNIN verification failed. Please try again.', 502, ERROR_CODES.EXTERNAL_API_ERROR);
  }
}
