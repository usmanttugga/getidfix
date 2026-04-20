import { ServiceRequestForm } from '../../../../../components/services/ServiceRequestForm';
export default function ModificationValidationPage() {
  return <ServiceRequestForm serviceSlug="nin-validation-modification" serviceName="NIN Validation — Modification Validation" hideHistory fields={[{ name: 'nin', label: 'NIN', type: 'text', placeholder: '11-digit NIN', required: true }]} />;
}
