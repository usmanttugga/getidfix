import { ServiceRequestForm } from '../../../../../components/services/ServiceRequestForm';
export default function BankValidationPage() {
  return <ServiceRequestForm serviceSlug="nin-validation-bank" serviceName="NIN Validation — Bank Validation" hideHistory fields={[{ name: 'nin', label: 'NIN', type: 'text', placeholder: '11-digit NIN', required: true }]} />;
}
