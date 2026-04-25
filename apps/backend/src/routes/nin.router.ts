import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { AppError, ERROR_CODES } from '../middleware/errorHandler';
import { debitWallet } from '../services/wallet.service';
import { createNotification } from '../services/notification.service';
import { verifyNinByNumber, verifyNinByPhone, verifyVirtualNin } from '../services/verifyme.service';
import { downloadNinSlip } from '../services/lumiid.service';

const router = Router();

const ninVerifySchema = z.object({
  nin:      z.string().regex(/^\d{11}$/, 'NIN must be exactly 11 numeric digits').optional(),
  phone:    z.string().optional(),
  vnin:     z.string().optional(),
  method:   z.enum(['nin', 'phone', 'dob', 'vnin']),
  slipType: z.enum(['basic', 'premium', 'regular', 'standard', 'vnin']).optional(),
  firstName: z.string().optional(),
  lastName:  z.string().optional(),
  gender:    z.string().optional(),
  dob:       z.string().optional(),
});

// ─── POST /nin/verify ─────────────────────────────────────────────────────────

router.post('/verify', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const prisma = getPrismaClient();
  try {
    const body   = ninVerifySchema.parse(req.body);
    const userId = req.user!.id;

    // Resolve service slug based on slip type
    const slipType    = body.slipType || 'basic';
    const serviceSlug = `nin-verification-${slipType}`;

    const service = await prisma.service.findUnique({ where: { slug: serviceSlug } });
    if (!service) throw new AppError('Service not found.', 404, ERROR_CODES.SERVICE_NOT_FOUND);
    if (!service.isEnabled) throw new AppError('This NIN Verification type is currently disabled.', 400, ERROR_CODES.SERVICE_DISABLED);

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new AppError('Wallet not found.', 404, ERROR_CODES.WALLET_NOT_FOUND);

    const price = Number(service.price);
    if (wallet.balance.lessThan(price)) {
      throw new AppError('Insufficient wallet balance.', 400, ERROR_CODES.INSUFFICIENT_BALANCE);
    }

    // phone method — use VerifyMe phone lookup
    // dob method — no direct API support, submit as manual request
    if (body.method === 'phone') {
      if (!body.phone) throw new AppError('Phone number is required.', 400, ERROR_CODES.BAD_REQUEST);
      const data = await verifyNinByPhone(body.phone);
      const nimcResult = {
        fullName:       `${data.firstname || ''} ${data.middlename || ''} ${data.lastname || ''}`.replace(/\s+/g, ' ').trim(),
        firstName:      data.firstname     || '',
        middleName:     data.middlename    || '',
        lastName:       data.lastname      || '',
        dob:            data.birthdate     || '',
        gender:         data.gender        || '',
        phone:          data.phone         || body.phone || '',
        photo:          data.photo         ?? null,
        nin:            data.nin           || '',
        address:        data.address       || '',
        residenceTown:  data.residenceTown  || '',
        residenceLga:   data.residenceLga   || '',
        residenceState: data.residenceState || '',
      };
      const reference = uuidv4();
      await prisma.$transaction(async (tx) => {
        await debitWallet(tx as unknown as Parameters<typeof debitWallet>[0], userId, price, `NIN Verification by Phone (${slipType} slip)`, `debit-${reference}`);
        await tx.serviceRequest.create({ data: { userId, serviceId: service.id, reference, status: 'COMPLETED', formData: { ...body }, adminResponse: { result: nimcResult, respondedAt: new Date().toISOString() }, amount: service.price } });
        await createNotification(tx as unknown as Parameters<typeof createNotification>[0], userId, 'NIN Verification Complete', `Your NIN verification was successful. Reference: ${reference}`);
      });
      return res.status(200).json({ status: 'success', data: { result: nimcResult, reference, amount: price } });
    }

    if (body.method === 'dob') {
      if (!body.nin) throw new AppError('NIN is required for bio data verification.', 400, ERROR_CODES.BAD_REQUEST);
      let dobFormatted = body.dob || '';
      if (dobFormatted && dobFormatted.length === 10 && dobFormatted[4] === '-') {
        const [y, m, d] = dobFormatted.split('-');
        dobFormatted = `${y}-${m}-${d}`;
      }
      const data = await verifyNinByNumber(body.nin, {
        firstname: body.firstName,
        lastname:  body.lastName,
        dob:       dobFormatted,
        gender:    body.gender,
      });
      const nimcResult = {
        fullName:       `${data.firstname || ''} ${data.middlename || ''} ${data.lastname || ''}`.replace(/\s+/g, ' ').trim(),
        firstName:      data.firstname     || '',
        middleName:     data.middlename    || '',
        lastName:       data.lastname      || '',
        dob:            data.birthdate     || '',
        gender:         data.gender        || '',
        phone:          data.phone         || '',
        photo:          data.photo         ?? null,
        nin:            data.nin           || body.nin || '',
        address:        data.address       || '',
        residenceTown:  data.residenceTown  || '',
        residenceLga:   data.residenceLga   || '',
        residenceState: data.residenceState || '',
      };
      const reference = uuidv4();
      await prisma.$transaction(async (tx) => {
        await debitWallet(tx as unknown as Parameters<typeof debitWallet>[0], userId, price, `NIN Verification by Bio Data (${slipType} slip)`, `debit-${reference}`);
        await tx.serviceRequest.create({ data: { userId, serviceId: service.id, reference, status: 'COMPLETED', formData: { ...body }, adminResponse: { result: nimcResult, respondedAt: new Date().toISOString() }, amount: service.price } });
        await createNotification(tx as unknown as Parameters<typeof createNotification>[0], userId, 'NIN Verification Complete', `Your NIN verification was successful. Reference: ${reference}`);
      });
      return res.status(200).json({ status: 'success', data: { result: nimcResult, reference, amount: price } });
    }

    // Resolve the identifier for NIN and VNIN methods
    let idValue: string;
    if (body.method === 'vnin') {
      idValue = body.vnin || '';
    } else {
      idValue = body.nin || '';
    }

    if (!idValue) {
      throw new AppError('Verification identifier is required.', 400, ERROR_CODES.BAD_REQUEST);
    }

    // Call VerifyMe API based on method
    let data;
    if (body.method === 'vnin') {
      data = await verifyVirtualNin(idValue);
    } else {
      data = await verifyNinByNumber(idValue);
    }

    if (!data.firstname && !data.lastname) {
      throw new AppError('NIN not found or no record returned. Please ensure the NIN is correct.', 404, ERROR_CODES.NOT_FOUND);
    }

    const nimcResult = {
      fullName:       `${data.firstname || ''} ${data.middlename || ''} ${data.lastname || ''}`.replace(/\s+/g, ' ').trim(),
      firstName:      data.firstname     || '',
      middleName:     data.middlename    || '',
      lastName:       data.lastname      || '',
      dob:            data.birthdate     || '',
      gender:         data.gender        || '',
      phone:          data.phone         || '',
      photo:          data.photo         ?? null,
      nin:            data.nin           || body.nin || '',
      address:        data.address       || '',
      residenceTown:  data.residenceTown  || '',
      residenceLga:   data.residenceLga   || '',
      residenceState: data.residenceState || '',
    };

    const reference = uuidv4();

    await prisma.$transaction(async (tx) => {
      await debitWallet(
        tx as unknown as Parameters<typeof debitWallet>[0],
        userId,
        price,
        `NIN Verification (${slipType} slip)`,
        `debit-${reference}`
      );

      await tx.serviceRequest.create({
        data: {
          userId,
          serviceId: service.id,
          reference,
          status:   'COMPLETED',
          formData: { ...body },
          adminResponse: { result: nimcResult, respondedAt: new Date().toISOString() },
          amount:   service.price,
        },
      });

      await createNotification(
        tx as unknown as Parameters<typeof createNotification>[0],
        userId,
        'NIN Verification Complete',
        `Your NIN verification was successful. Reference: ${reference}`
      );
    });

    res.status(200).json({
      status: 'success',
      data: { result: nimcResult, reference, amount: price },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /nin/slip/download ──────────────────────────────────────────────────

const slipDownloadSchema = z.object({
  nin:      z.string().regex(/^\d{11}$/, 'NIN must be exactly 11 numeric digits'),
  slipType: z.enum(['basic', 'regular', 'standard', 'improved', 'premium', 'vnin']),
});

router.post('/slip/download', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nin, slipType } = slipDownloadSchema.parse(req.body);
    console.log('[Slip Download] NIN:', nin, 'SlipType:', slipType);

    // Look up the most recent completed service request for this NIN to get the result data
    const prisma = getPrismaClient();
    const userId = req.user!.id;

    const request = await prisma.serviceRequest.findFirst({
      where: {
        userId,
        status: 'COMPLETED',
        formData: { path: ['nin'], equals: nin },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = (request?.adminResponse as Record<string, unknown>)?.result as Record<string, string> | undefined;

    const slipLabel = slipType.charAt(0).toUpperCase() + slipType.slice(1);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>NIN ${slipLabel} Slip - ${nin}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; background:#f8fafc; padding:20px; }
    .slip { max-width:560px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
    .header { background:#0D2137; color:#fff; padding:16px 24px; text-align:center; }
    .header h1 { font-size:15px; font-weight:bold; }
    .header p { font-size:11px; opacity:0.6; margin-top:2px; }
    .photo-wrap { display:flex; justify-content:center; padding:20px 0 12px; }
    .photo-wrap img { width:120px; height:140px; object-fit:cover; border-radius:6px; border:2px solid #e2e8f0; }
    .no-photo { width:120px; height:140px; background:#e2e8f0; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:40px; }
    .table-wrap { padding:0 16px 16px; }
    table { width:100%; border-collapse:collapse; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
    tr:nth-child(even) { background:#f8fafc; }
    td { padding:9px 14px; font-size:12px; border-bottom:1px solid #e2e8f0; }
    td:first-child { font-weight:700; color:#64748b; font-size:11px; text-transform:uppercase; width:42%; border-right:1px solid #e2e8f0; }
    td:last-child { color:#1e293b; font-weight:500; }
    .footer { padding:12px 16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; }
    .footer p { font-size:10px; color:#94a3b8; }
    .badge { background:#C9A84C; color:#fff; font-size:10px; font-weight:bold; padding:4px 10px; border-radius:20px; }
    @media print { body { background:#fff; padding:0; } .slip { box-shadow:none; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <h1>Basic Verification Slip &gt; NIN Search</h1>
      <p>${slipLabel} Slip &nbsp;|&nbsp; GetIDFix</p>
    </div>
    <div class="photo-wrap">
      ${result?.photo ? `<img src="data:image/jpeg;base64,${result.photo}" />` : `<div class="no-photo">👤</div>`}
    </div>
    <div class="table-wrap">
      <table>
        <tr><td>NIN</td><td>${result?.nin || nin}</td></tr>
        <tr><td>FIRSTNAME</td><td>${result?.firstName || ''}</td></tr>
        <tr><td>MIDDLENAME</td><td>${result?.middleName || ''}</td></tr>
        <tr><td>SURNAME</td><td>${result?.lastName || ''}</td></tr>
        <tr><td>BIRTHDATE</td><td>${result?.dob || ''}</td></tr>
        <tr><td>TELEPHONENO</td><td>${result?.phone || ''}</td></tr>
        <tr><td>GENDER</td><td>${result?.gender || ''}</td></tr>
        <tr><td>RESIDENCE_ADDRESS</td><td>${result?.address || ''}</td></tr>
        <tr><td>RESIDENCE_TOWN</td><td>${result?.residenceTown || ''}</td></tr>
        <tr><td>RESIDENCE_LGA</td><td>${result?.residenceLga || ''}</td></tr>
        <tr><td>RESIDENCE_STATE</td><td>${result?.residenceState || ''}</td></tr>
      </table>
    </div>
    <div class="footer">
      <p>${new Date().toLocaleDateString('en-NG', { day:'2-digit', month:'long', year:'numeric' })}</p>
      <span class="badge">${slipLabel} Slip</span>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('[Slip Download] Error:', err);
    next(err);
  }
});

export default router;
