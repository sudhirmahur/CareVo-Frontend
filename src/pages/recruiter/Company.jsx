import { Building2 } from 'lucide-react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

// TODO: company profile (name, logo, description, links) - recruiter.api.js
export default function RecruiterCompany() {
  return (
    <ModulePlaceholder
      title="Company"
      description="Your company profile as candidates see it."
      icon={Building2}
      planned={['Company name, logo and description', 'Website and social links']}
    />
  );
}
