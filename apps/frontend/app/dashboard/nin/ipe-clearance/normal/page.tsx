'use client';
import { ServiceRequestForm } from '../../../../../components/services/ServiceRequestForm';

export default function NormalIPEClearancePage() {
  return (
    <ServiceRequestForm
      serviceSlug="ipe-clearance-normal"
      serviceName="IPE Clearance — Normal"
      hideHistory
      fields={[
        {
          name: 'trackingId',
          label: 'Tracking ID',
          type: 'text',
          placeholder: '15 alphanumeric characters',
          required: true,
          maxLength: 15,
          patternMessage: 'alphanumeric only',
          transform: (val) => val.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15).toUpperCase(),
        },
      ]}
    />
  );
}
