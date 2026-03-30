import { HelpCircle } from 'lucide-react';

export default function UserManualAnchorIcon({
  className = '',
  size = 18,
  title = 'Read Manual',
}) {
  const handleClick = (event) => {
    event.preventDefault();

    window.dispatchEvent(new CustomEvent('open-user-manual'));
    if (window.location.hash !== '#user-manual') {
      window.history.pushState(null, '', '#user-manual');
    }
    document.getElementById('user-manual')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <a
      href="#user-manual"
      onClick={handleClick}
      aria-label={title}
      title={title}
      className={`inline-flex items-center justify-center align-middle transition-colors hover:text-white ${className}`}
    >
      <HelpCircle size={size} />
    </a>
  );
}
