import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, ListTree, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DOCS_REPO_BLOB_BASE = 'https://github.com/KarimChukfeh/tic-tac-react/blob/main';
const SOLIDITY_KEYWORDS = new Set([
  'abstract', 'address', 'anonymous', 'as', 'assembly', 'assert', 'bool', 'break',
  'bytes', 'calldata', 'catch', 'constant', 'constructor', 'continue', 'contract',
  'delete', 'do', 'else', 'emit', 'enum', 'error', 'event', 'external', 'fallback',
  'false', 'for', 'function', 'if', 'immutable', 'import', 'indexed', 'interface',
  'internal', 'is', 'library', 'mapping', 'memory', 'modifier', 'new', 'override',
  'payable', 'pragma', 'private', 'public', 'pure', 'receive', 'require', 'return',
  'returns', 'revert', 'storage', 'struct', 'throw', 'true', 'try', 'type', 'uint',
  'using', 'var', 'view', 'virtual', 'while',
]);
const SOLIDITY_TYPES = new Set([
  'address', 'bool', 'byte', 'bytes', 'bytes1', 'bytes4', 'bytes8', 'bytes16', 'bytes20', 'bytes32',
  'int', 'int8', 'int16', 'int24', 'int32', 'int40', 'int48', 'int56', 'int64', 'int72', 'int80',
  'int88', 'int96', 'int104', 'int112', 'int120', 'int128', 'int136', 'int144', 'int152', 'int160',
  'int168', 'int176', 'int184', 'int192', 'int200', 'int208', 'int216', 'int224', 'int232', 'int240',
  'int248', 'int256', 'string', 'uint', 'uint8', 'uint16', 'uint24', 'uint32', 'uint40', 'uint48',
  'uint56', 'uint64', 'uint72', 'uint80', 'uint88', 'uint96', 'uint104', 'uint112', 'uint120',
  'uint128', 'uint136', 'uint144', 'uint152', 'uint160', 'uint168', 'uint176', 'uint184', 'uint192',
  'uint200', 'uint208', 'uint216', 'uint224', 'uint232', 'uint240', 'uint248', 'uint256',
]);
const SECTION_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    titles: [
      'Introduction',
      'What to Expect',
      'Key Terms',
      'Core Principles',
    ],
  },
  {
    id: 'protocol',
    label: 'Design',
    titles: [
      'Contracts',
      'Deployment Model',
      'Factory Architecture',
      'Instance Storage Model',
      'Execution Boundaries',
      'Tournament Lifecycle',
      'Module Responsibilities',
      'Match Architecture',
      'Entropy and Randomness',
      'Time Control and Escalations',
      'Fee Model and Settlement',
      'Player Profiles',
      'Concrete Game Implementations',
      'Why the `Match` Struct Is Intentionally Flexible',
    ],
  },
  {
    id: 'builders',
    label: 'Guide',
    titles: [
      'Building Games on ETour',
      'What You Need',
      'Dependencies',
      'Project Structure',
      'Example: Checkers',
      'Live Examples',
    ],
  },
  {
    id: 'appendix',
    label: 'Appendix',
    titles: [
      'Practical Reading Order',
    ],
  },
];
const slugifyHeading = (value = '') => value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
const GROUP_TITLE_MAP = new Map(
  SECTION_GROUPS.flatMap((group) => group.titles.map((title) => [title, { id: group.id, label: group.label }])),
);

const resolveDocsHref = (href = '') => {
  if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:)/.test(href)) {
    return href;
  }

  if (href.startsWith('../')) {
    return `${DOCS_REPO_BLOB_BASE}/${href.replace(/^\.\.\//, '')}`;
  }

  if (href.startsWith('./')) {
    if (href === './BuildingGames.md') {
      return '#building-games-on-etour';
    }

    return `${DOCS_REPO_BLOB_BASE}/public/${href.slice(2)}`;
  }

  return href;
};

const solidityTokenClass = (token) => {
  if (/^\s+$/.test(token)) return 'text-slate-200';
  if (/^\/\/.*$/.test(token) || /^\/\*/.test(token)) return 'text-slate-500 italic';
  if (/^"(?:\\.|[^"])*"$/.test(token) || /^'(?:\\.|[^'])*'$/.test(token)) return 'text-emerald-300';
  if (/^0x[a-fA-F0-9]+$/.test(token) || /^\d+(?:_\d+)*$/.test(token)) return 'text-amber-300';
  if (SOLIDITY_TYPES.has(token)) return 'text-sky-300';
  if (SOLIDITY_KEYWORDS.has(token)) return 'text-violet-300';
  if (/^[{}()[\].,;:+\-*/%=&|!<>?^~]+$/.test(token)) return 'text-slate-300';
  return 'text-slate-100';
};

const tokenizeSolidityLine = (line = '') => {
  const tokens = [];
  const pattern = /(\/\/.*$|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\b0x[a-fA-F0-9]+\b|\b\d+(?:_\d+)*\b|\b[A-Za-z_]\w*\b|[{}()[\].,;:+\-*/%=&|!<>?^~]+|\s+)/g;
  let match;

  while ((match = pattern.exec(line)) !== null) {
    const token = match[0];
    tokens.push(
      <span key={`${match.index}-${token}`} className={solidityTokenClass(token)}>
        {token}
      </span>,
    );
  }

  return tokens.length ? tokens : line;
};

const renderCodeBlock = (code = '', language = '', key) => {
  const normalizedLanguage = language.toLowerCase();
  const lines = code.split('\n');
  const label = normalizedLanguage || 'code';
  const isSolidity = normalizedLanguage === 'solidity' || normalizedLanguage === 'sol';

  return (
    <div
      key={key}
      className="my-5 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/90 shadow-[0_18px_50px_rgba(15,23,42,0.35)]"
    >
      <div className="flex items-center justify-between border-b border-slate-700/70 bg-slate-900/95 px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700/80" />
        </div>
      </div>
      <pre className="overflow-x-hidden px-0 py-0">
        <code className="block w-full font-mono text-sm leading-6">
          {lines.map((line, index) => (
            <div
              key={`${key}-line-${index}`}
              className="grid grid-cols-[auto,minmax(0,1fr)] gap-4 px-4 py-[3px] even:bg-white/[0.02]"
            >
              <span className="select-none text-right text-xs text-slate-500">
                {index + 1}
              </span>
              <span className="whitespace-pre-wrap break-words">
                {isSolidity ? tokenizeSolidityLine(line) : (
                  <span className="text-slate-100">{line || ' '}</span>
                )}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
};

const parseDocsStructure = (markdown = '') => {
  const lines = markdown.split('\n');
  const introLines = [];
  const sections = [];
  let title = 'ETour Docs';
  let titleCaptured = false;
  let inCodeBlock = false;
  let h2Count = 0;
  let h3Count = 0;
  let h4Count = 0;
  let h5Count = 0;
  let currentSection = null;
  let currentSubsection = null;
  let currentNested = null;

  lines.forEach((line) => {
    const isFence = line.startsWith('```');

    if (!currentSection && !inCodeBlock && line.startsWith('# ') && !titleCaptured) {
      title = line.substring(2).trim();
      titleCaptured = true;
      return;
    }

    if (isFence) {
      if (currentSection) {
        currentSection.lines.push(line);
      } else {
        introLines.push(line);
      }

      inCodeBlock = !inCodeBlock;
      return;
    }

    if (!inCodeBlock && line.startsWith('## ')) {
      const heading = line.substring(3).trim();
      h2Count += 1;
      h3Count = 0;
      h4Count = 0;
      h5Count = 0;

      const groupMeta = GROUP_TITLE_MAP.get(heading) || { id: 'appendix', label: 'Appendix' };

      currentSection = {
        id: slugifyHeading(heading),
        title: heading,
        label: `${h2Count}. ${heading}`,
        number: h2Count,
        groupId: groupMeta.id,
        groupLabel: groupMeta.label,
        lines: [line],
        items: [],
      };

      currentSubsection = null;
      currentNested = null;
      sections.push(currentSection);
      return;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      introLines.push(line);
    }

    if (inCodeBlock || !currentSection) {
      return;
    }

    if (line.startsWith('### ')) {
      const heading = line.substring(4).trim();
      h3Count += 1;
      h4Count = 0;
      h5Count = 0;
      currentSubsection = {
        id: slugifyHeading(heading),
        label: `${h2Count}.${h3Count} ${heading}`,
        items: [],
      };
      currentNested = null;
      currentSection.items.push(currentSubsection);
      return;
    }

    if (line.startsWith('#### ') && currentSubsection) {
      const heading = line.substring(5).trim();
      h4Count += 1;
      h5Count = 0;
      currentNested = {
        id: slugifyHeading(heading),
        label: `${h2Count}.${h3Count}.${h4Count} ${heading}`,
        items: [],
      };
      currentSubsection.items.push(currentNested);
      return;
    }

    if (line.startsWith('##### ') && currentNested) {
      const heading = line.substring(6).trim();
      h5Count += 1;
      currentNested.items.push({
        id: slugifyHeading(heading),
        label: `${h2Count}.${h3Count}.${h4Count}.${h5Count} ${heading}`,
      });
    }
  });

  return {
    title,
    introMarkdown: introLines.join('\n').trim(),
    sections,
  };
};

const groupSections = (sections = []) => {
  const groups = SECTION_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    sections: [],
  }));
  const extras = [];

  sections.forEach((section) => {
    const group = groups.find((entry) => entry.id === section.groupId);

    if (group) {
      group.sections.push(section);
      return;
    }

    extras.push(section);
  });

  return [
    ...groups.filter((group) => group.sections.length > 0),
    ...(extras.length ? [{
      id: 'appendix',
      label: 'Appendix',
      sections: extras,
    }] : []),
  ];
};

const buildTabsForSection = (section) => {
  const lines = section.lines.slice(1);
  const labelById = new Map(section.items.map((item) => [item.id, item.label]));
  const tabs = [];
  const prelude = [];
  let currentTab = null;
  let inCodeBlock = false;

  lines.forEach((line) => {
    const isFence = line.startsWith('```');

    if (isFence) {
      if (currentTab) {
        currentTab.lines.push(line);
      } else {
        prelude.push(line);
      }

      inCodeBlock = !inCodeBlock;
      return;
    }

    if (!inCodeBlock && line.startsWith('### ')) {
      const title = line.substring(4).trim();
      const id = slugifyHeading(title);
      currentTab = {
        id,
        title,
        label: labelById.get(id) || `${section.number}.${tabs.length + 1} ${title}`,
        order: tabs.length + 1,
        lines: [line],
      };
      tabs.push(currentTab);
      return;
    }

    if (currentTab) {
      currentTab.lines.push(line);
    } else {
      prelude.push(line);
    }
  });

  if (!tabs.length) {
    return [{
      id: section.id,
      title: section.title,
      label: section.label,
      order: 0,
      lines: prelude,
    }];
  }

  if (prelude.join('').trim()) {
    tabs[0].lines = [...prelude, '', ...tabs[0].lines];
  }

  return tabs;
};

const buildAnchorLookup = (sections = []) => {
  const map = new Map();

  const visit = (items, sectionId, tabId) => {
    items.forEach((item) => {
      map.set(item.id, { sectionId, tabId });
      if (item.items?.length) {
        visit(item.items, sectionId, tabId);
      }
    });
  };

  sections.forEach((section) => {
    const defaultTabId = section.tabs[0]?.id || section.id;
    map.set(section.id, { sectionId: section.id, tabId: defaultTabId });
    section.items.forEach((item) => {
      map.set(item.id, { sectionId: section.id, tabId: item.id });
      if (item.items?.length) {
        visit(item.items, section.id, item.id);
      }
    });
  });

  return map;
};

const Docs = () => {
  const navigate = useNavigate();
  const contentPaneRef = useRef(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTabId, setSelectedTabId] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [pendingAnchor, setPendingAnchor] = useState('');

  const colors = {
    primary: 'text-pink-300',
    secondary: 'text-pink-100',
    muted: 'text-fuchsia-200',
    bg: 'from-fuchsia-500/18 via-purple-500/14 to-pink-500/18',
    border: 'border-pink-300/30',
    borderDark: 'border-pink-300/20',
    highlight: 'bg-pink-500/18 border-pink-300/35',
    highlightText: 'text-pink-50',
  };

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await fetch('/Docs.md');
        const text = await response.text();
        setContent(text);
      } catch (error) {
        console.error('Error loading docs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocs();
  }, []);

  const { title, introMarkdown, sections, groupedSections, anchorLookup, sectionsById, flatTabs } = useMemo(() => {
    const data = parseDocsStructure(content);
    const sectionsWithTabs = data.sections.map((section) => ({
      ...section,
      tabs: buildTabsForSection(section),
    }));

    return {
      ...data,
      sections: sectionsWithTabs,
      groupedSections: groupSections(sectionsWithTabs),
      anchorLookup: buildAnchorLookup(sectionsWithTabs),
      sectionsById: new Map(sectionsWithTabs.map((section) => [section.id, section])),
      flatTabs: sectionsWithTabs.flatMap((section) => section.tabs.map((tab) => ({
        sectionId: section.id,
        sectionLabel: section.label,
        tabId: tab.id,
        tabLabel: tab.label,
      }))),
    };
  }, [content]);

  const selectedSection = selectedSectionId ? sectionsById.get(selectedSectionId) : sections[0];
  const selectedTab = selectedSection?.tabs.find((tab) => tab.id === selectedTabId) || selectedSection?.tabs[0] || null;
  const selectedTabIndex = selectedTab
    ? flatTabs.findIndex((tab) => tab.sectionId === selectedSection?.id && tab.tabId === selectedTab.id)
    : -1;
  const previousTab = selectedTabIndex > 0 ? flatTabs[selectedTabIndex - 1] : null;
  const nextTab = selectedTabIndex >= 0 && selectedTabIndex < flatTabs.length - 1
    ? flatTabs[selectedTabIndex + 1]
    : null;

  const openGroupForSection = (sectionId) => {
    const section = sectionsById.get(sectionId);

    if (!section) {
      return;
    }

    setExpandedGroups((current) => {
      const next = new Set(current);
      next.add(section.groupId);
      return next;
    });
  };

  const resetContentScroll = () => {
    if (!contentPaneRef.current) {
      return;
    }

    if (typeof contentPaneRef.current.scrollTo === 'function') {
      contentPaneRef.current.scrollTo({ top: 0 });
      return;
    }

    contentPaneRef.current.scrollTop = 0;
  };

  const highlightAnchor = (anchorId) => {
    const element = document.getElementById(anchorId);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    element.classList.add('highlight-target');
    window.setTimeout(() => {
      element.classList.remove('highlight-target');
    }, 2800);
  };

  useEffect(() => {
    if (!selectedSection?.tabs.length) {
      return;
    }

    if (!selectedSection.tabs.some((tab) => tab.id === selectedTabId)) {
      setSelectedTabId(selectedSection.tabs[0].id);
    }
  }, [selectedSection, selectedTabId]);

  useEffect(() => {
    if (!sections.length) {
      return;
    }

    const hash = decodeURIComponent(window.location.hash.slice(1));
    const initialTarget = anchorLookup.get(hash) || {
      sectionId: sections[0].id,
      tabId: sections[0].tabs[0]?.id || sections[0].id,
    };
    const initialSectionId = initialTarget.sectionId;
    const initialSection = sectionsById.get(initialSectionId);

    setSelectedSectionId(initialSectionId);
    setSelectedTabId(initialTarget.tabId);
    setExpandedGroups(new Set(initialSection ? [initialSection.groupId] : []));
    setExpandedSections(new Set([initialSectionId]));

    if (hash && anchorLookup.has(hash)) {
      setPendingAnchor(hash);
    }
  }, [sections, anchorLookup, sectionsById]);

  useEffect(() => {
    if (!sections.length) {
      return undefined;
    }

    const handleHashChange = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      const target = anchorLookup.get(hash);

      if (!hash || !target) {
        return;
      }

      setSelectedSectionId(target.sectionId);
      setSelectedTabId(target.tabId);
      openGroupForSection(target.sectionId);
      setPendingAnchor(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [sections, anchorLookup, sectionsById]);

  useEffect(() => {
    if (!pendingAnchor || !selectedSectionId || !selectedTabId) {
      resetContentScroll();
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      highlightAnchor(pendingAnchor);
      setPendingAnchor('');
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pendingAnchor, selectedSectionId, selectedTabId]);

  const selectSection = (sectionId, options = {}) => {
    if (!sectionId) {
      return;
    }

    const section = sectionsById.get(sectionId);
    const tabId = options.tabId || section?.tabs[0]?.id || sectionId;
    const hashTarget = options.hashTarget || sectionId;

    setSelectedSectionId(sectionId);
    setSelectedTabId(tabId);
    openGroupForSection(sectionId);
    window.history.replaceState(null, '', `#${hashTarget}`);
    setPendingAnchor(options.highlight ? hashTarget : '');
  };

  const handleAnchorNavigation = (anchorId) => {
    const target = anchorLookup.get(anchorId);

    if (!target) {
      return;
    }

    selectSection(target.sectionId, {
      tabId: target.tabId,
      hashTarget: anchorId,
      highlight: true,
    });
    setExpandedSections((current) => {
      const next = new Set(current);
      next.add(target.sectionId);
      return next;
    });
    setIsMobileNavOpen(false);
  };

  const handleSelectSection = (sectionId) => {
    const section = sectionsById.get(sectionId);
    selectSection(sectionId);

    if (!section?.items.length) {
      return;
    }

    setExpandedSections((current) => {
      const next = new Set(current);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      return next;
    });
  };

  const handleSelectTab = (sectionId, tabId) => {
    selectSection(sectionId, {
      tabId,
      hashTarget: tabId,
      highlight: false,
    });
    setExpandedSections((current) => {
      const next = new Set(current);
      next.add(sectionId);
      return next;
    });
    setIsMobileNavOpen(false);
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups((current) => {
      const next = new Set(current);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  };

  const parseInlineMarkdown = (text) => {
    const parts = [];
    let currentIndex = 0;
    const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }

      if (match[1]) {
        parts.push(<strong key={match.index} className={colors.highlightText}>{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={match.index}>{match[4]}</em>);
      } else if (match[5]) {
        parts.push(
          <code key={match.index} className="rounded bg-slate-900/80 px-2 py-1 text-sm font-mono text-pink-100">
            {match[6]}
          </code>,
        );
      } else if (match[7]) {
        const linkText = match[8];
        const linkUrl = match[9];
        const resolvedHref = resolveDocsHref(linkUrl);

        if (linkUrl.startsWith('#') || resolvedHref.startsWith('#')) {
          const targetHash = resolvedHref.startsWith('#') ? resolvedHref.slice(1) : linkUrl.slice(1);

          parts.push(
            <a
              key={match.index}
              href={`#${targetHash}`}
              className={`${colors.primary} cursor-pointer hover:underline`}
              onClick={(event) => {
                event.preventDefault();
                handleAnchorNavigation(targetHash);
              }}
            >
              {linkText}
            </a>,
          );
        } else {
          parts.push(
            <a
              key={match.index}
              href={resolvedHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${colors.primary} hover:underline`}
            >
              {linkText}
            </a>,
          );
        }
      }

      currentIndex = match.index + match[0].length;
    }

    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const parseMarkdown = (markdown, startingH2 = 0, startingH3 = 0) => {
    if (!markdown) {
      return null;
    }

    const lines = markdown.split('\n');
    const elements = [];
    let currentList = null;
    let currentTable = null;
    let inCodeBlock = false;
    let codeContent = [];
    let codeLanguage = '';
    let h2Count = startingH2;
    let h3Count = startingH3;
    let h4Count = 0;
    let h5Count = 0;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeContent = [];
          codeLanguage = line.slice(3).trim();
        } else {
          inCodeBlock = false;
          elements.push(renderCodeBlock(codeContent.join('\n'), codeLanguage, i));
          codeLanguage = '';
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      if (line.includes('|') && line.trim().startsWith('|')) {
        if (!currentTable) {
          currentTable = { headers: [], rows: [] };
        }

        const cells = line.split('|').filter((cell) => cell.trim());

        if (cells.every((cell) => cell.trim().match(/^-+$/))) {
          continue;
        }

        if (currentTable.headers.length === 0) {
          currentTable.headers = cells;
        } else {
          currentTable.rows.push(cells);
        }

        if (i === lines.length - 1 || !lines[i + 1].includes('|')) {
          elements.push(
            <div key={i} className="my-4 overflow-x-hidden">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className={`border-b ${colors.border}`}>
                    {currentTable.headers.map((header, idx) => (
                      <th key={idx} className="px-4 py-3 text-left font-semibold text-pink-100">
                        {header.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-300/10">
                  {currentTable.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="transition-colors hover:bg-white/[0.03]">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="break-words px-4 py-3 font-mono text-gray-300">
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          );
          currentTable = null;
        }
        continue;
      }

      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className={`mb-2 mt-8 text-3xl font-bold ${colors.secondary}`}>
            {parseInlineMarkdown(line.substring(2))}
          </h1>,
        );
      } else if (line.startsWith('## ')) {
        const headerText = line.substring(3).trim();
        const id = slugifyHeading(headerText);
        h2Count += 1;
        h3Count = 0;
        h4Count = 0;
        h5Count = 0;
        elements.push(
          <h2 key={i} id={id} className={`mb-4 mt-8 scroll-mt-24 text-2xl font-bold ${colors.secondary}`}>
            {parseInlineMarkdown(`${h2Count}. ${headerText}`)}
          </h2>,
        );
      } else if (line.startsWith('### ')) {
        const headerText = line.substring(4).trim();
        const id = slugifyHeading(headerText);
        h3Count += 1;
        h4Count = 0;
        h5Count = 0;
        elements.push(
          <h3 key={i} id={id} className={`mb-3 mt-6 text-xl font-bold ${colors.muted}`}>
            {parseInlineMarkdown(`${h2Count}.${h3Count} ${headerText}`)}
          </h3>,
        );
      } else if (line.startsWith('#### ')) {
        const headerText = line.substring(5).trim();
        const id = slugifyHeading(headerText);
        h4Count += 1;
        h5Count = 0;
        elements.push(
          <h4 key={i} id={id} className={`mb-2 mt-4 scroll-mt-24 text-lg font-semibold ${colors.highlightText}`}>
            {parseInlineMarkdown(`${h2Count}.${h3Count}.${h4Count} ${headerText}`)}
          </h4>,
        );
      } else if (line.startsWith('##### ')) {
        const headerText = line.substring(6).trim();
        const id = slugifyHeading(headerText);
        h5Count += 1;
        elements.push(
          <h5 key={i} id={id} className={`mb-2 mt-3 text-base font-semibold ${colors.secondary}`}>
            {parseInlineMarkdown(`${h2Count}.${h3Count}.${h4Count}.${h5Count} ${headerText}`)}
          </h5>,
        );
      } else if (line.match(/^-{3,}$/)) {
        elements.push(<hr key={i} className={`${colors.borderDark} my-8`} />);
      } else if (line.match(/^(\d+\.|[-*])\s/)) {
        const isOrdered = line.match(/^\d+\.\s/);
        const listItem = line.replace(/^(\d+\.|[-*])\s/, '');

        if (!currentList || currentList.type !== (isOrdered ? 'ol' : 'ul')) {
          if (currentList) {
            elements.push(currentList.element);
          }
          currentList = {
            type: isOrdered ? 'ol' : 'ul',
            items: [],
            element: null,
          };
        }

        currentList.items.push(
          <li key={`${i}-item`} className="text-gray-300">
            {parseInlineMarkdown(listItem)}
          </li>,
        );

        if (i === lines.length - 1 || !lines[i + 1].match(/^(\d+\.|[-*])\s/)) {
          const ListTag = currentList.type;
          const className = currentList.type === 'ol'
            ? 'my-4 ml-4 list-inside list-decimal space-y-2 text-gray-300'
            : 'my-4 ml-4 list-inside list-disc space-y-2 text-gray-300';

          elements.push(
            <ListTag key={i} className={className}>
              {currentList.items}
            </ListTag>,
          );
          currentList = null;
        }
      } else if (line.startsWith('>')) {
        const quoteContent = line.substring(1).trim();
        elements.push(
          <div key={i} className={`${colors.highlight} my-4 rounded-lg border p-4`}>
            <p className={colors.highlightText}>
              {parseInlineMarkdown(quoteContent)}
            </p>
          </div>,
        );
      } else if (line.trim()) {
        elements.push(
          <p key={i} className="my-3 text-gray-300">
            {parseInlineMarkdown(line)}
          </p>,
        );
      }
    }

    if (currentList) {
      const ListTag = currentList.type;
      const className = currentList.type === 'ol'
        ? 'my-4 ml-4 list-inside list-decimal space-y-2 text-gray-300'
        : 'my-4 ml-4 list-inside list-disc space-y-2 text-gray-300';

      elements.push(
        <ListTag key="final-list" className={className}>
          {currentList.items}
        </ListTag>,
      );
    }

    return elements;
  };

  const renderSubsectionLinks = (items, sectionId, depth = 0) => (
    <div className={`${depth > 0 ? 'ml-6 border-l border-pink-300/10 pl-5' : 'mt-3 ml-5 border-l border-pink-300/10 pl-4'} space-y-2`}>
      {items.map((item) => (
        <div key={item.id}>
          {depth === 0 ? (
            <button
              type="button"
              className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:text-white ${
                selectedTab?.id === item.id
                  ? 'bg-pink-400/12 text-white'
                  : 'font-medium text-pink-100'
              }`}
              onClick={() => handleSelectTab(sectionId, item.id)}
            >
              {parseInlineMarkdown(item.label)}
            </button>
          ) : (
            <a
              href={`#${item.id}`}
              className={`block transition-colors hover:text-white ${
                depth === 1
                  ? 'pl-1 text-xs text-pink-200/90'
                  : 'pl-2 text-[11px] text-pink-100/75'
              }`}
              onClick={(event) => {
                event.preventDefault();
                handleAnchorNavigation(item.id);
              }}
            >
              {parseInlineMarkdown(item.label)}
            </a>
          )}
          {item.items?.length ? renderSubsectionLinks(item.items, sectionId, depth + 1) : null}
        </div>
      ))}
    </div>
  );

  const renderSectionGroups = (isMobile = false) => (
    <div className="space-y-4 overflow-y-auto pr-1 lg:h-[calc(68vh-4rem)]">
      {groupedSections.map((group) => {
        const isExpanded = expandedGroups.has(group.id);

        return (
          <section key={group.id} className="rounded-2xl border border-pink-300/10 bg-white/[0.03]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${group.label}`}
              aria-expanded={isExpanded}
              onClick={() => toggleGroup(group.id)}
            >
              <div className="text-sm font-semibold text-pink-50">{group.label}</div>
              <ChevronRight
                size={16}
                className={`text-pink-200 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>
            {isExpanded ? (
              <div className="space-y-2 border-t border-pink-300/10 px-3 py-3">
                {group.sections.map((section) => {
                  const isActive = section.id === selectedSection.id;
                  const isExpandedSection = expandedSections.has(section.id);
                  const hasSubsections = section.items.length > 0;

                  return (
                    <div key={section.id} className="rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleSelectSection(section.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                          isActive
                            ? 'bg-pink-400/15 text-white'
                            : 'text-pink-100/85 hover:bg-white/[0.04] hover:text-white'
                        }`}
                      >
                        <span>{parseInlineMarkdown(section.label)}</span>
                        {hasSubsections ? (
                          <ChevronRight
                            size={15}
                            className={`shrink-0 transition-transform ${isExpandedSection ? 'rotate-90' : ''}`}
                          />
                        ) : null}
                      </button>
                      {isExpandedSection && hasSubsections ? (
                        <div className="px-3 pb-2">
                          {renderSubsectionLinks(section.items, section.id)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );

  return (
    <div
      className="min-h-screen p-4"
      style={{
        background: 'linear-gradient(135deg, #160022 0%, #2a0a46 52%, #18002d 100%)',
      }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-pink-200 transition-colors hover:text-white"
          >
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </button>

          <a
            href="/Docs.md"
            className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-300 transition-colors hover:text-white"
          >
            Agent Version
          </a>
        </div>

        <div className={`rounded-3xl border ${colors.border} bg-gradient-to-br ${colors.bg} p-6 backdrop-blur-lg md:p-8`}>
          {!isLoading && selectedSection ? (
            <div className="sticky top-3 z-40 mb-4 flex lg:hidden">
              <button
                type="button"
                aria-label={isMobileNavOpen ? 'Close docs navigation' : 'Open docs navigation'}
                aria-expanded={isMobileNavOpen}
                onClick={() => setIsMobileNavOpen((current) => !current)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-pink-300/25 bg-[#240635]/90 text-pink-100 shadow-[0_8px_24px_rgba(0,0,0,0.24)] backdrop-blur"
              >
                {isMobileNavOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          ) : null}

          {isMobileNavOpen && !isLoading && selectedSection ? (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                aria-label="Close docs navigation"
                onClick={() => setIsMobileNavOpen(false)}
                className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
              />
              <div className="absolute left-4 right-4 top-16 max-h-[70vh] overflow-hidden rounded-2xl border border-pink-300/20 bg-[#220530]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ListTree className={colors.primary} size={18} />
                    <h2 className={`text-lg font-semibold ${colors.secondary}`}>Browse Docs</h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close docs navigation"
                    onClick={() => setIsMobileNavOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-pink-300/15 text-pink-100 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="max-h-[calc(70vh-4.5rem)] overflow-y-auto">
                  {renderSectionGroups(true)}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mb-8 flex items-start gap-3">
            <BookOpen className={`${colors.primary} mt-1`} size={28} />
            <div>
              <h1 className={`text-3xl font-bold ${colors.secondary}`}>{title}</h1>
            </div>
            {isLoading ? (
              <span className="ml-auto text-sm text-gray-400">(Loading...)</span>
            ) : null}
          </div>

          {introMarkdown ? (
            <section className={`mb-8 rounded-2xl border ${colors.borderDark} bg-black/10 p-5`}>
              <div className="space-y-4">
                {parseMarkdown(introMarkdown)}
              </div>
            </section>
          ) : null}

          {!isLoading && selectedSection ? (
            <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
              <aside
                className={`hidden rounded-2xl border ${colors.borderDark} bg-black/15 p-4 lg:sticky lg:top-4 lg:block lg:h-[68vh] lg:overflow-hidden`}
              >
                <div className="mb-4 flex items-center gap-2">
                  <ListTree className={colors.primary} size={18} />
                  <h2 className={`text-lg font-semibold ${colors.secondary}`}>Browse Docs</h2>
                </div>
                {renderSectionGroups(false)}
              </aside>

              <section
                className={`rounded-2xl border ${colors.borderDark} bg-black/15 lg:h-[68vh] lg:overflow-hidden`}
              >
                <div className="flex h-full flex-col">
                  <div className="border-b border-pink-300/10 px-6 pb-5 pt-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-200/60">
                      {selectedSection.groupLabel}
                    </div>
                    <h2 id={selectedSection.id} className={`mt-2 text-2xl font-bold ${colors.secondary}`}>
                      {parseInlineMarkdown(selectedSection.label)}
                    </h2>
                  </div>
                  <div
                    ref={contentPaneRef}
                    className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5"
                  >
                    <div className="space-y-4 break-words">
                      {selectedTab
                        ? parseMarkdown(
                            selectedTab.lines.join('\n'),
                            selectedSection.number,
                            Math.max(0, (selectedTab.order || 1) - 1),
                          )
                        : null}
                    </div>
                  </div>
                  <div className="border-t border-pink-300/10 px-6 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        aria-label="Previous tab"
                        onClick={() => previousTab && selectSection(previousTab.sectionId, {
                          tabId: previousTab.tabId,
                          hashTarget: previousTab.tabId,
                          highlight: false,
                        })}
                        disabled={!previousTab}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                          previousTab
                            ? 'border-pink-300/20 text-pink-100 hover:bg-white/[0.04] hover:text-white'
                            : 'cursor-not-allowed border-pink-300/10 text-pink-100/35'
                        }`}
                      >
                        <ChevronLeft size={16} />
                        <span>{previousTab ? previousTab.tabLabel : 'Start of docs'}</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Next tab"
                        onClick={() => nextTab && selectSection(nextTab.sectionId, {
                          tabId: nextTab.tabId,
                          hashTarget: nextTab.tabId,
                          highlight: false,
                        })}
                        disabled={!nextTab}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                          nextTab
                            ? 'border-pink-300/20 text-pink-100 hover:bg-white/[0.04] hover:text-white'
                            : 'cursor-not-allowed border-pink-300/10 text-pink-100/35'
                        }`}
                      >
                        <span>{nextTab ? nextTab.tabLabel : 'End of docs'}</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          <div className={`mt-12 border-t ${colors.borderDark} pt-8`}>
            <p className="text-center text-sm text-pink-100/65">
              This document describes ETour&apos;s protocol architecture and implementation details.
              Always verify contract implementations before interacting.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes highlightPulse {
          0%, 100% {
            background-color: transparent;
          }
          50% {
            background-color: rgba(236, 72, 153, 0.18);
          }
        }

        .highlight-target {
          animation: highlightPulse 1.4s ease-in-out 2;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default Docs;
