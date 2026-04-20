import { ServiceRequestForm } from '../../../../../components/services/ServiceRequestForm';
export default function PhotographErrorPage() {
  return <ServiceRequestForm serviceSlug="nin-validation-photograph" serviceName="NIN Validation — Photograph Error" hideHistory fields={[{ name: 'nin', label: 'NIN', type: 'text', placeholder: '11-digit NIN', required: true }]} />;
}
