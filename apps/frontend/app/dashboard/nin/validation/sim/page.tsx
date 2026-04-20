import { ServiceRequestForm } from '../../../../../components/services/ServiceRequestForm';
export default function SIMValidationPage() {
  return <ServiceRequestForm serviceSlug="nin-validation-sim" serviceName="NIN Validation — SIM Validation" hideHistory fields={[{ name: 'nin', label: 'NIN', type: 'text', placeholder: '11-digit NIN', required: true }]} />;
}
