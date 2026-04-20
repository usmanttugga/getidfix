'use client';
import { ServiceRequestForm } from '../../../../../components/services/ServiceRequestForm';

export default function OtherErrorIPEClearancePage() {
  return (
    <ServiceRequestForm
      serviceSlug="ipe-clearance-other-error"
      serviceName="IPE Clearance — Other Error"
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
        {
          name: 'errorDescription',
          label: 'Describe the Error',
          type: 'textarea',
          placeholder: 'Please describe the error in detail...',
          required: true,
        },
      ]}
    />
  );
}
