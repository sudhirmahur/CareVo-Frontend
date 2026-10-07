import { APPLICATION_STATUS, INTERVIEW_STATUS } from '../../utils/constants';
import { toTitleCase } from '../../utils/helpers';
import Badge from '../ui/Badge';

/** Read-only status pill. Users can never change a status; only the backend/recruiter does. */
export default function StatusBadge({ status, kind = 'application' }) {
  const map = kind === 'interview' ? INTERVIEW_STATUS : APPLICATION_STATUS;
  const config = map[status] ?? { label: toTitleCase(status || 'Unknown'), tone: 'neutral' };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
