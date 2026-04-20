/** Maps backend status values to user-friendly display labels */
export const STATUS_LABEL: Record<string, string> = {
  PENDING:   'Submitted',
  COMPLETED: 'Completed',
  REJECTED:  'Rejected',
};

export function getStatusLabel(status: string): string {
  return STATUS_LABEL[status] || status;
}
