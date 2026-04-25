import axios from 'axios';
import { getEnv } from '../config/env';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';

const LUMIID_BASE = 'https://api.lumiid.com';

export interface LumiIDNinData {
  firstname?: string;
  middlename?: string;
  lastname?: string;
  birthdate?: string;
  photo?: string | null;
  gender?: string;
  phone?: string;
  residence?: { state?: string; address?: string; lga?: string };
  nin?: string;
}

export interface LumiIDBvnData {
  firstname?: string;
  lastname?: string;
  birthdate?: string;
  phone?: string;
}

function lumiidHeaders() {
  return {
    Authorization: `Bearer ${getEnv().LUMIID_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Verify a NIN (National Identification Number) via LumiID API.
 */
export async function verifyNin(idNumber: string): Promise<LumiIDNinData> {
  try {
    const response = await axios.post(
      `${LUMIID_BASE}/v1/ng/nin-basic/`,
      { nin: idNumber },
      { headers: lumiidHeaders(), timeout: 15000 }
    );

    const body = response.data;
    console.log('[LumiID NIN] Response:', JSON.stringify(body, null, 2));
    if (!body.success) {
      throw new AppError(
        body.message || body.detail || 'NIN verification failed. Please check the details and try again.',
        502,
        ERROR_CODES.EXTERNAL_API_ERROR
      );
    }

    return body.data as LumiIDNinData;
  } catch (err) {
    if (err instanceof AppError) throw err;
    const axiosErr = err as { response?: { data?: { message?: string; detail?: string }; status?: number }; message?: string };
    const apiMsg = axiosErr.response?.data?.message || axiosErr.response?.data?.detail;
    console.error('[LumiID NIN] Error:', axiosErr.response?.status, axiosErr.response?.data || axiosErr.message);
    throw new AppError(
      apiMsg || 'LumiID NIN verification failed. Please try again.',
      502,
      ERROR_CODES.EXTERNAL_API_ERROR
    );
  }
}

/**
 * Download a NIN slip PDF from LumiID.
 * Returns the raw PDF buffer.
 * slip_type: 'regular' | 'improved' | 'premium'
 */
export async function downloadNinSlip(nin: string, slipType: string): Promise<Buffer> {
  const typeMap: Record<string, string> = {
    basic:    'regular',
    regular:  'regular',
    standard: 'improved',
    improved: 'improved',
    premium:  'premium',
    vnin:     'regular',
  };
  const lumiSlipType = typeMap[slipType] || 'regular';
  console.log('[LumiID Slip] Requesting slip:', nin, '→', lumiSlipType);
  console.log('[LumiID Slip] API key prefix:', getEnv().LUMIID_API_KEY?.slice(0, 15) + '...');
  console.log('[LumiID Slip] Auth header:', getEnv().LUMIID_API_KEY?.slice(0, 15) + '... (no Bearer)');

  try {
    const response = await axios.post(
      `${LUMIID_BASE}/v1/ng/nin/slip/download/`,
      { nin, slip_type: lumiSlipType, api_key: getEnv().LUMIID_API_KEY },
      {
        headers: {
          'Authorization': `Bearer ${getEnv().LUMIID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 30000,
      }
    );
    console.log('[LumiID Slip] Status:', response.status, 'Content-Type:', response.headers['content-type']);
    return Buffer.from(response.data);
  } catch (err) {
    const axiosErr = err as { response?: { status?: number; data?: unknown; headers?: Record<string, string> }; message?: string };
    // Try to decode error body (may be JSON even on PDF endpoint)
    let errBody = axiosErr.response?.data;
    if (errBody instanceof ArrayBuffer || Buffer.isBuffer(errBody)) {
      try { errBody = JSON.parse(Buffer.from(errBody as ArrayBuffer).toString()); } catch { errBody = Buffer.from(errBody as ArrayBuffer).toString(); }
    }
    console.error('[LumiID Slip] Error:', axiosErr.response?.status, errBody || axiosErr.message);
    const msg = (errBody as { message?: string })?.message || (errBody as { detail?: string })?.detail;
    throw new AppError(msg || 'Failed to download NIN slip. Please try again.', 502, ERROR_CODES.EXTERNAL_API_ERROR);
  }
}

/**
 * Verify a BVN (Bank Verification Number) via LumiID API.
 */
export async function verifyBvn(idNumber: string): Promise<LumiIDBvnData> {
  try {
    const response = await axios.post(
      `${LUMIID_BASE}/v1/ng/bvn-basic/`,
      { bvn: idNumber },
      { headers: lumiidHeaders(), timeout: 15000 }
    );

    const body = response.data;
    if (!body.success) {
      throw new AppError(
        body.message || 'LumiID BVN verification failed.',
        502,
        ERROR_CODES.EXTERNAL_API_ERROR
      );
    }

    return body.data as LumiIDBvnData;
  } catch (err) {
    if (err instanceof AppError) throw err;
    const axiosErr = err as { response?: { data?: { message?: string; detail?: string }; status?: number }; message?: string };
    const apiMsg = axiosErr.response?.data?.message || axiosErr.response?.data?.detail;
    console.error('[LumiID BVN] Error:', axiosErr.response?.status, axiosErr.response?.data || axiosErr.message);
    throw new AppError(
      apiMsg || 'LumiID BVN verification failed. Please try again.',
      502,
      ERROR_CODES.EXTERNAL_API_ERROR
    );
  }
}
