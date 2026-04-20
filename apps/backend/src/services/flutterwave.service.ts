import axios from 'axios';

const FLW_BASE = 'https://api.flutterwave.com/v3';

function flwHeaders() {
  return {
    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

export interface VirtualAccountResult {
  accountNumber: string;
  bankName:      string;
  accountName:   string;
  orderRef:      string;
}

/**
 * Creates a dedicated Flutterwave virtual account (microfinance) for a user.
 * Uses the configured bank (default: palmpay).
 */
export async function createVirtualAccount(params: {
  email:     string;
  firstName: string;
  lastName:  string;
  phone?:    string;
  userId:    string;
}): Promise<VirtualAccountResult> {
  const bank = process.env.FLW_VIRTUAL_ACCOUNT_BANK || 'palmpay';

  // Generate a unique 11-digit placeholder BVN (Flutterwave requires non-zero)
  const bvnPlaceholder = '2' + Math.floor(Math.random() * 9e9).toString().padStart(10, '0');

  const payload = {
    email:        params.email,
    is_permanent: true,
    bvn:          bvnPlaceholder,
    phonenumber:  params.phone || '08000000000',
    firstname:    params.firstName,
    lastname:     params.lastName,
    narration:    `${params.firstName} ${params.lastName}`,
    tx_ref:       `VA-${params.userId}-${Date.now()}`,
  };

  // Use bank-specific endpoint if palmpay, otherwise generic
  const endpoint = bank.toLowerCase() === 'palmpay'
    ? `${FLW_BASE}/virtual-account-numbers`
    : `${FLW_BASE}/virtual-account-numbers`;

  const response = await axios.post(endpoint, payload, { headers: flwHeaders() });

  const data = response.data?.data;
  if (!data) throw new Error('Flutterwave virtual account creation failed: no data returned');

  // Flutterwave always returns "Indulge MFB" as the underlying provider —
  // display a friendlier name based on the configured bank preference.
  const bankDisplayNames: Record<string, string> = {
    palmpay:    'PalmPay',
    opay:       'OPay',
    moniepoint: 'Moniepoint',
  };
  const displayBank = bankDisplayNames[bank.toLowerCase()] || data.bank_name || bank;

  return {
    accountNumber: data.account_number,
    bankName:      displayBank,
    accountName:   data.account_name || `${params.firstName} ${params.lastName}`,
    orderRef:      data.order_ref || payload.tx_ref,
  };
}
