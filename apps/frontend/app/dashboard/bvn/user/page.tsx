import { ServiceRequestForm } from '../../../../components/services/ServiceRequestForm';

export default function BVNUserPage() {
  return (
    <ServiceRequestForm
      serviceSlug="bvn-user"
      serviceName="BVN User"
      fields={[
        { name: 'bvn', label: 'BVN', type: 'text', placeholder: '11-digit BVN', required: true },
        {
          name: 'action', label: 'Action', type: 'select', required: true,
          options: [
            { value: 'link',  label: 'Link BVN' },
            { value: 'query', label: 'Query BVN' },
          ],
        },
      ]}
    />
  );
}
