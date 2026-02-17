/**
 * Whitepaper - Displays the ETour whitepaper documentation
 *
 * Shows the comprehensive ETour whitepaper with formatted markdown content
 * matching the same style as the user manual.
 */

import { useEffect, useState } from 'react';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Whitepaper = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Color scheme matching UserManual
  const colors = {
    primary: 'text-purple-400',
    secondary: 'text-purple-200',
    muted: 'text-purple-300',
    bg: 'from-blue-500/10 to-purple-500/10',
    border: 'border-purple-400/30',
    borderDark: 'border-purple-400/20',
    highlight: 'bg-purple-500/20 border-purple-400/40',
    highlightText: 'text-purple-100'
  };

  // Fetch and parse the markdown content
  useEffect(() => {
    const fetchWhitepaper = async () => {
      try {
        const response = await fetch('/ETour_Whitepaper.md');
        const text = await response.text();
        setContent(text);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading whitepaper:', error);
        setIsLoading(false);
      }
    };

    fetchWhitepaper();
  }, []);

  // Parse markdown to HTML-like structure
  const parseMarkdown = (markdown) => {
    if (!markdown) return null;

    const lines = markdown.split('\n');
    const elements = [];
    let currentList = null;
    let currentTable = null;
    let inCodeBlock = false;
    let codeContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeContent = [];
        } else {
          inCodeBlock = false;
          elements.push(
            <pre key={i} className="bg-gray-800 rounded-lg p-4 overflow-x-auto my-4">
              <code className="text-sm text-gray-300 font-mono">
                {codeContent.join('\n')}
              </code>
            </pre>
          );
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Handle tables
      if (line.includes('|') && line.trim().startsWith('|')) {
        if (!currentTable) {
          currentTable = { headers: [], rows: [] };
        }

        const cells = line.split('|').filter(cell => cell.trim());

        // Check if it's a separator line
        if (cells.every(cell => cell.trim().match(/^-+$/))) {
          continue;
        }

        if (currentTable.headers.length === 0) {
          currentTable.headers = cells;
        } else {
          currentTable.rows.push(cells);
        }

        // Check if next line is not a table line
        if (i === lines.length - 1 || !lines[i + 1].includes('|')) {
          elements.push(
            <div key={i} className="overflow-x-auto my-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${colors.border}`}>
                    {currentTable.headers.map((header, idx) => (
                      <th key={idx} className="text-left py-3 px-4 text-blue-200 font-semibold">
                        {header.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/20">
                  {currentTable.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-blue-500/5 transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="py-3 px-4 text-gray-300 font-mono">
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          currentTable = null;
        }
        continue;
      }

      // Handle headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className={`text-3xl font-bold ${colors.secondary} mb-2 mt-8`}>
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        const headerText = line.substring(3).trim();
        const id = headerText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        elements.push(
          <h2 key={i} id={id} className={`text-2xl font-bold ${colors.secondary} mb-4 mt-8 scroll-mt-24`}>
            {headerText}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        const id = line.substring(4).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        elements.push(
          <h3 key={i} id={id} className={`text-xl font-bold ${colors.muted} mb-3 mt-6`}>
            {line.substring(4)}
          </h3>
        );
      } else if (line.startsWith('#### ')) {
        const id = line.substring(5).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        elements.push(
          <h4 key={i} id={id} className={`text-lg font-semibold ${colors.highlightText} mb-2 mt-4 scroll-mt-24`}>
            {line.substring(5)}
          </h4>
        );
      } else if (line.startsWith('##### ')) {
        const id = line.substring(6).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        elements.push(
          <h5 key={i} id={id} className={`text-md font-semibold ${colors.secondary} mb-2 mt-3 scroll-mt-24`}>
            {line.substring(6)}
          </h5>
        );
      }
      // Handle horizontal rules
      else if (line.match(/^-{3,}$/)) {
        elements.push(
          <hr key={i} className={`${colors.borderDark} my-8`} />
        );
      }
      // Handle lists
      else if (line.match(/^(\d+\.|[-*])\s/)) {
        const isOrdered = line.match(/^\d+\.\s/);
        const listItem = line.replace(/^(\d+\.|[-*])\s/, '');

        if (!currentList || currentList.type !== (isOrdered ? 'ol' : 'ul')) {
          if (currentList) {
            elements.push(currentList.element);
          }
          currentList = {
            type: isOrdered ? 'ol' : 'ul',
            items: [],
            element: null
          };
        }

        currentList.items.push(
          <li key={`${i}-item`} className="text-gray-300">
            {parseInlineMarkdown(listItem)}
          </li>
        );

        // Check if next line is not a list item
        if (i === lines.length - 1 || !lines[i + 1].match(/^(\d+\.|[-*])\s/)) {
          const ListTag = currentList.type;
          const className = currentList.type === 'ol'
            ? "list-decimal list-inside space-y-2 text-gray-300 ml-4 my-4"
            : "list-disc list-inside space-y-2 text-gray-300 ml-4 my-4";

          elements.push(
            <ListTag key={i} className={className}>
              {currentList.items}
            </ListTag>
          );
          currentList = null;
        }
      }
      // Handle blockquotes (special highlighted sections)
      else if (line.startsWith('>')) {
        const quoteContent = line.substring(1).trim();
        elements.push(
          <div key={i} className={`${colors.highlight} border rounded-lg p-4 my-4`}>
            <p className={colors.highlightText}>
              {parseInlineMarkdown(quoteContent)}
            </p>
          </div>
        );
      }
      // Handle regular paragraphs
      else if (line.trim()) {
        // Check if this is a standalone link (TOC style)
        const standaloneLinkMatch = line.match(/^\[(.+)\]\((.+)\)$/);
        // Check if this is an indented subheader link (starts with spaces/bullet)
        const indentedLinkMatch = line.match(/^\s+[•\-]\s*\[(.+)\]\((.+)\)$/);

        if (indentedLinkMatch) {
          const linkText = indentedLinkMatch[1];
          const linkUrl = indentedLinkMatch[2];
          elements.push(
            <div key={i} className="my-1 ml-6 flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <a
                href={linkUrl}
                className={`${colors.primary} hover:${colors.secondary} text-base font-normal transition-colors cursor-pointer`}
                onClick={(e) => {
                  e.preventDefault();
                  // Use setTimeout to ensure DOM is fully rendered
                  setTimeout(() => {
                    const targetId = linkUrl.substring(1); // Remove the #
                    const element = document.getElementById(targetId);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      // Add highlight animation
                      element.classList.add('highlight-target');
                      setTimeout(() => {
                        element.classList.remove('highlight-target');
                      }, 3500);
                    }
                  }, 50);
                }}
              >
                {linkText}
              </a>
            </div>
          );
        } else if (standaloneLinkMatch) {
          const linkText = standaloneLinkMatch[1];
          const linkUrl = standaloneLinkMatch[2];
          elements.push(
            <div key={i} className="my-2">
              <a
                href={linkUrl}
                className={`${colors.primary} hover:${colors.secondary} text-lg font-medium transition-colors cursor-pointer`}
                onClick={(e) => {
                  e.preventDefault();
                  // Use setTimeout to ensure DOM is fully rendered
                  setTimeout(() => {
                    const targetId = linkUrl.substring(1); // Remove the #
                    const element = document.getElementById(targetId);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      // Add highlight animation
                      element.classList.add('highlight-target');
                      setTimeout(() => {
                        element.classList.remove('highlight-target');
                      }, 3500);
                    }
                  }, 50);
                }}
              >
                {linkText}
              </a>
            </div>
          );
        } else {
          elements.push(
            <p key={i} className="text-gray-300 my-3">
              {parseInlineMarkdown(line)}
            </p>
          );
        }
      }
    }

    // Clean up any remaining lists
    if (currentList) {
      const ListTag = currentList.type;
      const className = currentList.type === 'ol'
        ? "list-decimal list-inside space-y-2 text-gray-300 ml-4 my-4"
        : "list-disc list-inside space-y-2 text-gray-300 ml-4 my-4";

      elements.push(
        <ListTag key="final-list" className={className}>
          {currentList.items}
        </ListTag>
      );
    }

    return elements;
  };

  // Parse inline markdown (bold, italic, links, code)
  const parseInlineMarkdown = (text) => {
    const parts = [];
    let currentIndex = 0;

    // Combined regex for all inline markdown
    const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }

      if (match[1]) {
        // Bold
        parts.push(<strong key={match.index} className={colors.highlightText}>{match[2]}</strong>);
      } else if (match[3]) {
        // Italic
        parts.push(<em key={match.index}>{match[4]}</em>);
      } else if (match[5]) {
        // Inline code
        parts.push(
          <code key={match.index} className="bg-gray-800 px-2 py-1 rounded text-sm font-mono text-gray-300">
            {match[6]}
          </code>
        );
      } else if (match[7]) {
        // Link
        const linkText = match[8];
        const linkUrl = match[9];

        // Check if it's an internal link (starts with #)
        if (linkUrl.startsWith('#')) {
          parts.push(
            <a
              key={match.index}
              href={linkUrl}
              className={`${colors.primary} hover:underline cursor-pointer`}
              onClick={(e) => {
                e.preventDefault();
                const element = document.querySelector(linkUrl);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              {linkText}
            </a>
          );
        } else {
          parts.push(
            <a
              key={match.index}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${colors.primary} hover:underline`}
            >
              {linkText}
            </a>
          );
        }
      }

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Handle hash navigation and trigger highlight animation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Add highlight animation
            element.classList.add('highlight-target');
            setTimeout(() => {
              element.classList.remove('highlight-target');
            }, 3500);
          }
        }, 100);
      }
    };

    // Trigger on mount if there's already a hash in URL
    if (!isLoading) {
      handleHashChange();
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [isLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>

        <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-8`}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className={colors.primary} size={28} />
            <h1 className={`text-3xl font-bold ${colors.secondary}`}>ETour Whitepaper</h1>
            {isLoading && (
              <span className="text-sm text-gray-400">(Loading...)</span>
            )}
          </div>

          {/* Content */}
          {!isLoading && (
            <div className="space-y-4">
              {parseMarkdown(content)}
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-purple-400/20">
            <p className="text-sm text-gray-400 text-center">
              ETour operates autonomously according to its smart contract code.
              This document describes the protocol's design and philosophy.
              Always verify contract implementations before interacting.
            </p>
          </div>
        </div>
      </div>

      {/* Add CSS for highlight animation */}
      <style jsx>{`
        @keyframes highlightPulse {
          0%, 100% {
            background-color: transparent;
          }
          50% {
            background-color: rgba(147, 51, 234, 0.2);
          }
        }

        :global(.highlight-target) {
          animation: highlightPulse 1.5s ease-in-out 2;
          padding-left: 1rem;
          margin-left: -1rem;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default Whitepaper;