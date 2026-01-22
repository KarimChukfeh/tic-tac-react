/**
 * BracketScrollHint - Shows scroll hints on mobile when bracket/matches are out of view
 *
 * Displays pulsing "scroll ↑ to matches" or "scroll ↓ to matches" hints
 * when the tournament bracket is outside the visible viewport on mobile devices.
 */

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const BracketScrollHint = ({ bracketRef }) => {
  const [showHint, setShowHint] = useState(false);
  const [scrollDirection, setScrollDirection] = useState(null); // 'up' or 'down'

  useEffect(() => {
    if (!bracketRef?.current) return;

    const checkBracketVisibility = () => {
      const bracketElement = bracketRef.current;
      if (!bracketElement) return;

      const rect = bracketElement.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Check if bracket is completely above or below the viewport
      const isAboveViewport = rect.bottom < 0;
      const isBelowViewport = rect.top > windowHeight;
      const isVisible = !isAboveViewport && !isBelowViewport;

      if (isVisible) {
        setShowHint(false);
        setScrollDirection(null);
      } else {
        setShowHint(true);
        setScrollDirection(isAboveViewport ? 'up' : 'down');
      }
    };

    // Use IntersectionObserver for better performance
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShowHint(false);
            setScrollDirection(null);
          } else {
            // Determine direction based on position
            const rect = entry.boundingClientRect;
            const isAboveViewport = rect.bottom < 0;

            setShowHint(true);
            setScrollDirection(isAboveViewport ? 'up' : 'down');
          }
        });
      },
      {
        threshold: 0,
        rootMargin: '0px'
      }
    );

    observer.observe(bracketRef.current);

    // Also listen to scroll for immediate updates
    window.addEventListener('scroll', checkBracketVisibility);
    checkBracketVisibility(); // Initial check

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', checkBracketVisibility);
    };
  }, [bracketRef]);

  const handleScrollToBracket = () => {
    if (bracketRef?.current) {
      bracketRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Only show on mobile/tablet (max-width: 1024px)
  if (!showHint || !scrollDirection) return null;

  const isScrollUp = scrollDirection === 'up';

  return (
    <>
      {/* Only render on mobile - use Tailwind breakpoints */}
      <div className="lg:hidden">
        {/* Position at top if scrolling up, bottom if scrolling down */}
        <div
          style={{
            position: 'fixed',
            [isScrollUp ? 'top' : 'bottom']: isScrollUp ? '16px' : '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999
          }}
        >
          <button
            onClick={handleScrollToBracket}
            style={{
              backgroundColor: '#9333ea',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              opacity: 1,
              border: '2px solid white',
              borderRadius: '9999px',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              cursor: 'pointer',
              position: 'relative'
            }}
            aria-label={`Scroll ${scrollDirection} to matches`}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7e22ce'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#9333ea'}
          >
            {isScrollUp ? (
              <>
                <ArrowUp size={20} className="animate-bounce" />
                <span>View Matches</span>
              </>
            ) : (
              <>
                <span>View Matches</span>
                <ArrowDown size={20} className="animate-bounce" />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default BracketScrollHint;
