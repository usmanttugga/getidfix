'use client';
import { ServiceRequestForm } from '../../../../components/services/ServiceRequestForm';

export default function NINPersonalizationPage() {
  return (
    <ServiceRequestForm
      serviceSlug="nin-personalization"
      serviceName="NIN Personalization"
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
