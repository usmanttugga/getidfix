import { ServiceRequestForm } from '../../../../components/services/ServiceRequestForm';

export default function BVNVerificationPage() {
  return (
    <ServiceRequestForm
      serviceSlug="bvn-verification"
      serviceName="BVN Verification"
      fields={[
        { name: 'bvn', label: 'BVN', type: 'text', placeholder: '11-digit BVN', required: true },
      ]}
    />
  );
}
