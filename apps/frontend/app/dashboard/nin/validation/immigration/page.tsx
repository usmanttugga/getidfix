import { ServiceRequestForm } from '../../../../../components/services/ServiceRequestForm';
export default function ImmigrationValidationPage() {
  return <ServiceRequestForm serviceSlug="nin-validation-immigration" serviceName="NIN Validation — Immigration Validation" hideHistory fields={[{ name: 'nin', label: 'NIN', type: 'text', placeholder: '11-digit NIN', required: true }]} />;
}
