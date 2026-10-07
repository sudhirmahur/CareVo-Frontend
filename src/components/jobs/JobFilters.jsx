import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { JOB_TYPES } from '../../utils/constants';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import SearchBar from '../ui/SearchBar';
import Select from '../ui/Select';

export const EMPTY_FILTERS = {
  search: '',
  location: '',
  job_type: '',
  skills: '',
  min_salary: '',
  company: '',
};

export default function JobFilters({ filters, onChange, onReset }) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const set = (key) => (event) => onChange({ [key]: event.target.value });

  return (
    <Card className="space-y-4">
      <div className="flex gap-2">
        <SearchBar
          className="flex-1"
          value={filters.search}
          onChange={(value) => onChange({ search: value })}
          placeholder="Search job titles, keywords"
        />
        <Button
          variant="secondary"
          leftIcon={SlidersHorizontal}
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="h-11 lg:hidden"
        >
          Filters
        </Button>
      </div>

      <div className={`${expanded ? 'grid' : 'hidden'} gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-5`}>
        <Input label="Location" placeholder="City or remote" value={filters.location} onChange={set('location')} />
        <Select label="Job type" placeholder="Any type" options={JOB_TYPES} value={filters.job_type} onChange={set('job_type')} />
        <Input label="Skills" placeholder="react, python" hint="Comma separated" value={filters.skills} onChange={set('skills')} />
        <Input label="Min. salary" type="number" min="0" placeholder="e.g. 50000" value={filters.min_salary} onChange={set('min_salary')} />
        <Input label="Company" placeholder="Company name" value={filters.company} onChange={set('company')} />
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onReset}>
            Clear all filters
          </Button>
        </div>
      )}
    </Card>
  );
}
