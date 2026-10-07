import { Github, Globe, Linkedin } from 'lucide-react';

const withProtocol = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const LINKS = [
  { key: 'github', label: 'GitHub', icon: Github },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { key: 'portfolio', label: 'Portfolio', icon: Globe },
];

export default function SocialLinks({ profile }) {
  const available = LINKS.filter(({ key }) => profile?.[key]);
  if (!available.length) return <p className="text-sm text-muted">No links added yet.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {available.map(({ key, label, icon: Icon }) => (
        <li key={key}>
          <a
            href={withProtocol(profile[key])}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-fg transition-colors hover:border-brand/40 hover:bg-surface-2"
          >
            <Icon className="h-4 w-4 text-muted" aria-hidden />
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}
