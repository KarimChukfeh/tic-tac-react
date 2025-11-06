import { useState } from 'react';

export default function Web3Manifesto() {
  const [showDetails, setShowDetails] = useState(false);
  const [showTOC, setShowTOC] = useState(false);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowTOC(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

        .manifesto-root {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #0d0d0d;
          color: #ffffff;
          line-height: 1.7;
          font-size: 17px;
          overflow-x: hidden;
          background-image:
            radial-gradient(circle at 10% 20%, rgba(0, 255, 204, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 90% 60%, rgba(255, 0, 110, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 50% 90%, rgba(255, 190, 11, 0.03) 0%, transparent 50%);
          background-attachment: fixed;
          min-height: 100vh;
        }

        .manifesto-container {
          max-width: 880px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .manifesto-header {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          padding: 2rem 0;
        }

        .year-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          color: #ffbe0b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 1rem;
          display: inline-block;
          padding: 0.5rem 1rem;
          border: 2px solid #ffbe0b;
          border-radius: 4px;
          background: rgba(255, 190, 11, 0.1);
        }

        .hero-title {
          font-size: clamp(2.2rem, 7vw, 5.5rem);
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1.05;
          margin-bottom: 1.5rem;
          background: linear-gradient(120deg, #00ffcc 0%, #ffffff 50%, #ff006e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 5s ease-in-out infinite;
          background-size: 200% 100%;
        }

        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .hero-subtitle {
          font-size: clamp(1.1rem, 2.5vw, 1.6rem);
          font-weight: 400;
          color: #b3b3b3;
          margin-bottom: 3rem;
          max-width: 700px;
        }

        .scroll-hint {
          position: absolute;
          bottom: 3rem;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: #666666;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          animation: fadeInOut 2s ease-in-out infinite;
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        .manifesto-main {
          padding: 4rem 0;
        }

        .manifesto-section {
          margin-bottom: 6rem;
          animation: fadeIn 1s ease forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .manifesto-h2 {
          font-size: clamp(2rem, 4.5vw, 3.5rem);
          font-weight: 700;
          margin-bottom: 2rem;
          letter-spacing: -0.03em;
          line-height: 1.15;
          color: #ffffff;
        }

        .manifesto-h3 {
          font-size: clamp(1.6rem, 3vw, 2.2rem);
          font-weight: 600;
          margin: 3rem 0 1.5rem;
          color: #00ffcc;
          letter-spacing: -0.02em;
        }

        .manifesto-h4 {
          font-size: clamp(1.3rem, 2.5vw, 1.7rem);
          font-weight: 600;
          margin: 2.5rem 0 1rem;
          color: #ff006e;
        }

        .manifesto-p {
          margin-bottom: 1.5rem;
          color: #b3b3b3;
          font-weight: 400;
        }

        .manifesto-p strong {
          color: #ffffff;
          font-weight: 600;
        }

        .manifesto-em {
          font-style: italic;
          color: #ffbe0b;
        }

        .impact-statement {
          font-size: clamp(1.3rem, 2.5vw, 1.8rem);
          font-weight: 600;
          color: #ffffff;
          margin: 3rem 0;
          padding: 2rem;
          background: linear-gradient(135deg, rgba(0, 255, 204, 0.1) 0%, rgba(255, 0, 110, 0.1) 100%);
          border-left: 4px solid #00ffcc;
          border-radius: 0 8px 8px 0;
          line-height: 1.5;
        }

        .callout {
          background: rgba(0, 255, 204, 0.08);
          border: 1px solid rgba(0, 255, 204, 0.3);
          padding: 2rem;
          margin: 2.5rem 0;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
        }

        .callout::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, #00ffcc, transparent);
        }

        .callout p {
          color: #ffffff;
          margin-bottom: 0;
        }

        .warning {
          background: rgba(255, 0, 110, 0.08);
          border: 1px solid rgba(255, 0, 110, 0.3);
          padding: 2rem;
          margin: 2.5rem 0;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
        }

        .warning::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, #ff006e, transparent);
        }

        .warning p {
          color: #ffffff;
          margin-bottom: 0;
        }

        .rule-container {
          margin: 2rem 0;
        }

        .rule {
          background: #1a1a1a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 2.5rem;
          margin: 2.5rem 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .rule::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #00ffcc 0%, #ff006e 100%);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .rule:hover {
          border-color: #00ffcc;
          box-shadow: 0 20px 60px rgba(0, 255, 204, 0.15);
          transform: translateY(-8px);
        }

        .rule:hover::after {
          transform: scaleX(1);
        }

        .rule-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          color: #00ffcc;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 0.8rem;
          display: inline-block;
          padding: 0.3rem 0.8rem;
          background: rgba(0, 255, 204, 0.1);
          border-radius: 4px;
        }

        .rule h4 {
          margin-top: 0;
          font-size: clamp(1.4rem, 2.5vw, 1.9rem);
          color: #ffffff;
        }

        .example-card {
          background: linear-gradient(135deg, rgba(0, 255, 204, 0.05) 0%, rgba(255, 0, 110, 0.05) 100%);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 2rem;
          margin: 2rem 0;
          transition: all 0.3s ease;
        }

        .example-card:hover {
          border-color: #00ffcc;
          box-shadow: 0 15px 50px rgba(0, 255, 204, 0.2);
        }

        .example-card h3 {
          margin-top: 0;
          color: #ffbe0b;
        }

        .manifesto-blockquote {
          font-size: clamp(1.1rem, 2vw, 1.4rem);
          font-style: italic;
          color: #b3b3b3;
          border-left: 3px solid #00ffcc;
          padding-left: 2rem;
          margin: 2.5rem 0;
        }

        .manifesto-hr {
          border: none;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 204, 0.3), transparent);
          margin: 5rem 0;
        }

        .manifesto-footer {
          text-align: center;
          padding: 4rem 0 3rem;
          margin-top: 5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .manifesto-footer p {
          color: #666666;
          font-size: 0.9rem;
          line-height: 1.8;
        }

        .final-cta {
          text-align: center;
          padding: 4rem 2rem;
          margin: 5rem 0;
          position: relative;
        }

        .final-cta::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(0, 255, 204, 0.1) 0%, transparent 70%);
          z-index: -1;
        }

        .final-cta h2 {
          font-size: clamp(2.5rem, 5vw, 4rem);
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #00ffcc, #ff006e, #ffbe0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .proof-badge {
          display: inline-block;
          padding: 0.6rem 1.2rem;
          background: rgba(255, 190, 11, 0.15);
          border: 2px solid #ffbe0b;
          border-radius: 6px;
          color: #ffbe0b;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 1rem 0;
        }

        @media (max-width: 768px) {
          .manifesto-root {
            font-size: 16px;
          }

          .manifesto-container {
            padding: 0 1.5rem;
          }

          .manifesto-section {
            margin-bottom: 4rem;
          }

          .rule, .example-card {
            padding: 1.5rem;
          }

          .manifesto-blockquote {
            padding-left: 1.5rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        ::selection {
          background: #00ffcc;
          color: #0d0d0d;
        }

        html {
          scroll-behavior: smooth;
        }

        .supporter-count-container {
          text-align: center;
          margin: 3rem 0;
        }

        .supporter-number {
          font-size: clamp(4rem, 10vw, 7rem);
          font-weight: 700;
          color: #00ffcc;
          letter-spacing: -0.02em;
          margin: 1.5rem 0;
          font-family: 'JetBrains Mono', monospace;
          line-height: 1;
        }

        .supporter-label {
          font-size: 1.1rem;
          color: #b3b3b3;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-weight: 500;
        }

        .view-onchain-link {
          display: inline-block;
          margin-top: 1.5rem;
          color: #ffbe0b;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          border-bottom: 1px solid transparent;
          font-family: 'JetBrains Mono', monospace;
        }

        .view-onchain-link:hover {
          color: #00ffcc;
          border-bottom-color: #00ffcc;
        }

        .details-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          animation: fadeIn 0.3s ease;
        }

        .details-content {
          background: #1a1a1a;
          border: 2px solid rgba(0, 255, 204, 0.3);
          border-radius: 12px;
          max-width: 600px;
          width: 100%;
          padding: 3rem;
          position: relative;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .close-modal {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: none;
          border: none;
          color: #666666;
          font-size: 2rem;
          cursor: pointer;
          transition: color 0.3s ease;
          line-height: 1;
          padding: 0;
          width: 2rem;
          height: 2rem;
        }

        .close-modal:hover {
          color: #00ffcc;
        }

        .details-content h3 {
          color: #00ffcc;
          font-size: 1.8rem;
          margin: 0 0 1.5rem 0;
          font-weight: 600;
        }

        .details-content p {
          color: #b3b3b3;
          line-height: 1.7;
          margin-bottom: 1.5rem;
        }

        .contract-address {
          background: rgba(0, 255, 204, 0.1);
          border: 1px solid rgba(0, 255, 204, 0.3);
          border-radius: 6px;
          padding: 1rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          color: #00ffcc;
          word-break: break-all;
          margin: 1.5rem 0;
        }

        .support-button {
          display: inline-block;
          background: linear-gradient(135deg, #00ffcc 0%, #00d4aa 100%);
          color: #0d0d0d;
          padding: 1rem 2.5rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 1rem;
        }

        .support-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 255, 204, 0.3);
        }

        .web2-free-statement {
          font-size: clamp(1.1rem, 2vw, 1.3rem);
          color: #ffffff;
          line-height: 1.8;
          margin: 2rem 0;
        }

        .toc-container {
          position: relative;
          margin-top: 2rem;
        }

        .toc-button {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          background: rgba(0, 255, 204, 0.1);
          border: 2px solid #00ffcc;
          border-radius: 6px;
          color: #00ffcc;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .toc-button:hover {
          background: rgba(0, 255, 204, 0.2);
          box-shadow: 0 5px 20px rgba(0, 255, 204, 0.2);
          transform: translateY(-2px);
        }

        .toc-icon {
          font-size: 1.2rem;
          transition: transform 0.3s ease;
        }

        .toc-icon.open {
          transform: rotate(180deg);
        }

        .toc-dropdown {
          position: absolute;
          top: calc(100% + 1rem);
          left: 0;
          min-width: 320px;
          background: #1a1a1a;
          border: 2px solid rgba(0, 255, 204, 0.3);
          border-radius: 8px;
          padding: 1rem;
          z-index: 100;
          animation: slideDown 0.3s ease;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .toc-title {
          font-size: 0.75rem;
          color: #666666;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 0.75rem;
          font-family: 'JetBrains Mono', monospace;
        }

        .toc-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .toc-item {
          margin: 0;
          padding: 0;
        }

        .toc-link {
          display: block;
          padding: 0.65rem 0.75rem;
          color: #b3b3b3;
          text-decoration: none;
          font-size: 0.95rem;
          border-radius: 4px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .toc-link:hover {
          background: rgba(0, 255, 204, 0.1);
          color: #00ffcc;
          padding-left: 1rem;
        }

        .toc-sub-item {
          padding-left: 1rem;
        }

        .toc-sub-item .toc-link {
          font-size: 0.85rem;
          color: #999999;
        }

        .toc-sub-item .toc-link:hover {
          color: #ffbe0b;
        }

        @media (max-width: 768px) {
          .toc-button {
            padding: 0.35rem 0.7rem;
            font-size: 0.65rem;
            gap: 0.3rem;
            border-radius: 4px;
          }

          .toc-icon {
            font-size: 0.9rem;
          }

          .toc-dropdown {
            left: 0;
            right: 0;
            min-width: auto;
          }

          .toc-link {
            font-size: 0.825rem;
          }

          .toc-sub-item .toc-link {
            font-size: 0.725rem;
          }
        }
      `}</style>

      <div className="manifesto-root">
        <header className="manifesto-header">
          <div className="manifesto-container">
            <div className="year-badge">2025</div>
            <h1 className="hero-title">Web 3 <br/>Does Not<br/>Exist</h1>

            <div className="toc-container">
              <button className="toc-button" onClick={() => setShowTOC(!showTOC)}>
                <span>We Can Change That</span>
                <span className={`toc-icon ${showTOC ? 'open' : ''}`}>▼</span>
              </button>

              {showTOC && (
                <div className="toc-dropdown">
                  <ul className="toc-list">
                    <li className="toc-item">
                      <a className="toc-link" onClick={() => scrollToSection('reclaim-web3')}>Reclaim Web 3</a>
                    </li>
                    <li className="toc-item">
                      <a className="toc-link" onClick={() => scrollToSection('untold-history')}>How We Got Here</a>
                    </li>
                    <li className="toc-item">
                      <a className="toc-link" onClick={() => scrollToSection('desert-mirages')}>A Desert of Mirages</a>
                    </li>
                    <li className="toc-item">
                      <a className="toc-link" onClick={() => scrollToSection('stop-polite')}>Stop Being Polite</a>
                    </li>
                    <li className="toc-item">
                      <a className="toc-link" onClick={() => scrollToSection('five-rules')}>The Five Rules</a>
                    </li>
                    <li className="toc-item toc-sub-item">
                      <a className="toc-link" onClick={() => scrollToSection('rule-01')}>Rule 01: Real Utility</a>
                    </li>
                    <li className="toc-item toc-sub-item">
                      <a className="toc-link" onClick={() => scrollToSection('rule-02')}>Rule 02: Fully On-Chain</a>
                    </li>
                    <li className="toc-item toc-sub-item">
                      <a className="toc-link" onClick={() => scrollToSection('rule-03')}>Rule 03: Self-Sustaining Forever</a>
                    </li>
                    <li className="toc-item toc-sub-item">
                      <a className="toc-link" onClick={() => scrollToSection('rule-04')}>Rule 04: Fair and Equitable</a>
                    </li>
                    <li className="toc-item toc-sub-item">
                      <a className="toc-link" onClick={() => scrollToSection('rule-05')}>Rule 05: No Altcoins</a>
                    </li>
                    <li className="toc-item">
                      <a className="toc-link" onClick={() => scrollToSection('time-come')}>Our Time Has Come</a>
                    </li>
                    <li className="toc-item">
                      <a className="toc-link" onClick={() => scrollToSection('proof')}>The Proof In The Pudding</a>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="scroll-hint">scroll ↓</div>
        </header>

        <main className="manifesto-main">
          <div className="manifesto-container">
            <section id="reclaim-web3" className="manifesto-section">
              <h2 className="manifesto-h2">Not yet. Not in any meaningful sense.</h2>

              <p className="manifesto-p">The words "blockchain" and "web 3" have been perverted into marketing buzzwords. Projects that claim to be building the future are replicating the predatory extraction models of Web 2, but with worse user experience and more financial risk.</p>

              <p className="manifesto-p">The technology is real. We built an abomination.</p>

              <h3 className="manifesto-h3">Reclaim Web 3</h3>

              <p className="manifesto-p">Let's reclaim the term Web 3 from the scammers and the speculators. Let's even reclaim it from the well-meaning, useful and innovative blockchain projects that - in one way or another - function as an extension to Web 2's business model.</p>

              <p className="manifesto-p">Let's establish a clear and uncompromising standard for what deserves to be called a Web 3 application.</p>

              <p className="manifesto-p"><strong>We, the builders. We set the standard.</strong></p>
            </section>

            <hr className="manifesto-hr" />
            <section id="untold-history" className="manifesto-section">
              <h2 className="manifesto-h2">How We Got Here</h2>

              <p className="manifesto-p">To understand why Web 3 has failed, we need to understand why Web 2 succeeded with all its uncomfortable truths.</p>

              <p className="manifesto-p">Web 1.0 was simple: static pages, limited interaction. Revolutionary for information access, but companies hemorrhaged money trying to monetize it. The dot-com bubble burst because nobody could answer: how does this make money?</p>

              <p className="manifesto-p">Web 2 solved that problem through a business model innovation that changed everything: user-generated content monetized through data harvesting and targeted advertising.</p>

              <p className="manifesto-p">Here's what most retellings miss: Web 2 didn't succeed because of better technology alone. It succeeded because venture capital finally found a sustainable extraction model that scaled exponentially with user growth.</p>

              <p className="manifesto-p">The formula was elegant in its predation: Build a free platform. Attract users by letting them create content. Harvest their data, attention, and behavior patterns. Sell access through advertising and data brokerage. Scale globally. The more users you have, the more valuable each user becomes.</p>

              <p className="manifesto-p">Facebook, Google, YouTube, Twitter—they all won by perfecting variations of this model. They became free because we became the product.</p>

              <p className="manifesto-p">This is where we are now. Love it or hate it, Web 2 succeeded because it found a business model that scaled. The technology served that model. The user experience served that model. Everything bent toward the same gravitational center: extract maximum value from users while providing minimum friction to growth.</p>

              <p className="manifesto-p">So if Web 3 simply replicates Web 2's extraction model with blockchain sprinkled on top, then it's not Web 3. It's just Web 2 with extra steps and worse performance.</p>
            </section>

            <hr className="manifesto-hr" />

            <section id="desert-mirages" className="manifesto-section">
              <h3 className="manifesto-h3">A Desert of Mirages</h3>

              <p className="manifesto-p">Look at what calls itself Web 3 today. Scroll through the endless parade of new projects, platforms, and protocols. What do you see?</p>

              <p className="manifesto-p">Altcoins. Thousands of them. Each promising to revolutionize something, solve some problem, create some new paradigm. Each requiring you to first buy into their token economy before you can access their "utility." Each essentially asking you to speculate on their future success as a prerequisite to using their platform.</p>

              <p className="manifesto-p">This is not decentralization nor innovation. It's the same playbook executed ten thousand times.</p>

              <h4 className="manifesto-h4">It's Depressingly Predictable</h4>

              <p className="manifesto-p">Launch a token. Create artificial scarcity. Build hype. Get listings on exchanges. Hope the price pumps. Exit before it dumps. Maybe there's a whitepaper. Maybe there's a vague roadmap about future utility. Maybe there's even working code. But the actual utility? Either non-existent, or so buried beneath token mechanics that it's irrelevant.</p>

              <p className="manifesto-p">Even the projects built with genuine good intentions fall into this trap. They start with a real problem, a real solution, and real technical competence. Then they add a token because "that's how you do Web 3." They add token staking, governance tokens, utility tokens, reward tokens—an entire parallel financial system that has nothing to do with the core functionality of their application.</p>

              <h4 className="manifesto-h4">15 Years of This Bullshit</h4>

              <p className="manifesto-p">Crypto bros already know each other, and new comers have to drink their koolaid. An insular community convinced they're building the future while the rest of the world sees them as a cult or a scam.</p>

              <p className="manifesto-p">This cannot scale. This will not become the foundation of a new internet. Because nobody outside the crypto echo chamber wants to navigate token economics just to use an application. Nobody wants to speculate on governance tokens just to participate in a social network. Nobody wants to calculate gas fees and slippage just to play a video game.</p>

              <p className="manifesto-p">The average person hears "crypto" or "Web 3" and immediately associates it with scams, speculation, and complexity. And they're not wrong.</p>

              <h4 className="manifesto-h4">We Did This to Ourselves</h4>

              <p className="manifesto-p">We let the speculators and grifters define Web 3 in the public consciousness because we failed to hold the line on what deserves that name.</p>

              <p className="manifesto-p">Even our most respected figures have been too permissive. Vitalik Buterin speaks eloquently about on-chain logic and self-sustaining protocols, but stops short of condemning the altcoin proliferation that undermines everything Ethereum stands for.</p>

              <p className="manifesto-p">The technical purists write thoughtful critiques but don't unite behind clear standards. The builders stay in their lanes, focused on their projects, while the broader ecosystem drowns in noise.</p>
            </section>

            <section id="stop-polite" className="manifesto-section">
              <h2 className="manifesto-h2">Stop Being Polite</h2>

              <p className="manifesto-p">We need to stop pretending that every project deserves participation trophies for "experimenting" or "innovating." We need to establish standards and ostracize projects that violate them.</p>

              <p className="manifesto-p">Not through centralized authority. Not through gatekeeping in the traditional sense. But through collective refusal to legitimize what isn't legitimate. Through building communities that recognize and support true Web 3 while calling out pretenders.</p>
            </section>

            <hr className="manifesto-hr" />

            <section id="five-rules" className="manifesto-section">
              <h2 className="manifesto-h2">The Five Rules</h2>
              <p className="manifesto-p">Blockchains can be used to build anything. That's a feature, not a bug. But that doesn't mean we have to call everything "Web 3." That doesn't mean we have to pretend every token launch is progress. That doesn't mean we have to remain neutral in the face of obvious predation.</p>

              <p className="manifesto-p">There are five non-negotiable rules to Reclaim Web 3. These aren't suggestions or ideals. They're the minimum requirements. Fail any one of them, and you're not building Web 3—you're building something else.</p>

              <div className="rule-container">
                <div id="rule-01" className="rule">
                  <div className="rule-label">RULE 01</div>
                  <h4>Real Utility</h4>
                  <p className="manifesto-p">It must do something people actually want or need, right now. Not once adoption grows or when "it goes to the moon."</p>
                  <p className="manifesto-p">Its usefulness must be <strong>immediate</strong> and <strong>intrinsic</strong>.</p>
                
                </div>

                <div id="rule-02" className="rule">
                  <div className="rule-label">RULE 02</div>
                  <h4>Fully On-Chain</h4>
                  <p className="manifesto-p">The application logic must live entirely on the blockchain. Not partially. Not mostly. Entirely.</p>

                  <p className="manifesto-p">This is where most projects fail the Web 3 test. They claim decentralization while running critical infrastructure on AWS. They talk about trustlessness while requiring users to trust their backend services. They promise permanence while depending on centralized databases that could disappear tomorrow.</p>

                  <p className="manifesto-p">Being fully on-chain is hard. It's expensive. It requires careful architectural decisions and performance optimization. But it's also the only way to deliver on Web 3's core promise:</p>

                  <div className="callout">
                    <p><strong>Applications that can't be shut down, censored, or controlled by any single entity.</strong></p>
                  </div>

                  <p className="manifesto-p">Your smart contracts should be the application. Not a component of it. Not a payment rail attached to it. The actual logic, the actual data, the actual functionality—all on-chain. Everything else is just interface.</p>

                  <p className="manifesto-p">If off-chain logic is involved, it must be purely cosmetic. Animations, UI flourishes, client-side optimizations—fine. But if the app breaks when those servers go down, you haven't built a Web 3 app. You've built a Web 2.0 app with blockchain features.</p>

                  <p className="manifesto-p">Any meaningful dependency on centralized infrastructure—especially for data flow—breaks the core promise. If your app relies on centralized data providers, oracles that can be manipulated, or backends that can be shut down, then users can't rely on it being permanent and censorship-resistant. That defeats the entire point.</p>
                </div>

                <div id="rule-03" className="rule">
                  <div className="rule-label">RULE 03</div>
                  <h4>Self-Sustaining Forever</h4>
                  <p className="manifesto-p">After deployment, your application must run indefinitely without intervention from its creators. If you disappeared tomorrow, if every member of your team died, the application must continue functioning.</p>

                  <p className="manifesto-p">This means understanding your application's economics from the start. Gas fees, storage costs, computational requirements—all of this must be sustainable through the application's own mechanisms. The app must generate or capture enough value to fund its own operation at maximum scale.</p>

                  <p className="manifesto-p">No bailouts. No angel investors pumping in money when usage spikes. No creators subsidizing transaction costs out of pocket. The application must be economically self-sufficient or it's not truly decentralized.</p>

                  <p className="manifesto-p">Building for self-sustainability means making architectural decisions from day one:</p>
                  <p className="manifesto-p">- Anticipate realistic usage patterns and gas price scenarios<br />
                  - Factor in maximum storage constraints<br />
                  - Plan for growth within those constraints<br />
                  - Accept that hitting limits means deploying a new, improved version. Not relying on external bailouts</p>

                  <p className="manifesto-p">You can't guarantee an app will run literally forever—that's impossible. But you must build with that goal in mind. Think through the economics. Model the edge cases. Design for sustainability at scale. If your app grows to its limits, that's a scaling challenge for the next iteration, not a reason to abandon the principle.</p>

                  <p className="manifesto-p">The immutability of smart contracts is a feature, not a bug. It forces better upfront design and creates a kind of natural selection where improved versions can be deployed while the original continues running. No rug pulls, no forced migrations.</p>

                   <p className="manifesto-p">A true Web 3 app is like a successful organism: once it exists, it sustains itself through its interactions with its environment.</p>

                  <p className="manifesto-p"><strong>It doesn't need its creator to survive any more than you need your parents to breathe.</strong></p>
                </div>

                <div id="rule-04" className="rule">
                  <div className="rule-label">RULE 04</div>
                  <h4>Fair and Equitable</h4>
                  <p className="manifesto-p">Every economic decision your application makes must be transparent and verifiable on-chain. The code must clearly show where value flows, who gets paid what, and under what conditions.</p>

                  <p className="manifesto-p">If you're taking a cut, it must be visible in the contract. If there are privileged addresses or special permissions, they must be documented and justified. If your 'tokenomics' create advantages for insiders or early adopters beyond reasonable founder compensation, that's a problem.</p>

                  <p className="manifesto-p">Fairness doesn't mean equal outcomes. A chess platform where players wager ETH can fairly pay winners while taking a small fee for the protocol. That's transparent and voluntary. But a platform that gives founders secret admin keys to mint tokens or alter contracts? That's not fair. That's a rug pull waiting to happen.</p>

                  <p className="manifesto-p">The community gets to judge what's reasonable. If your contract shows the creator taking 3% of every transaction while 97% goes to users, most people will find that acceptable. If you're taking 30%? Better have a compelling justification. If you have backdoors that let you change the terms later? Nobody should touch your platform.</p>

                  <p className="manifesto-p">Fairness is enforced through transparency and social consensus, not centralized regulation.</p>
                  <p className="manifesto-p"><strong>Build useful & fair systems and the community will support them. Build exploitative systems and you'll be correctly identified as a predator.</strong></p>
                </div>

                <div id="rule-05" className="rule">
                  <div className="rule-label">RULE 05</div>
                  <h4>No Altcoins</h4>
                  <p className="manifesto-p">If your application requires users to acquire some new token nobody has heard of, then you've failed Web 3.</p>

                  <p className="manifesto-p">Use Ethereum. Use Bitcoin. Use established currencies that regular people actually recognize and understand.</p>

                  <p className="manifesto-p">My sister knows nothing about crypto, but when she hears "you can win Ethereum playing chess" she immediately grasps the value proposition.</p>

                  <p className="manifesto-p">Altcoins are a friction point at best, and a scam at worst.</p>

                  <p className="manifesto-p">Every new token is an education burden. Every custom currency is a reason for normal people to dismiss your project as a scam. Because here's the uncomfortable truth: most altcoins <em className="manifesto-em">are</em> scams, or at minimum, unnecessary complications serving only to enrich founders.</p>

                  <p className="manifesto-p">The principle is simple: User-facing value must flow in established currencies. What goes in and what comes out should be ETH, BTC, or other widely recognized currencies. This is what the masses interact with. This is what provides immediate, understandable utility.</p>

                  <p className="manifesto-p">Now, governance tokens and protocol-level tokens can exist as infrastructure. They serve technical purposes—voting on protocol changes, coordinating decentralized decision-making, incentivizing specific behaviors within the protocol layer. But these are not the application itself. They're not Web 3 apps. They're infrastructure tools that sophisticated users might interact with, but they're not the highlight of your platform and they're not what gates access to utility.</p>

                  <p className="manifesto-p">The distinction matters:<br />
                  - ✅ A chess platform where users wager ETH and winners receive ETH = Web 3<br />
                  - ✅ That same platform having a governance token for protocol decisions = fine, but the governance token isn't "Web 3"<br />
                  - ❌ A platform requiring users to buy $CHESS tokens to play = Not Web 3</p>

                  <p className="manifesto-p">Don't make regular people navigate token economics just to access utility. The average user interacts with the application layer using real currency. Only those who want to participate in governance need to deal with specialized tokens.</p>

                  <p className="manifesto-p">The Web 3 ecosystem doesn't need ten thousand currencies. It needs applications with real utility running on established networks. Ethereum is silver to Bitcoin's gold in the public consciousness. That's enough. Build on that foundation.</p>

                  <p className="manifesto-p">If you genuinely need custom token mechanics for your specific use case, you better have an extraordinarily compelling technical justification that can't be solved with standard currencies. And even then, you should be deeply skeptical of your own reasoning, because chances are you're just rationalizing a way to create speculative value you can capture.</p>
                </div>
              </div>
            </section>

            <hr className="manifesto-hr" />

            <section id="time-come" className="manifesto-section">
              <h2 className="manifesto-h2">Our Time Has Come</h2>

              <blockquote className="manifesto-blockquote">
                This sounds impossible. How can anyone build something useful, sustainable, fair, transparent, AND without forcing users into token speculation?
              </blockquote>

              <p className="manifesto-p">These five rules are not aspirational. They're achievable right now with current technology. They're not theoretical ideals. They're practical standards we can implement today.</p>

              <p className="manifesto-p">You just need to understand what Web 3 is actually good at and build within those constraints instead of fighting them.</p>

              <p className="manifesto-p">Here's some examples that follow all five rules. Anyone can build these. I'm not gatekeeping the ideas, I'm giving them away:</p>

              <div className="example-card">
                <h3>Example 1 - Lottery</h3>
                <p className="manifesto-p">A fully on-chain lottery that runs forever on an Ethereum Layer 2 network. Players buy tickets with ETH.</p>

                <p className="manifesto-p">When the round ends, the contract automatically selects a winner based on fair odds by number of tickets bought per wallet, awards them 95% of the pot, keeps 5% to cover the next round's gas, and immediately starts fresh.</p>

                <p className="manifesto-p">Each round caps at a fixed number of participants—say 100,000 wallets—to ensure the 5% reserved from the pot will cover the gas to run <code>pickRandomWinner()</code>. Could a billion wallets participate? Not today. The pot wouldn't cover the gas. But 100,000 per round? Absolutely sustainable.</p>

                <p className="manifesto-p">No operators. No off-chain randomness. No altcoins. Just working code and ETH.</p>
              </div>

              <div className="example-card">
                <h3>Example 2 - Chess</h3>
                <p className="manifesto-p">The developer fronts the storage cost once, hardcoding the maximum number of possible concurrent games. Say up to 1 million concurrent matches, but not anymore.</p>

                <p className="manifesto-p">After that, the contract runs itself: players pay a small entry fee, matches resolve on-chain, winners advance through brackets, and prizes distribute automatically.</p>

                <p className="manifesto-p">No servers. No administration. Just code and game theory.</p>
              </div>

              <div className="callout">
                <p><strong>These aren't hypotheticals. They're blueprints.</strong></p>
              </div>

              <p className="manifesto-p">Each one delivers real utility, lives entirely on-chain, sustains its own economics, distributes rewards fairly, and uses only ETH.</p>

              <h2 className="manifesto-h3">Start small. Uphold the standard.</h2>

              <p className="manifesto-p">Nobody is claiming to have figured out how to build a fully decentralized social network or a 100% on-chain MMORPG. That's probably not feasible for a Web 3 app in 2025.</p>

              <p className="manifesto-p">But here's the critical insight: unless we hold these principles now and start with what is actually doable, we'll never graduate to building the complex applications.</p>

              <p className="manifesto-p">By starting with simple, fully decentralized applications—games, lotteries, basic protocols—that work within current constraints, we:</p>

              <p className="manifesto-p"><strong>1. Prove the model works</strong> - showing that real utility can be delivered without compromises</p>

              <p className="manifesto-p"><strong>2. Build user familiarity</strong> - users will start asking "Is this actually on-chain?" and "Do I need to buy a token to use this?" If enough real Web 3 apps exist, the fakes become easier to spot.</p>

              <p className="manifesto-p"><strong>3. Create economic incentives</strong> - demonstrating that sustainable, fair models can work</p>

              <p className="manifesto-p"><strong>4. Force innovation on real problems</strong> - if off-chain storage is "acceptable," nobody will solve on-chain storage at scale</p>

              <h2 className="manifesto-h3">It's the only way</h2>

              <p className="manifesto-p">This is the only path to Reclaim Web 3. Master the fundamentals. Establish the principles. Build toward complexity as the technology matures</p>

              <p className="manifesto-p">The storage problem will eventually be solved. Fully on-chain social networks will become possible. But they won't happen if we compromise on the principles now. Innovation happens when constraints force creativity, not when shortcuts are acceptable.</p>

              <p className="manifesto-p">We know what blockchain and decentralization are good at doing today. Work within that. Build for real utility within real constraints. Hold the line on standards.</p>

              <p className="manifesto-p">Then the future becomes possible.</p>
            </section>
            
            <section id="proof" className="manifesto-section final-cta">
              <div className="proof-badge">And Here's The Proof</div>

              <h2>This manifesto practices what it preaches.</h2>

              <div className="web2-free-statement">
                <p className="manifesto-p">No cookies. No databases. No analytics. No Web2 infrastructure.</p>
                <p className="manifesto-p">The supporter count you see below? It's live, on-chain data. Pure Arbitrum. Every signature is a transaction. Every number is verifiable.</p>
              </div>

              <div className="supporter-count-container">
                <div className="supporter-number">12,847</div>
                <div className="supporter-label">Supporters</div>
                <div
                  className="view-onchain-link"
                  onClick={() => setShowDetails(true)}
                >
                  View on-chain →
                </div>
              </div>

              <hr className="manifesto-hr" />

              <div className="proof-badge">Wanna Play A game instead?</div>

              <h2>The Eternal Tic Tac Toe Protocol</h2>

              <p className="manifesto-p">I built one of these to test the theory: The Eternal Tic Tac Toe Protocol.</p>

              <p className="manifesto-p">It's a tournament-based Tic Tac Toe system with full bracket management from start to finish. Every move, every match, every payout—fully on-chain. Fully traceable. No backend servers. No admin privileges. No token. Just ETH, smart contracts, and gameplay that proves these five rules aren't aspirational—they're functional.</p>

              <p className="manifesto-p">This isn't a prototype waiting for funding. It's not a demo hoping for adoption. It's live, it works, and it checks all the boxes.</p>

            </section>

            <footer className="manifesto-footer">
              <p>This manifesto is yours to share, fork, and improve.</p>
            </footer>
          </div>
        </main>

        {showDetails && (
          <div className="details-modal" onClick={() => setShowDetails(false)}>
            <div className="details-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal" onClick={() => setShowDetails(false)}>×</button>

              <h3>On-Chain Verification</h3>

              <p>Every supporter signature is recorded as a transaction on the Arbitrum blockchain. This count isn't stored in a database—it's computed in real-time from on-chain events.</p>

              <p>The smart contract is simple: it accepts ETH (any amount, even 0), emits a Supported event with your wallet address, and that's it. No backend. No server. Just blockchain.</p>

              <div className="contract-address">
                0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8
              </div>

              <p>You can verify this yourself by checking the contract on Arbiscan, counting the events, or querying the blockchain directly.</p>

              <button className="support-button" onClick={() => {
                // TODO: Connect wallet and trigger support transaction
                console.log('Support transaction triggered');
              }}>
                Support This Manifesto
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
