import { ServiceRequestForm } from '../../../../components/services/ServiceRequestForm';

export default function BVNRetrievalPage() {
  return (
    <ServiceRequestForm
      serviceSlug="bvn-retrieval"
      serviceName="BVN Retrieval"
      fields={[
        { name: 'firstName',   label: 'First Name',    type: 'text', placeholder: 'As on bank records', required: true },
        { name: 'lastName',    label: 'Last Name',     type: 'text', placeholder: 'As on bank records', required: true },
        { name: 'dateOfBirth', label: 'Date of Birth', type: 'date',                                    required: true },
        { name: 'phone',       label: 'Phone Number',  type: 'tel',  placeholder: '08012345678',        required: true },
      ]}
    />
  );
}
