import { ServiceRequestForm } from '../../../../../components/services/ServiceRequestForm';
export default function DelinkingPage() {
  return <ServiceRequestForm serviceSlug="nin-self-service-delinking" serviceName="NIN Self Service — Delinking" hideHistory fields={[
    { name: 'nin',          label: 'NIN',           type: 'text', placeholder: '11-digit NIN',       required: true },
    { name: 'emailAddress', label: 'Email Address', type: 'text', placeholder: 'e.g. you@email.com', required: true },
  ]} />;
}
