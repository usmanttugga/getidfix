'use client';

import { useRouter } from 'next/navigation';
import { Shield, CreditCard, Smartphone, Wifi } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number | string;
  isEnabled: boolean;
}

interface ServiceGridProps {
  services: Service[];
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  NIN:    { label: 'NIN Services', icon: <Shield size={16} />,     color: 'bg-slate-100 text-[#0D2137] border-slate-300' },
  BVN:    { label: 'BVN Services', icon: <CreditCard size={16} />, color: 'bg-violet-50 text-violet-700 border-violet-200' },
  AIRTIME:{ label: 'Airtime',      icon: <Smartphone size={16} />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DATA:   { label: 'Data Bundles', icon: <Wifi size={16} />,       color: 'bg-sky-50 text-sky-700 border-sky-200' },
};

// Maps any slug (including sub-service slugs) → the route to navigate to
const SLUG_TO_ROUTE: Record<string, string> = {
  'nin-verification':    '/dashboard/nin/verify',
  'nin-personalization': '/dashboard/nin/personalization',
  'bvn-verification':    '/dashboard/bvn/verification',
  'bvn-retrieval':       '/dashboard/bvn/retrieval',
  'bvn-modification':    '/dashboard/bvn/modification',
  'bvn-user':            '/dashboard/bvn/user',
  'buy-airtime':         '/dashboard/airtime',
  'buy-data':            '/dashboard/data',
};

// Parent cards to show — each represents a group of sub-services
interface ParentCard {
  key: string;          // unique key for this card
  label: string;        // display name
  description: string;  // subtitle shown on card
  route: string;        // where to navigate
  price?: string;       // optional price label
  // slugs that belong to this group (used to find the lowest price or mark as variable)
  slugs: string[];
}

const NIN_PARENT_CARDS: ParentCard[] = [
  {
    key: 'nin-verification',
    label: 'NIN Verification',
    description: 'Verify by NIN · Phone Number · Bio Data · VNIN',
    route: '/dashboard/nin/verify',
    slugs: ['nin-verification', 'nin-verification-vnin'],
  },
  {
    key: 'nin-validation',
    label: 'NIN Validation',
    description: 'No Record · Bank · SIM · Photograph · Immigration',
    route: '/dashboard/nin/validation',
    slugs: ['nin-validation-no-record','nin-validation-bank','nin-validation-sim','nin-validation-photograph','nin-validation-immigration','nin-validation-modification'],
  },
  {
    key: 'ipe-clearance',
    label: 'IPE Clearance',
    description: 'Normal · Modification · Other Error',
    route: '/dashboard/nin/ipe-clearance',
    slugs: ['ipe-clearance-normal','ipe-clearance-modification','ipe-clearance-other-error'],
  },
  {
    key: 'nin-modification',
    label: 'NIN Modification',
    description: 'Name · Phone · Address · Date of Birth',
    route: '/dashboard/nin/modification',
    slugs: ['nin-modification-name','nin-modification-phone','nin-modification-address','nin-modification-dob'],
  },
  {
    key: 'nin-self-service',
    label: 'NIN Self Service',
    description: 'Delinking · Email Retrieval · DOB Attestation',
    route: '/dashboard/nin/self-service',
    slugs: ['nin-self-service-delinking','nin-self-service-email-retrieval','nin-self-service-email-delinking','nin-self-service-dob-attestation'],
  },
  {
    key: 'nin-personalization',
    label: 'NIN Personalization',
    description: 'Submit Tracking ID',
    route: '/dashboard/nin/personalization',
    slugs: ['nin-personalization'],
  },
];

const BVN_PARENT_CARDS: ParentCard[] = [
  { key: 'bvn-verification', label: 'BVN Verification', description: 'Verify BVN details',        route: '/dashboard/bvn/verification', slugs: ['bvn-verification'] },
  { key: 'bvn-retrieval',    label: 'BVN Retrieval',    description: 'Retrieve BVN number',        route: '/dashboard/bvn/retrieval',    slugs: ['bvn-retrieval']    },
  { key: 'bvn-modification', label: 'BVN Modification', description: 'Update BVN information',     route: '/dashboard/bvn/modification', slugs: ['bvn-modification'] },
  { key: 'bvn-user',         label: 'BVN User',         description: 'Get user linked to BVN',     route: '/dashboard/bvn/user',         slugs: ['bvn-user']         },
];

const UTILITY_CARDS: ParentCard[] = [
  { key: 'buy-airtime', label: 'Buy Airtime', description: 'MTN · Airtel · Glo · 9mobile', route: '/dashboard/airtime', slugs: ['buy-airtime'] },
  { key: 'buy-data',    label: 'Buy Data',    description: 'Data bundles for all networks', route: '/dashboard/data',    slugs: ['buy-data']    },
];

const CATEGORY_DISPLAY_ORDER = ['NIN', 'BVN', 'AIRTIME', 'DATA'];

const CATEGORY_PARENT_CARDS: Record<string, ParentCard[]> = {
  NIN:    NIN_PARENT_CARDS,
  BVN:    BVN_PARENT_CARDS,
  AIRTIME:[UTILITY_CARDS[0]],
  DATA:   [UTILITY_CARDS[1]],
};

export function ServiceGrid({ services }: ServiceGridProps) {
  const router = useRouter();

  if (services.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Shield size={40} className="mx-auto mb-3 opacity-40" />
        <p>No services available at this time.</p>
      </div>
    );
  }

  // Build a price lookup from live service data
  const priceBySlug = services.reduce<Record<string, number>>((acc, svc) => {
    acc[svc.slug] = Number(svc.price);
    return acc;
  }, {});

  // Check which categories have at least one enabled service
  const enabledSlugs = new Set(services.filter((s) => s.isEnabled).map((s) => s.slug));

  const categoryHasServices = (cat: string) => {
    const cards = CATEGORY_PARENT_CARDS[cat] || [];
    return cards.some((card) => card.slugs.some((slug) => enabledSlugs.has(slug)));
  };

  return (
    <div className="space-y-6">
      {CATEGORY_DISPLAY_ORDER.filter(categoryHasServices).map((category) => {
        const config = CATEGORY_CONFIG[category] || {
          label: category, icon: null, color: 'bg-slate-50 text-slate-700 border-slate-300',
        };

        const cards = CATEGORY_PARENT_CARDS[category] || [];

        // Card background colors per category
        const cardColors: Record<string, string> = {
          NIN:    'bg-slate-100 border-slate-300 hover:bg-slate-200 hover:border-[#0D2137]/35 hover:shadow-md',
          BVN:    'bg-violet-50 border-violet-200 hover:bg-violet-100 hover:border-violet-300 hover:shadow-md',
          AIRTIME:'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-md',
          DATA:   'bg-sky-50 border-sky-200 hover:bg-sky-100 hover:border-sky-300 hover:shadow-md',
        };
        const labelColors: Record<string, string> = {
          NIN: 'text-[#0D2137]', BVN: 'text-violet-800', AIRTIME: 'text-emerald-800', DATA: 'text-sky-800',
        };
        const descColors: Record<string, string> = {
          NIN: 'text-[#0D2137]/50', BVN: 'text-violet-500', AIRTIME: 'text-emerald-600', DATA: 'text-sky-600',
        };
        const cardCls = cardColors[category] || 'bg-slate-50 border-slate-300 hover:shadow-md';
        const labelCls = labelColors[category] || 'text-slate-800';
        const descCls = descColors[category] || 'text-slate-400';

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                {config.icon}{config.label}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {cards
                .filter((card) => card.slugs.some((slug) => enabledSlugs.has(slug)))
                .map((card) => {
                // Only show price for single-slug cards (direct services, not grouped sub-services)
                const isSingleService = card.slugs.length === 1;
                const singlePrice = isSingleService ? (priceBySlug[card.slugs[0]] ?? 0) : 0;
                const priceLabel = isSingleService && singlePrice > 0
                  ? `₦${singlePrice.toLocaleString()}`
                  : null;

                return (
                  <button
                    key={card.key}
                    onClick={() => router.push(card.route)}
                    className={`border rounded-xl p-4 text-left transition-all ${cardCls}`}
                  >
                    <p className={`text-sm font-semibold mb-1 ${labelCls}`}>{card.label}</p>
                    <p className={`text-xs leading-relaxed mb-2 ${descCls}`}>{card.description}</p>
                    {priceLabel && <p className="text-xs font-semibold text-[#C9A84C]">{priceLabel}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
