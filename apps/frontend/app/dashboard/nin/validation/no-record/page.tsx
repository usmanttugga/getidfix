import { ServiceRequestForm } from '../../../../../components/services/ServiceRequestForm';
export default function NoRecordFoundPage() {
  return <ServiceRequestForm serviceSlug="nin-validation-no-record" serviceName="NIN Validation — No Record Found" hideHistory fields={[{ name: 'nin', label: 'NIN', type: 'text', placeholder: '11-digit NIN', required: true }]} />;
}
