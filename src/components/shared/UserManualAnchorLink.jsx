import { Fragment } from 'react';
import { getUserManualHrefForReasonCode, USER_MANUAL_REASON_CODE_PATTERN } from '../../utils/userManualLinks';

const getTargetHash = (href = '') => (href.startsWith('#') ? href.slice(1) : '');

export const linkifyReasonText = (text, options = {}) => {
  if (typeof text !== 'string' || !text) {
    return text;
  }

  const {
    keyPrefix = 'manual-reason',
    linkClassName = '',
    titlePrefix = 'Open User Manual entry for',
  } = options;

  const matches = [...text.matchAll(USER_MANUAL_REASON_CODE_PATTERN)];
  if (!matches.length) {
    return text;
  }

  const parts = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const code = match[0];
    const href = getUserManualHrefForReasonCode(code);
    const startIndex = match.index ?? 0;

    if (startIndex > lastIndex) {
      parts.push(
        <Fragment key={`${keyPrefix}-text-${index}`}>
          {text.slice(lastIndex, startIndex)}
        </Fragment>
      );
    }

    if (href) {
      parts.push(
        <UserManualAnchorLink
          key={`${keyPrefix}-link-${code}-${index}`}
          href={href}
          className={linkClassName}
          title={`${titlePrefix} ${code}`}
        >
          {code}
        </UserManualAnchorLink>
      );
    } else {
      parts.push(
        <Fragment key={`${keyPrefix}-code-${code}-${index}`}>
          {code}
        </Fragment>
      );
    }

    lastIndex = startIndex + code.length;
  });

  if (lastIndex < text.length) {
    parts.push(
      <Fragment key={`${keyPrefix}-tail`}>
        {text.slice(lastIndex)}
      </Fragment>
    );
  }

  return parts;
};

export default function UserManualAnchorLink({
  href = '#user-manual',
  onClick,
  className = '',
  title = 'Open User Manual',
  children,
  ...props
}) {
  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    const targetHash = getTargetHash(href);
    if (!targetHash) {
      return;
    }

    event.preventDefault();
    window.dispatchEvent(new CustomEvent('open-user-manual', {
      detail: { targetHash },
    }));
    if (window.location.hash !== href) {
      window.history.pushState(null, '', href);
    }
    document.getElementById('user-manual')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      title={title}
      className={className}
      {...props}
    >
      {children}
    </a>
  );
}
