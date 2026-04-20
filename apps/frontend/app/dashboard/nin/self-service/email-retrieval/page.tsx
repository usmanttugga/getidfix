import { ServiceRequestForm } from '../../../../../components/services/ServiceRequestForm';
export default function EmailRetrievalPage() {
  return <ServiceRequestForm serviceSlug="nin-self-service-email-retrieval" serviceName="NIN Self Service — Email Retrieval Only" hideHistory fields={[
    { name: 'nin', label: 'NIN', type: 'text', placeholder: '11-digit NIN', required: true },
  ]} />;
}
