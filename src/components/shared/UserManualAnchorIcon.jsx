import { HelpCircle } from 'lucide-react';
import UserManualAnchorLink from './UserManualAnchorLink';

export default function UserManualAnchorIcon({
  className = '',
  size = 18,
  title = 'Read Manual',
  href = '#user-manual',
}) {
  return (
    <UserManualAnchorLink
      href={href}
      aria-label={title}
      title={title}
      className={`inline-flex items-center justify-center align-middle transition-colors hover:text-white ${className}`}
    >
      <HelpCircle size={size} />
    </UserManualAnchorLink>
  );
}
