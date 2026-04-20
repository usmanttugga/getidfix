import { ServiceRequestForm } from '../../../../components/services/ServiceRequestForm';

export default function BVNModificationPage() {
  return (
    <ServiceRequestForm
      serviceSlug="bvn-modification"
      serviceName="BVN Modification"
      fields={[
        { name: 'bvn', label: 'BVN', type: 'text', placeholder: '11-digit BVN', required: true },
        {
          name: 'fieldToModify', label: 'Field to Modify', type: 'select', required: true,
          options: [
            { value: 'firstName', label: 'First Name' },
            { value: 'lastName',  label: 'Last Name' },
            { value: 'dob',       label: 'Date of Birth' },
            { value: 'phone',     label: 'Phone Number' },
          ],
        },
        { name: 'newValue', label: 'New Value', type: 'text', placeholder: 'Enter new value', required: true },
      ]}
    />
  );
}
