import { ServiceRequestForm } from '../../../../../components/services/ServiceRequestForm';
export default function EmailRetrievalDelinkingPage() {
  return <ServiceRequestForm serviceSlug="nin-self-service-email-delinking" serviceName="NIN Self Service — Email Retrieval & Delinking" hideHistory fields={[
    { name: 'nin', label: 'NIN', type: 'text', placeholder: '11-digit NIN', required: true },
  ]} />;
}
