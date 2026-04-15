import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LayoutList,
  Menu,
  X,
} from 'lucide-react';

const HEADING_ALIASES = {
  '32-draws': ['draws'],
  '41-r0---normal-resolution': ['r0'],
  '42-r1---draw-resolution': ['r1'],
  '43-r2---uncontested-finalist': ['r2'],
  '44-el0---canceled-tournament': ['el0'],
  '521-el1--force-start-tournament-after-enrollment-window-expires': ['el1'],
  '522-el1--extend-enrollment-window-when-solo-enrolled': ['el1x'],
  '45-el2---abandoned-tournament': ['el2'],
  '46-ml1---match-timeout': ['ml1'],
  '47-ml2---advanced-player-wins-via-stalled-semifinal': ['ml2'],
  '48-ml3---outsider-replaces-both-players': ['ml3'],
};

const ALIAS_IDS = Object.values(HEADING_ALIASES).flat();
const ALIAS_TO_HEADING = Object.fromEntries(
  Object.entries(HEADING_ALIASES).flatMap(([headingId, aliases]) => aliases.map((alias) => [alias, headingId])),
);
const CONTENT_TRANSITION_MS = 220;
const MANUAL_SECTION_REFERENCE_PATTERN = /\b\d+(?:\.\d+)+(?:\s+\([A-Z0-9*]+\))?/g;

const trimBlock = (value = '') => value.replace(/^\n+|\n+$/g, '');

const slugifyHeading = (value = '') => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^\w\s-]/g, '')
  .trim()
  .replace(/\s/g, '-');

const splitTitle = (title = '') => {
  const sectionMatch = title.match(/^(\d+\.)\s+(.+)$/) || title.match(/^([A-Z]\))\s+(.+)$/);
  if (sectionMatch) {
    return { eyebrow: sectionMatch[1], label: sectionMatch[2] };
  }

  const topicMatch = title.match(/^(\d+(?:\.\d+)+):\s+(.+)$/) || title.match(/^([A-Z](?:-[A-Za-z0-9*]+)?):\s+(.+)$/);
  if (topicMatch) {
    return { eyebrow: topicMatch[1], label: topicMatch[2] };
  }

  return { eyebrow: '', label: title };
};

const extractCode = (title = '') => {
  const match = title.match(/\b(R0|R1|R2|EL0|EL1\*?|EL2|ML1|ML2|ML3)\b/);
  return match ? match[1] : '';
};

const splitMarkdownByLevel = (markdown, level) => {
  const marker = `${'#'.repeat(level)} `;
  const lines = trimBlock(markdown).split('\n');
  const introLines = [];
  const items = [];
  let current = null;

  const pushCurrent = () => {
    if (!current) return;
    items.push({
      title: current.title,
      id: slugifyHeading(current.title),
      markdown: trimBlock(current.lines.join('\n')),
    });
    current = null;
  };

  lines.forEach((line) => {
    if (line.startsWith(marker)) {
      pushCurrent();
      current = { title: line.slice(marker.length).trim(), lines: [] };
      return;
    }

    if (current) {
      current.lines.push(line);
      return;
    }

    introLines.push(line);
  });

  pushCurrent();

  return {
    introMarkdown: trimBlock(introLines.join('\n')),
    items,
  };
};

const parseTocGroups = (markdown) => {
  const groups = [];
  let currentGroup = null;
  let currentParentItem = null;

  const ensureGroup = () => {
    if (currentGroup) return currentGroup;
    currentGroup = { label: 'Browse', id: 'browse', items: [] };
    groups.push(currentGroup);
    return currentGroup;
  };

  trimBlock(markdown).split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---') {
      return;
    }

    if (/^\*\*.+\*\*$/.test(trimmed) && !trimmed.includes('](')) {
      currentGroup = {
        label: trimmed.replace(/^\*\*|\*\*$/g, '').trim(),
        id: slugifyHeading(trimmed.replace(/^\*\*|\*\*$/g, '').trim()),
        items: [],
      };
      currentParentItem = null;
      groups.push(currentGroup);
      return;
    }

    const listItemMatch = line.match(/^(\s*)-\s+\[([^\]]+)\]\((#[^)]+)\)$/);
    if (listItemMatch) {
      const item = {
        label: listItemMatch[2],
        href: listItemMatch[3],
        id: listItemMatch[3].slice(1),
        depth: listItemMatch[1].length > 0 ? 1 : 0,
        children: [],
      };

      if (item.depth > 0 && currentParentItem) {
        currentParentItem.children.push(item);
        return;
      }

      ensureGroup().items.push(item);
      currentParentItem = item;
      return;
    }

    const directLinkMatch = trimmed.match(/^\*\*\[([^\]]+)\]\((#[^)]+)\)\*\*$/);
    if (directLinkMatch) {
      currentGroup = {
        label: directLinkMatch[1],
        id: slugifyHeading(directLinkMatch[1]),
        items: [{
          label: directLinkMatch[1],
          href: directLinkMatch[2],
          id: directLinkMatch[2].slice(1),
          depth: 0,
          children: [],
        }],
      };
      currentParentItem = null;
      groups.push(currentGroup);
    }
  });

  return groups.filter((group) => group.items.length > 0);
};

const parseGlossary = (markdown) => {
  const lines = trimBlock(markdown).split('\n');
  const entries = [];
  const footerLines = [];
  let currentTerm = null;
  let currentLines = [];
  let inFooter = false;

  const pushCurrent = () => {
    if (!currentTerm) return;
    entries.push({
      term: currentTerm,
      markdown: trimBlock(currentLines.join('\n')),
    });
    currentTerm = null;
    currentLines = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (inFooter) {
      footerLines.push(line);
      return;
    }

    if (trimmed === '---' && currentTerm) {
      pushCurrent();
      inFooter = true;
      footerLines.push(line);
      return;
    }

    const termMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (termMatch) {
      pushCurrent();
      currentTerm = termMatch[1];
      return;
    }

    if (currentTerm) {
      currentLines.push(line);
    }
  });

  pushCurrent();

  return {
    entries,
    footerMarkdown: trimBlock(footerLines.join('\n')),
  };
};

const buildSectionReferenceLookup = (sections = []) => {
  const references = {};

  const registerTitle = (title = '', id = '') => {
    const { eyebrow } = splitTitle(title);

    if (!/^\d+(?:\.\d+)+$/.test(eyebrow) || !id) {
      return;
    }

    references[eyebrow] = id;

    const code = extractCode(title);
    if (code) {
      references[`${eyebrow} (${code})`] = id;
    }
  };

  sections.forEach((section) => {
    registerTitle(section.title, section.id);
    section.subsections.forEach((subsection) => {
      registerTitle(subsection.title, subsection.id);
      subsection.nestedSubsections.forEach((nested) => {
        registerTitle(nested.title, nested.id);
      });
    });
  });

  return references;
};

const linkifyManualSectionReferences = (value = '', referenceLookup = {}) => {
  let hasMatch = false;
  let lastIndex = 0;
  const nodes = [];

  value.replace(MANUAL_SECTION_REFERENCE_PATTERN, (match, offset) => {
    const targetId = referenceLookup[match];
    if (!targetId) {
      return match;
    }

    hasMatch = true;

    if (offset > lastIndex) {
      nodes.push({ type: 'text', value: value.slice(lastIndex, offset) });
    }

    nodes.push({
      type: 'link',
      url: `#${targetId}`,
      children: [{ type: 'text', value: match }],
    });

    lastIndex = offset + match.length;
    return match;
  });

  if (!hasMatch) {
    return [{ type: 'text', value }];
  }

  if (lastIndex < value.length) {
    nodes.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return nodes;
};

const remarkLinkifyManualReferences = (referenceLookup = {}) => () => (tree) => {
  const visitNode = (node) => {
    if (!node?.children?.length) {
      return;
    }

    node.children = node.children.flatMap((child) => {
      if (child.type === 'text') {
        return linkifyManualSectionReferences(child.value, referenceLookup);
      }

      if (child.type === 'link' || child.type === 'linkReference' || child.type === 'definition' || child.type === 'code' || child.type === 'inlineCode' || child.type === 'html') {
        return [child];
      }

      visitNode(child);
      return [child];
    });
  };

  visitNode(tree);
};

const parseManual = (rawMarkdown) => {
  const normalized = rawMarkdown.replace(/\r\n/g, '\n').trim();
  const { items: h2Sections } = splitMarkdownByLevel(normalized, 2);
  const tocSection = h2Sections.find((section) => section.title === 'Table of Contents');
  const contentSections = h2Sections
    .filter((section) => section.title !== 'Table of Contents')
    .map((section) => {
      const { introMarkdown, items: subsections } = splitMarkdownByLevel(section.markdown, 3);
      return {
        title: section.title,
        id: section.id,
        introMarkdown,
        subsections: subsections.map((subsection) => {
          const { introMarkdown: subsectionIntro, items: nestedSubsections } = splitMarkdownByLevel(subsection.markdown, 4);
          return {
            title: subsection.title,
            id: subsection.id,
            markdown: subsectionIntro,
            nestedSubsections: nestedSubsections.map((nested) => ({
              title: nested.title,
              id: nested.id,
              markdown: nested.markdown,
            })),
          };
        }),
      };
    });

  const glossarySection = contentSections.find((section) => section.id === '7-glossary');
  const glossary = glossarySection ? parseGlossary(glossarySection.introMarkdown) : { entries: [], footerMarkdown: '' };

  const headingIds = contentSections.flatMap((section) => [
    section.id,
    ...section.subsections.flatMap((subsection) => [
      subsection.id,
      ...subsection.nestedSubsections.map((nested) => nested.id),
    ]),
  ]);

  const headingToSectionId = Object.fromEntries(contentSections.flatMap((section) => ([
    [section.id, section.id],
    ...section.subsections.flatMap((subsection) => ([
      [subsection.id, section.id],
      ...subsection.nestedSubsections.map((nested) => [nested.id, section.id]),
    ])),
  ])));

  const faqIds = (contentSections.find((section) => section.id === '6-edge-cases--faq')?.subsections ?? [])
    .map((subsection) => subsection.id);

  const tocGroups = (tocSection ? parseTocGroups(tocSection.markdown) : []).map((group) => {
    const firstItemId = group.items[0]?.href?.slice(1) ?? '';
    return {
      ...group,
      id: headingToSectionId[firstItemId] ?? group.id,
    };
  });

  return {
    tocGroups,
    sections: contentSections,
    headingIds,
    headingToSectionId,
    faqIds,
    glossary,
    sectionReferenceLookup: buildSectionReferenceLookup(contentSections),
  };
};

const ManualAliasAnchors = ({ headingId }) => {
  const aliases = HEADING_ALIASES[headingId] ?? [];

  return aliases.map((alias) => (
    <span
      key={alias}
      id={alias}
      data-heading-id={headingId}
      className="block relative -top-24 h-0 invisible"
      aria-hidden="true"
    />
  ));
};

const ManualHeading = ({
  level = 2,
  title,
  className,
}) => {
  const Tag = `h${level}`;

  return (
    <>
      <ManualAliasAnchors headingId={slugifyHeading(title)} />
      <Tag
        id={slugifyHeading(title)}
        data-manual-heading="true"
        className={className}
      >
        {title}
      </Tag>
    </>
  );
};

const MarkdownLink = ({ href = '', children, ...props }) => {
  const isExternal = /^https?:\/\//.test(href);
  const isInternalAnchor = href.startsWith('#');

  const handleClick = (event) => {
    props.onClick?.(event);

    if (event.defaultPrevented || !isInternalAnchor) {
      return;
    }

    event.preventDefault();
    window.history.replaceState(null, '', href);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noreferrer' : undefined}
      className="text-sky-300 underline decoration-sky-500/60 underline-offset-4 hover:text-sky-200"
      {...props}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};

const MarkdownTable = ({ children }) => (
  <div className="mb-6 overflow-x-auto rounded-xl border border-slate-700/70">
    <table className="w-full text-sm">{children}</table>
  </div>
);

const HighlightCallout = ({ children }) => (
  <div className="rounded-[1.75rem] border-2 border-cyan-400/75 bg-[linear-gradient(135deg,rgba(30,64,175,0.36),rgba(59,130,246,0.14),rgba(30,41,59,0.2))] px-7 py-7 shadow-[0_24px_70px_rgba(34,211,238,0.14)]">
    <div className="flex items-start gap-2.5 md:gap-4">
      <div className="shrink-0 text-cyan-300">
        <svg className="h-6 w-6 md:h-[34px] md:w-[34px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="min-w-0 space-y-3 text-[0.85rem] leading-6 text-white md:text-[1.02rem] md:leading-8 [&>p]:m-0 [&>p]:font-semibold">
        {children}
      </div>
    </div>
  </div>
);

const MarkdownBody = ({
  markdown,
  colors,
  sectionReferenceLookup,
}) => {
  if (!markdown) return null;

  return (
    <div className="prose prose-invert max-w-none prose-p:leading-7">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkLinkifyManualReferences(sectionReferenceLookup)]}
        components={{
          p: ({ children }) => <p className="mb-4 text-[0.84rem] text-gray-300 last:mb-0 md:text-base">{children}</p>,
          strong: ({ children }) => <strong className={`font-semibold ${colors.secondary}`}>{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
          a: MarkdownLink,
          ul: ({ children }) => <ul className="mb-4 ml-5 list-disc space-y-2 text-[0.84rem] text-gray-300 md:ml-6 md:text-base">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 ml-5 list-decimal space-y-2 text-[0.84rem] text-gray-300 md:ml-6 md:text-base">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => <HighlightCallout>{children}</HighlightCallout>,
          hr: () => <hr className={`my-6 ${colors.borderDark}`} />,
          table: MarkdownTable,
          thead: ({ children }) => <thead className="bg-slate-900/70">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-slate-800">{children}</tbody>,
          tr: ({ children }) => <tr className="align-top">{children}</tr>,
          th: ({ children }) => <th className="px-4 py-3 text-left font-semibold text-slate-100">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2.5 text-[0.84rem] text-gray-300 md:px-4 md:py-3 md:text-base">{children}</td>,
          code: ({ children }) => (
            <code className="rounded bg-slate-900/80 px-1.5 py-0.5 text-sm text-sky-200">{children}</code>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

const AntiGriefingOverviewBody = ({
  markdown,
  colors,
  sectionReferenceLookup,
}) => {
  if (!markdown) return null;

  return (
    <div className="space-y-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkLinkifyManualReferences(sectionReferenceLookup)]}
        components={{
          p: ({ children }) => <p className="text-[0.86rem] leading-6 text-gray-300 md:text-[1.05rem] md:leading-9">{children}</p>,
          strong: ({ children }) => <strong className={`font-semibold ${colors.secondary}`}>{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
          a: MarkdownLink,
          ol: ({ children }) => <ol className="ml-6 list-decimal space-y-4 text-[0.86rem] leading-6 text-gray-300 md:ml-8 md:space-y-5 md:text-[1.02rem] md:leading-8">{children}</ol>,
          ul: ({ children }) => (
            <div className="rounded-[1.75rem] border border-violet-300/25 bg-violet-500/8 px-7 py-6 shadow-[0_24px_70px_rgba(76,29,149,0.16)]">
              <ul className="ml-5 list-disc space-y-4 text-[0.86rem] leading-6 text-gray-200 marker:text-violet-300 md:ml-6 md:space-y-5 md:text-[1.02rem] md:leading-8">
                {children}
              </ul>
            </div>
          ),
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => <HighlightCallout>{children}</HighlightCallout>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

const TocNavItem = ({
  item,
  activeHash,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = item.href === `#${activeHash}`;
  const hasActiveChild = item.children.some((child) => child.href === `#${activeHash}`);
  const isExpanded = item.children.length ? (isOpen || isActive || hasActiveChild) : false;

  return (
    <div className={item.depth ? 'ml-10 border-l border-slate-700/70 pl-5' : 'ml-5'}>
      <div
        className={`flex items-center gap-2 rounded-xl transition-all duration-300 ease-out ${
          isActive
            ? 'bg-sky-500/20 text-white ring-1 ring-sky-400/40 shadow-[0_10px_24px_rgba(14,165,233,0.15)]'
            : hasActiveChild
            ? 'bg-slate-900/80 text-white'
            : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
        }`}
      >
        <a
          href={item.href}
          onClick={onNavigate}
          className={`min-w-0 flex-1 rounded-xl py-2 text-sm transition-all duration-300 ease-out ${
            item.depth ? 'pl-0 pr-2 text-slate-400' : 'pl-4 pr-2'
          }`}
        >
          {item.label}
        </a>
        {item.children.length ? (
          <button
            type="button"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.label}`}
            aria-expanded={isExpanded}
            onClick={() => setIsOpen((current) => !current)}
            className="mr-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <ChevronRight
              size={15}
              className={`transition-transform duration-300 ease-out ${isExpanded ? 'rotate-90 text-sky-300' : ''}`}
            />
          </button>
        ) : null}
      </div>

      {item.children.length ? (
        <div
          className={`grid transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out ${
            isExpanded
              ? 'mt-1.5 grid-rows-[1fr] opacity-100 translate-y-0'
              : 'mt-0 grid-rows-[0fr] opacity-0 -translate-y-1'
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-1 border-l border-slate-800/80 pl-4">
              {item.children.map((child) => {
                const isChildActive = child.href === `#${activeHash}`;

                return (
                  <a
                    key={child.href}
                    href={child.href}
                    onClick={onNavigate}
                    className={`block rounded-xl py-2 pl-4 pr-3 text-sm transition-all duration-300 ease-out ${
                      isChildActive
                        ? 'bg-sky-500/20 text-white ring-1 ring-sky-400/40 shadow-[0_10px_24px_rgba(14,165,233,0.15)]'
                        : 'text-slate-400 hover:bg-slate-900/80 hover:text-white'
                    }`}
                  >
                    {child.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const TocNav = ({
  groups,
  activeHash,
  expandedSectionId,
  onToggleSection,
  onNavigate,
  showTitle = true,
}) => (
  <nav className="rounded-2xl border border-slate-700/60 bg-slate-950/60 p-4 backdrop-blur-sm">
    {showTitle ? (
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        <LayoutList size={15} />
        <span>Browse The Manual</span>
      </div>
    ) : null}
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <button
            type="button"
            onClick={() => onToggleSection(group)}
            aria-expanded={expandedSectionId === group.id}
            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-all duration-300 ease-out ${
              expandedSectionId === group.id
                ? 'bg-slate-900/80 text-white shadow-[0_16px_40px_rgba(15,23,42,0.32)]'
                : 'text-slate-200 hover:bg-slate-900/60 hover:text-white'
            }`}
          >
            <span>{group.label}</span>
            <ChevronRight
              size={16}
              className={`transition-all duration-300 ease-out ${expandedSectionId === group.id ? 'rotate-90 text-sky-300' : 'text-slate-500'}`}
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out ${
              expandedSectionId === group.id
                ? 'mt-2 grid-rows-[1fr] opacity-100 translate-y-0'
                : 'mt-0 grid-rows-[0fr] opacity-0 -translate-y-1'
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-1.5 pt-0.5">
                {group.items.map((item) => (
                  <TocNavItem
                    key={`${group.label}-${item.href}`}
                    item={item}
                    activeHash={activeHash}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </nav>
);

const SectionHeader = ({
  title,
  colors,
  subtitle,
}) => {
  return (
    <div className="mb-6">
      <ManualHeading
        level={2}
        title={title}
        className={`scroll-mt-24 text-2xl font-bold ${colors.secondary}`}
      />
      {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p> : null}
    </div>
  );
};

const TopicCard = ({
  id,
  title,
  markdown,
  nestedSubsections,
  colors,
  sectionReferenceLookup,
}) => {
  const code = extractCode(title);

  return (
    <article className="rounded-2xl border border-slate-700/60 bg-slate-950/45 p-3.5 shadow-[0_18px_60px_rgba(2,6,23,0.26)] md:p-5">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <ManualHeading
            level={3}
            title={title}
            className={`scroll-mt-24 text-xl font-semibold ${colors.secondary}`}
          />
        </div>
        {code ? (
          <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
            {code}
          </span>
        ) : null}
      </div>
      {id === '51-whats-griefing' ? (
        <AntiGriefingOverviewBody markdown={markdown} colors={colors} sectionReferenceLookup={sectionReferenceLookup} />
      ) : (
        <MarkdownBody markdown={markdown} colors={colors} sectionReferenceLookup={sectionReferenceLookup} />
      )}

      {nestedSubsections.length ? (
        <div className="mt-6 space-y-4 border-t border-slate-800 pt-5">
          {nestedSubsections.map((nested) => {
            const nestedCode = extractCode(nested.title);

            return (
              <div key={nested.id} className="rounded-xl border border-slate-800/80 bg-slate-900/65 p-3 md:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <ManualHeading
                      level={4}
                      title={nested.title}
                      className={`scroll-mt-24 text-base font-semibold ${colors.highlightText ?? colors.secondary}`}
                    />
                  </div>
                  {nestedCode ? (
                    <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200">
                      {nestedCode}
                    </span>
                  ) : null}
                </div>
                <MarkdownBody markdown={nested.markdown} colors={colors} sectionReferenceLookup={sectionReferenceLookup} />
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
};

const FaqItem = ({
  item,
  colors,
  isOpen,
  onToggle,
  sectionReferenceLookup,
}) => (
  <article className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950/45">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex w-full items-start justify-between gap-4 p-3.5 text-left md:p-5"
    >
      <div className="min-w-0 flex-1">
        <ManualHeading
          level={3}
          title={item.title}
          className={`scroll-mt-24 text-lg font-semibold ${colors.secondary}`}
        />
      </div>
      <span className={`mt-1 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
        <ChevronRight size={18} className={colors.primary} />
      </span>
    </button>

    {isOpen ? (
      <div className="border-t border-slate-800 px-3.5 pb-3.5 pt-3 md:px-5 md:pb-5 md:pt-4">
        <MarkdownBody markdown={item.markdown} colors={colors} sectionReferenceLookup={sectionReferenceLookup} />
      </div>
    ) : null}
  </article>
);

const GlossaryGrid = ({
  glossary,
  colors,
  sectionReferenceLookup,
}) => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {glossary.entries.map((entry) => (
        <article key={entry.term} className="rounded-2xl border border-slate-700/60 bg-slate-950/45 p-3.5 md:p-5">
          <h3 className={`mb-3 text-lg font-semibold ${colors.secondary}`}>{entry.term}</h3>
          <MarkdownBody markdown={entry.markdown} colors={colors} sectionReferenceLookup={sectionReferenceLookup} />
        </article>
      ))}
    </div>
    {glossary.footerMarkdown ? (
      <div className="rounded-2xl border border-slate-700/60 bg-slate-950/60 p-3.5 md:p-5">
        <MarkdownBody markdown={glossary.footerMarkdown} colors={colors} sectionReferenceLookup={sectionReferenceLookup} />
      </div>
    ) : null}
  </div>
);

const renderSectionBody = ({
  section,
  colors,
  faqOpenId,
  setFaqOpenId,
  glossary,
  sectionReferenceLookup,
}) => {
  if (section.id === '7-glossary') {
    return <GlossaryGrid glossary={glossary} colors={colors} sectionReferenceLookup={sectionReferenceLookup} />;
  }

  if (section.id === '6-edge-cases--faq') {
    return (
      <div className="space-y-4">
        {section.subsections.map((subsection) => (
          <FaqItem
            key={subsection.id}
            item={subsection}
            colors={colors}
            isOpen={faqOpenId === subsection.id}
            onToggle={() => setFaqOpenId((current) => (current === subsection.id ? null : subsection.id))}
            sectionReferenceLookup={sectionReferenceLookup}
          />
        ))}
      </div>
    );
  }

  const gridClass = 'space-y-4';

  return (
    <div className={gridClass}>
      {section.subsections.map((subsection) => (
        <TopicCard
          key={subsection.id}
          id={subsection.id}
          title={subsection.title}
          markdown={subsection.markdown}
          nestedSubsections={subsection.nestedSubsections}
          colors={colors}
          sectionReferenceLookup={sectionReferenceLookup}
        />
      ))}
    </div>
  );
};

const UserManualV2 = ({
  isElite = false,
  gameSpecificContent = null,
  defaultExpanded = false,
  collapsible = true,
  showAllSections = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || !collapsible);
  const [manualData, setManualData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeHash, setActiveHash] = useState('');
  const [faqOpenId, setFaqOpenId] = useState(null);
  const [expandedSectionId, setExpandedSectionId] = useState('1-getting-started');
  const [displayedSectionId, setDisplayedSectionId] = useState('1-getting-started');
  const [contentVisible, setContentVisible] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const colors = isElite ? {
    primary: 'text-[#fbbf24]',
    secondary: 'text-[#fff8e7]',
    muted: 'text-[#d4b866]',
    highlightText: 'text-[#fff8e7]',
    bg: 'from-[#fbbf24]/10 to-[#f59e0b]/10',
    border: 'border-[#d4a012]/30',
    borderDark: 'border-[#d4a012]/20',
    panel: 'bg-[#1f1707]/40',
    panelBorder: 'border-[#d4a012]/20',
  } : {
    primary: 'text-purple-400',
    secondary: 'text-purple-200',
    muted: 'text-purple-300',
    highlightText: 'text-purple-100',
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

        setManualData(parseManual(rawMarkdown));
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
    const knownHashes = new Set(['user-manual', ...ALIAS_IDS, ...(manualData?.headingIds ?? [])]);
    const faqHashes = new Set(manualData?.faqIds ?? []);

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      if (knownHashes.has(hash)) {
        setIsExpanded(true);
      }

      window.requestAnimationFrame(() => {
        const target = document.getElementById(hash);
        const resolvedHeadingId = target?.dataset?.headingId || ALIAS_TO_HEADING[hash] || hash;

        if (faqHashes.has(resolvedHeadingId)) {
          setFaqOpenId(resolvedHeadingId);
        }

        setActiveHash(resolvedHeadingId);
        if (manualData?.headingToSectionId?.[resolvedHeadingId]) {
          setExpandedSectionId(manualData.headingToSectionId[resolvedHeadingId]);
        }
      });
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [manualData]);

  useEffect(() => {
    if (!activeHash) {
      return;
    }

    const timer = window.requestAnimationFrame(() => {
      const rawHash = window.location.hash.slice(1);
      const target = document.getElementById(rawHash) || document.getElementById(activeHash);
      const resolvedHeadingId = target?.dataset?.headingId || activeHash;
      const heading = document.getElementById(resolvedHeadingId);

      if (!heading || heading.dataset.manualHeading !== 'true') {
        return;
      }

      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });

      document.querySelectorAll('[data-manual-heading="true"].highlight-target').forEach((element) => {
        element.classList.remove('highlight-target');
      });

      heading.classList.add('highlight-target');
      window.setTimeout(() => {
        heading.classList.remove('highlight-target');
      }, 3500);
    });

    return () => {
      window.cancelAnimationFrame(timer);
    };
  }, [activeHash, displayedSectionId]);

  const expandedSection = manualData?.sections.find((section) => section.id === expandedSectionId) ?? null;
  const hasExpandedSection = Boolean(expandedSection);
  const displayedSection = manualData?.sections.find((section) => section.id === displayedSectionId) ?? null;
  const hasDisplayedSection = Boolean(displayedSection);
  const showDocumentNav = showAllSections && manualData && isExpanded && !isLoading && !errorMessage;

  const handleToggleSection = (group) => {
    if (!group) return;

    if (showAllSections) {
      setExpandedSectionId(group.id);
      setActiveHash(group.id);
      setFaqOpenId(null);
      window.history.replaceState(null, '', `#${group.id}`);
      window.requestAnimationFrame(() => {
        const sectionHeading = document.getElementById(group.id);
        sectionHeading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    if (expandedSectionId === group.id) {
      setExpandedSectionId(null);
      setActiveHash('');
      setFaqOpenId(null);
      window.history.replaceState(null, '', '#user-manual');
      return;
    }

    const firstHref = group.items[0]?.href ?? '';
    const firstTargetId = firstHref.startsWith('#') ? firstHref.slice(1) : group.id;

    setExpandedSectionId(group.id);
    setActiveHash(firstTargetId);
    setFaqOpenId(null);

    if (firstTargetId) {
      window.history.replaceState(null, '', `#${firstTargetId}`);
    }
  };

  const handleMobileToggleSection = (group) => {
    handleToggleSection(group);
  };

  const handleNavLinkClick = () => {
    setIsMobileNavOpen(false);
  };

  useEffect(() => {
    const handleOpenManual = (event) => {
      setIsExpanded(true);

      const targetHash = event?.detail?.targetHash;
      if (targetHash) {
        window.history.replaceState(null, '', `#${targetHash}`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    };

    window.addEventListener('open-user-manual', handleOpenManual);
    return () => {
      window.removeEventListener('open-user-manual', handleOpenManual);
    };
  }, []);

  useEffect(() => {
    if (showAllSections) {
      return undefined;
    }

    let timeoutId = null;
    let frameId = null;

    if (expandedSectionId === displayedSectionId) {
      if (expandedSectionId) {
        frameId = window.requestAnimationFrame(() => {
          setContentVisible(true);
        });
      }

      return () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (frameId) window.cancelAnimationFrame(frameId);
      };
    }

    if (!expandedSectionId) {
      setContentVisible(false);
      timeoutId = window.setTimeout(() => {
        setDisplayedSectionId(null);
      }, CONTENT_TRANSITION_MS);

      return () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (frameId) window.cancelAnimationFrame(frameId);
      };
    }

    if (!displayedSectionId) {
      setDisplayedSectionId(expandedSectionId);
      setContentVisible(false);
      frameId = window.requestAnimationFrame(() => {
        setContentVisible(true);
      });

      return () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (frameId) window.cancelAnimationFrame(frameId);
      };
    }

    setContentVisible(false);
    timeoutId = window.setTimeout(() => {
      setDisplayedSectionId(expandedSectionId);
      frameId = window.requestAnimationFrame(() => {
        setContentVisible(true);
      });
    }, CONTENT_TRANSITION_MS);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [expandedSectionId, displayedSectionId, showAllSections]);

  useEffect(() => {
    if (!showAllSections || !manualData || !isExpanded) {
      return undefined;
    }

    let frameId = null;

    const syncExpandedSectionWithScroll = () => {
      frameId = null;

      const threshold = 180;
      let currentSectionId = manualData.sections[0]?.id ?? null;

      manualData.sections.forEach((section) => {
        const heading = document.getElementById(section.id);
        if (!heading) return;

        const { top } = heading.getBoundingClientRect();
        if (top <= threshold) {
          currentSectionId = section.id;
        }
      });

      if (currentSectionId) {
        setExpandedSectionId((previousId) => (previousId === currentSectionId ? previousId : currentSectionId));
      }
    };

    const handleScroll = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(syncExpandedSectionWithScroll);
    };

    syncExpandedSectionWithScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [showAllSections, manualData, isExpanded]);

  const renderSectionPanel = (section) => (
    <section
      key={section.id}
      className="rounded-[1.45rem] border border-slate-700/60 bg-slate-950/40 p-3.5 md:rounded-[1.6rem] md:p-6"
    >
      <SectionHeader
        title={section.title}
        colors={colors}
        subtitle={section.id === '6-edge-cases--faq'
          ? 'FAQ items now render as interactive accordions backed by the markdown headings.'
          : section.id === '7-glossary'
          ? 'Glossary entries are parsed into discrete cards while still authored in one markdown section.'
          : null}
      />

      {section.id !== '7-glossary' ? (
        <MarkdownBody
          markdown={section.introMarkdown}
          colors={colors}
          sectionReferenceLookup={manualData.sectionReferenceLookup}
        />
      ) : null}

      {section.id !== '7-glossary' && section.introMarkdown && section.subsections.length ? (
        <hr className={`my-6 ${colors.borderDark}`} />
      ) : null}

      {renderSectionBody({
        section,
        colors,
        faqOpenId,
        setFaqOpenId,
        glossary: manualData.glossary,
        sectionReferenceLookup: manualData.sectionReferenceLookup,
      })}
    </section>
  );

  return (
    <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-3 md:p-6`}>
      {showDocumentNav ? (
        <div className="fixed right-4 top-4 z-[60] flex lg:hidden">
          <button
            type="button"
            aria-label={isMobileNavOpen ? 'Close manual navigation' : 'Open manual navigation'}
            aria-expanded={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen((current) => !current)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-sky-300/45 bg-slate-950/95 text-white shadow-[0_14px_32px_rgba(0,0,0,0.34)] ring-1 ring-sky-300/20 backdrop-blur transition-colors hover:bg-slate-900"
          >
            {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      ) : null}

      {showDocumentNav ? (
        <div
          aria-hidden={!isMobileNavOpen}
          className={`fixed inset-0 z-50 transition-opacity duration-200 ease-out lg:hidden ${
            isMobileNavOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <button
            type="button"
            aria-label="Close manual navigation"
            onClick={() => setIsMobileNavOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px] transition-opacity duration-200 ease-out"
          />
          <div className={`absolute left-4 right-4 top-20 max-h-[70vh] origin-top overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-200 ease-out ${
            isMobileNavOpen ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-4 scale-[0.98] opacity-0'
          }`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LayoutList className="text-sky-300" size={18} />
                <h2 className="text-lg font-semibold text-sky-100">Browse The Manual</h2>
              </div>
              <button
                type="button"
                aria-label="Close manual navigation"
                onClick={() => setIsMobileNavOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-300/20 text-sky-100 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            {isMobileNavOpen ? (
              <div className="max-h-[calc(70vh-4.5rem)] overflow-y-auto">
                <TocNav
                  groups={manualData.tocGroups}
                  activeHash={activeHash}
                  expandedSectionId={expandedSectionId}
                  onToggleSection={handleMobileToggleSection}
                  onNavigate={handleNavLinkClick}
                  showTitle={false}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {collapsible ? (
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
      ) : (
        <div className="flex items-center gap-3">
          <BookOpen className={colors.primary} size={24} />
          <h3 className={`text-xl font-bold ${colors.secondary}`}>User Manual</h3>
        </div>
      )}

      {isExpanded ? (
        <div className="mt-4 md:mt-6">
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
          ) : manualData ? (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <aside
                className={`space-y-4 transition-[max-width,transform,opacity] duration-500 ease-out ${
                  showAllSections
                    ? 'hidden lg:sticky lg:top-24 lg:block lg:w-[320px] lg:min-w-[320px] lg:max-w-[320px]'
                    : hasExpandedSection
                    ? 'lg:sticky lg:top-24 lg:w-[320px] lg:min-w-[320px] lg:max-w-[320px]'
                    : 'lg:flex-1 lg:w-full lg:max-w-none'
                }`}
              >
                <div
                  className="w-full transition-[transform,width,max-width] duration-500 ease-out lg:translate-x-0"
                >
                  <TocNav
                    groups={manualData.tocGroups}
                    activeHash={activeHash}
                    expandedSectionId={expandedSectionId}
                    onToggleSection={handleToggleSection}
                    onNavigate={handleNavLinkClick}
                  />
                </div>
              </aside>

              <div
                className={`min-w-0 overflow-hidden transition-[max-width,opacity,transform,margin] duration-500 ease-out ${
                  showAllSections
                    ? 'lg:flex-1 lg:max-w-none lg:translate-x-0 lg:opacity-100'
                    : hasExpandedSection
                    ? 'lg:flex-1 lg:max-w-none lg:translate-x-0 lg:opacity-100'
                    : 'lg:max-w-0 lg:translate-x-10 lg:opacity-0 lg:pointer-events-none'
                }`}
                aria-hidden={showAllSections ? false : !hasExpandedSection}
              >
                {showAllSections ? (
                  <div className="space-y-6">
                    {manualData.sections.map((section) => renderSectionPanel(section))}
                  </div>
                ) : (
                  <div
                    className={`space-y-6 transition-[opacity,transform] duration-[220ms] ease-out ${
                      contentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                    }`}
                  >
                    {displayedSection ? renderSectionPanel(displayedSection) : null}

                    {hasDisplayedSection && gameSpecificContent ? (
                      <section className="rounded-[1.45rem] border border-slate-700/60 bg-slate-950/40 p-3.5 md:rounded-[1.6rem] md:p-6">
                        {gameSpecificContent}
                      </section>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default UserManualV2;
