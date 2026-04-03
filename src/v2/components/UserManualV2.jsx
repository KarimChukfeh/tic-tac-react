import { isValidElement, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const HEADING_ALIASES = {
  '8-draws': ['draws'],
  '10-r0--normal-resolution': ['r0'],
  '11-r1--draw-resolution': ['r1'],
  '12-r2--uncontested-finalist': ['r2'],
  '13-el0--canceled-tournament': ['el0'],
  'el1--force-start-tournament-after-enrollment-window-expires': ['el1'],
  'el1--extend-enrollment-window-when-solo-enrolled': ['el1x'],
  'el2--claim-abandoned-prize-pool-when-tournament-never-started': ['el2'],
  'ml1--claim-victory-by-opponent-timeout': ['ml1'],
  'ml2--eliminate-both-players-in-a-stalled-match': ['ml2'],
  'ml3--replace-players-in-an-abandoned-match': ['ml3'],
};

const MANUAL_ALIAS_IDS = Object.values(HEADING_ALIASES).flat();

const slugifyHeading = (value = '') => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^\w\s-]/g, '')
  .trim()
  .replace(/\s/g, '-');

const getTextContent = (value) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(getTextContent).join('');
  }

  if (isValidElement(value)) {
    return getTextContent(value.props.children);
  }

  return '';
};

const extractHeadingIds = (markdown) => markdown
  .split('\n')
  .map((line) => line.match(/^#{2,4}\s+(.*)$/)?.[1]?.trim())
  .filter(Boolean)
  .map(slugifyHeading);

const transformTocForMarkdown = (markdown) => {
  const separator = '\n---\n';
  const separatorIndex = markdown.indexOf(separator);

  if (separatorIndex === -1 || !markdown.startsWith('## Table of Contents')) {
    return markdown;
  }

  const tocBlock = markdown.slice(0, separatorIndex);
  const remainder = markdown.slice(separatorIndex);
  const transformedToc = tocBlock
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      if (/^\[.+\]\(#.+\)$/.test(trimmed)) {
        return `- ${trimmed}`;
      }

      if (/^\s+-\s+\[.+\]\(#.+\)$/.test(line)) {
        return `  ${trimmed}`;
      }

      return line;
    })
    .join('\n');

  return `${transformedToc}${remainder}`;
};

const createHeading = (Tag, className) => {
  const Heading = ({ children }) => {
    const headingText = getTextContent(children);
    const headingId = slugifyHeading(headingText);
    const aliases = HEADING_ALIASES[headingId] ?? [];

    return (
      <>
        {aliases.map((alias) => (
          <span
            key={alias}
            id={alias}
            data-heading-id={headingId}
            className="block relative -top-24 h-0 invisible"
            aria-hidden="true"
          />
        ))}
        <Tag
          id={headingId}
          data-manual-heading="true"
          className={`${className} scroll-mt-24`}
        >
          {children}
        </Tag>
      </>
    );
  };

  Heading.displayName = `UserManual${Tag.toUpperCase()}`;

  return Heading;
};

const MarkdownLink = ({ href = '', children, ...props }) => {
  const isExternal = /^https?:\/\//.test(href);

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noreferrer' : undefined}
      className="text-sky-300 underline decoration-sky-500/60 underline-offset-4 hover:text-sky-200"
      {...props}
    >
      {children}
    </a>
  );
};

const MarkdownTable = ({ children }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-700/70">
    <table className="w-full text-sm">{children}</table>
  </div>
);

const UserManualV2 = ({
  isElite = false,
  gameSpecificContent = null,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [headingIds, setHeadingIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const colors = isElite ? {
    primary: 'text-[#fbbf24]',
    secondary: 'text-[#fff8e7]',
    muted: 'text-[#d4b866]',
    bg: 'from-[#fbbf24]/10 to-[#f59e0b]/10',
    border: 'border-[#d4a012]/30',
    borderDark: 'border-[#d4a012]/20',
    panel: 'bg-[#1f1707]/40',
    panelBorder: 'border-[#d4a012]/20',
  } : {
    primary: 'text-purple-400',
    secondary: 'text-purple-200',
    muted: 'text-purple-300',
    bg: 'from-blue-500/10 to-purple-500/10',
    border: 'border-purple-400/30',
    borderDark: 'border-purple-400/20',
    panel: 'bg-slate-950/35',
    panelBorder: 'border-slate-700/60',
  };

  useEffect(() => {
    let isCancelled = false;

    const loadManual = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await fetch('/User_Manual.md');
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const rawMarkdown = await response.text();
        if (isCancelled) return;

        setMarkdown(transformTocForMarkdown(rawMarkdown));
        setHeadingIds(extractHeadingIds(rawMarkdown));
      } catch (error) {
        if (isCancelled) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load the user manual.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadManual();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const knownHashes = new Set(['user-manual', ...MANUAL_ALIAS_IDS, ...headingIds]);

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      if (knownHashes.has(hash)) {
        setIsExpanded(true);
      }

      window.requestAnimationFrame(() => {
        const target = document.getElementById(hash);
        const headingId = target?.dataset?.headingId || hash;
        const heading = document.getElementById(headingId);

        if (!heading || heading.dataset.manualHeading !== 'true') {
          return;
        }

        document.querySelectorAll('.highlight-target').forEach((element) => {
          element.classList.remove('highlight-target');
        });

        heading.classList.add('highlight-target');
        window.setTimeout(() => {
          heading.classList.remove('highlight-target');
        }, 3500);
      });
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [headingIds]);

  useEffect(() => {
    const handleOpenManual = () => {
      setIsExpanded(true);
    };

    window.addEventListener('open-user-manual', handleOpenManual);
    return () => {
      window.removeEventListener('open-user-manual', handleOpenManual);
    };
  }, []);

  return (
    <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-6`}>
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <span className="flex items-center gap-3">
          <BookOpen className={colors.primary} size={24} />
          <h3 className={`text-xl font-bold ${colors.secondary}`}>User Manual</h3>
        </span>
        <span className={colors.primary}>
          {isExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
        </span>
      </button>

      {isExpanded && (
        <div className={`mt-6 rounded-2xl border ${colors.panelBorder} ${colors.panel} p-5 md:p-6`}>
          {isLoading ? (
            <p className="text-sm text-slate-300">Loading manual...</p>
          ) : errorMessage ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-950/30 p-4 text-sm text-rose-100">
              <AlertCircle className="mt-0.5 shrink-0 text-rose-300" size={18} />
              <div>
                <p className="font-semibold">Unable to load the user manual.</p>
                <p className="mt-1 text-rose-200/90">{errorMessage}</p>
                <p className="mt-2">
                  <a href="/User_Manual.md" className="underline decoration-dotted underline-offset-4 hover:text-white">
                    Open the raw markdown document
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none prose-headings:font-bold prose-p:leading-7">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: createHeading('h2', `text-2xl font-bold ${colors.secondary} mt-10 first:mt-0`),
                  h3: createHeading('h3', `text-xl font-semibold ${colors.secondary} mt-8`),
                  h4: createHeading('h4', `text-lg font-semibold ${colors.muted} mt-6`),
                  p: ({ children }) => <p className="text-gray-300 mb-4 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className={`font-semibold ${colors.secondary}`}>{children}</strong>,
                  em: ({ children }) => <em className="text-slate-300 italic">{children}</em>,
                  a: MarkdownLink,
                  ul: ({ children }) => <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-300">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300">{children}</ol>,
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  hr: () => <hr className={`my-8 ${colors.borderDark}`} />,
                  table: MarkdownTable,
                  thead: ({ children }) => <thead className="bg-slate-900/70">{children}</thead>,
                  tbody: ({ children }) => <tbody className="divide-y divide-slate-800">{children}</tbody>,
                  tr: ({ children }) => <tr className="align-top">{children}</tr>,
                  th: ({ children }) => <th className="px-4 py-3 text-left font-semibold text-slate-100">{children}</th>,
                  td: ({ children }) => <td className="px-4 py-3 text-gray-300">{children}</td>,
                  code: ({ children }) => (
                    <code className="rounded bg-slate-900/80 px-1.5 py-0.5 text-sm text-sky-200">{children}</code>
                  ),
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          )}

          {gameSpecificContent ? (
            <>
              <hr className={`my-8 ${colors.borderDark}`} />
              {gameSpecificContent}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default UserManualV2;
