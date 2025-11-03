export default function Web3Manifesto() {
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
      `}</style>

      <div className="manifesto-root">
        <header className="manifesto-header">
          <div className="manifesto-container">
            <div className="year-badge">2025</div>
            <h1 className="hero-title">Web 3.0 <br/>Does Not<br/>Exist</h1>
          </div>
          <div className="scroll-hint">scroll ↓</div>
        </header>

        <main className="manifesto-main">
          <div className="manifesto-container">
            <section className="manifesto-section">
              <h2 className="manifesto-h2">Not yet. Not in any meaningful sense..</h2>

              <p className="manifesto-p">The words "blockchain" and "web 3" have been perverted into a marketing buzzword where projects claim to be building the future while simply replicating the predatory extraction models of Web 2.0, <strong>but with worse user experience and more financial risk.</strong></p>

              <p className="manifesto-p">The technology is real. We built a lie.</p>

              <h3 className="manifesto-h3">Reclaim Web 3.0</h3>

              <p className="manifesto-p">Let's reclaim the term Web 3.0 from the scammers and the speculators. Let's even reclaim it from the well-meaning, useful and innovative blockchain projects that - in one way or another - function as an extension to Web 2.0's business model.</p>

              <p className="manifesto-p">Let's establish a clear and uncompromising standard for what deserves to be called a Web 3.0 application.</p>

              <h4 className="manifesto-h4">We make the rules</h4>

              <p className="manifesto-p">We, the builders, set the standard.</p>
            </section>

            <hr className="manifesto-hr" />
            <section className="manifesto-section">
              <h2 className="manifesto-h2">Untold History</h2>

              <p className="manifesto-p">To understand why Web 3.0 has failed, we need to understand why Web 2.0 succeeded with all its uncomfortable truths.</p>

              <p className="manifesto-p">Web 1.0 was simple. Static pages. Information published by those with technical knowledge, consumed by everyone else. It was revolutionary for access to information, but limited in interaction. The technology existed, but the business model didn't. Companies hemorrhaged money trying to figure out how to monetize eyeballs. The dot-com bubble burst because nobody could answer the fundamental question: how does this make money?</p>

              <p className="manifesto-p">Web 2.0 solved that problem. Not through better technology alone, but through a business model innovation that changed everything: user-generated content monetized through data harvesting and targeted advertising.</p>

              <p className="manifesto-p">Here's what most retellings miss: web 2.0 didn't succeed because of social networks, cloud computing, or dynamic web applications. Those were the vehicles. Web 2.0 succeeded because venture capital finally found a sustainable extraction model that scaled exponentially with user growth.</p>

              <p className="manifesto-p">The formula was elegant in its predation: Build a free platform. Attract users by letting them create and share content. Harvest their data, attention, and behavior patterns. Sell access to those users through advertising and data brokerage. Scale globally. The more users you have, the more valuable each user becomes, because network effects multiply engagement, which multiplies data, which multiplies revenue.</p>

              <p className="manifesto-p">Facebook, Google, YouTube, Twitter—they all won by perfecting variations of this model. They became free because we became the product. Our data, our attention, our social graphs, our behavioral patterns—all of it mined, packaged, and sold to the highest bidder.</p>

              <p className="manifesto-p">The talent emerged. Computer science graduates flooded into tech. Frameworks matured. Cloud infrastructure became commodity. Venture capital poured billions into companies that could demonstrate user growth, even without revenue, because they understood the endgame: monopolize attention, then monetize it.</p>

              <p className="manifesto-p">And it worked. Spectacularly. These companies are now among the most valuable in human history.</p>

              <p className="manifesto-p">This is where we are now. Love it or hate it, this is the reality of web 2.0. It succeeded because it found a business model that scaled. The technology served that model. The user experience served that model. Everything bent toward the same gravitational center: extract maximum value from users while providing minimum friction to growth.</p>
              
              <p className="manifesto-p">So if web 3 simply replicates web 2's extraction model with blockchain sprinkled on top, then it's not web 3. It's just web 2 with extra steps and worse performance.</p>
            </section>

            <hr className="manifesto-hr" />

            <section className="manifesto-section">
              <h3 className="manifesto-h3">A Desert of Mirages</h3>

              <p className="manifesto-p">Look at what calls itself web 3 today. Scroll through the endless parade of new projects, platforms, and protocols. What do you see?</p>

              <p className="manifesto-p">Altcoins. Thousands of them. Each promising to revolutionize something, solve some problem, create some new paradigm. Each requiring you to first buy into their token economy before you can access their "utility." Each essentially asking you to speculate on their future success as a prerequisite to using their platform.</p>

              <p className="manifesto-p">This is not decentralization nor innovation. It's the same playbook executed ten thousand times.</p>

              <h4 className="manifesto-h4">It's Depressingly Predictable</h4>

              <p className="manifesto-p">Launch a token. Create artificial scarcity. Build hype. Get listings on exchanges. Hope the price pumps. Exit before it dumps. Maybe there's a whitepaper. Maybe there's a vague roadmap about future utility. Maybe there's even working code. But the actual utility? Either non-existent, or so buried beneath token mechanics that it's irrelevant.</p>

              <p className="manifesto-p">Even the projects built with genuine good intentions fall into this trap. They start with a real problem, a real solution, and real technical competence. Then they add a token because "that's how you do web 3." They add token staking, governance tokens, utility tokens, reward tokens—an entire parallel financial system that has nothing to do with the core functionality of their application.</p>

              <p className="manifesto-p"><strong>15 years of this bullshit</strong></p>

              <p className="manifesto-p">Crypto bros already know each other, and new comers have to drink their koolaid. An insular community convinced they're building the future while the rest of the world sees them as a cult or a scam.</p>

              <p className="manifesto-p">This cannot scale. This will not become the foundation of a new internet. Because nobody outside the crypto echo chamber wants to navigate token economics just to use an application. Nobody wants to speculate on governance tokens just to participate in a social network. Nobody wants to calculate gas fees and slippage just to play a video game.</p>

              <p className="manifesto-p">The average person hears "crypto" or "web 3" and immediately associates it with scams, speculation, and complexity. And they're not wrong.</p>

              <h4 className="manifesto-h4">We did this to ourselves</h4>

              <p className="manifesto-p">We let the speculators and grifters define web 3 in the public consciousness because we failed to hold the line on what deserves that name.</p>

              <p className="manifesto-p">Even our most respected figures have been too permissive. Vitalik Buterin speaks eloquently about on-chain logic and self-sustaining protocols, but stops short of condemning the altcoin proliferation that undermines everything Ethereum stands for.</p>

              <p className="manifesto-p">The technical purists write thoughtful critiques but don't unite behind clear standards. The builders stay in their lanes, focused on their projects, while the broader ecosystem drowns in noise.</p>
            </section>

            <section className="manifesto-section">
              <h2 className="manifesto-h2">Stop being polite</h2>

              <p className="manifesto-p">We need to stop pretending that every project deserves participation trophies for "experimenting" or "innovating." We need to establish standards and ostracize projects that violate them.</p>

              <p className="manifesto-p">Not through centralized authority. Not through gatekeeping in the traditional sense. But through collective refusal to legitimize what isn't legitimate. Through building communities that recognize and support true web 3 while calling out pretenders.</p>

              <div className="warning">
                <p>Blockchains can be used to build anything. That's a feature, not a bug. But that doesn't mean we have to call everything "web 3." That doesn't mean we have to pretend every token launch is progress. That doesn't mean we have to remain neutral in the face of obvious predation.</p>
              </div>
            </section>

            <hr className="manifesto-hr" />

            <section className="manifesto-section">
              <h2 className="manifesto-h2">The Five Rules</h2>
              <p className="manifesto-p">Here are the five non-negotiable rules that define a true Web 3.0 application. These aren't suggestions or ideals. They're the minimum requirements. Fail any one of them, and you're not building web 3—you're building something else.</p>

              <div className="rule-container">
                <div className="rule">
                  <div className="rule-label">Rule 01</div>
                  <h4>Real Utility</h4>
                  <p className="manifesto-p">It must do something people actually want or need, right now. Not once adoption grows or when "it goes to the moon".</p>
                  <p className="manifesto-p">Its usefulness must be <strong>immediate</strong> and <strong>intrinsic</strong>.</p>
                
                </div>

                <div className="rule">
                  <div className="rule-label">Rule 02</div>
                  <h4>Fully On-Chain</h4>
                  <p className="manifesto-p">The application logic must live entirely on the blockchain. Not partially. Not mostly. Entirely.</p>

                  <p className="manifesto-p">This is where most projects fail the web 3 test. They claim decentralization while running critical infrastructure on AWS. They talk about trustlessness while requiring users to trust their backend services. They promise permanence while depending on centralized databases that could disappear tomorrow.</p>

                  <p className="manifesto-p">Being fully on-chain is hard. It's expensive. It requires careful architectural decisions and performance optimization. But it's also the only way to deliver on Web 3's core promise:</p>

                  <div className="callout">
                    <p><strong>Applications that can't be shut down, censored, or controlled by any single entity.</strong></p>
                  </div>

                  <p className="manifesto-p">Your smart contracts should be the application. Not a component of it. Not a payment rail attached to it. The actual logic, the actual data, the actual functionality—all on-chain. Everything else is just interface.</p>

                  <p className="manifesto-p">If off-chain logic is involved, it must be purely cosmetic. Animations, UI flourishes, client-side optimizations, fine. But if the app breaks when those servers go down, you haven't built a web 3 app. You've built a web 2.0 app with blockchain features.</p>
                </div>

                <div className="rule">
                  <div className="rule-label">Rule 03</div>
                  <h4>Self-Sustaining Forever</h4>
                  <p className="manifesto-p">After deployment, your application must run indefinitely without intervention from its creators. If you disappeared tomorrow, if every member of your team died, the application must continue functioning.</p>

                  <p className="manifesto-p">This means understanding your application's economics from the start. Gas fees, storage costs, computational requirements—all of this must be sustainable through the application's own mechanisms. The app must generate or capture enough value to fund its own operation at maximum scale.</p>

                  <p className="manifesto-p">No bailouts. No angel investors pumping in money when usage spikes. No creators subsidizing transaction costs out of pocket. The application must be economically self-sufficient or it's not truly decentralized.</p>

                  <p className="manifesto-p">This isn't about eliminating creator rewards. Developers deserve fair compensation for building valuable tools. But that compensation must come through transparent mechanisms built into the protocol, not through ongoing dependency on the creator's continued involvement.</p>

                  <p className="manifesto-p">A true web 3 app is like a successful organism: once it exists, it sustains itself through its interactions with its environment. It doesn't need its creator to survive any more than you need your parents to breathe.</p>
                </div>

                <div className="rule">
                  <div className="rule-label">Rule 04</div>
                  <h4>Fair and Equitable</h4>
                  <p className="manifesto-p">Every economic decision your application makes must be transparent and verifiable on-chain. The code must clearly show where value flows, who gets paid what, and under what conditions.</p>

                  <p className="manifesto-p">If you're taking a cut, it must be visible in the contract. If there are privileged addresses or special permissions, they must be documented and justified. <strong>If your 'tokenomics' create advantages for insiders or early adopters beyond reasonable founder compensation, that's a problem.</strong></p>

                  <p className="manifesto-p">Fairness doesn't mean equal outcomes. A chess platform where players wager ETH can fairly pay winners while taking a small fee for the protocol. That's transparent and voluntary. But a platform that gives founders secret admin keys to mint tokens or alter contracts? That's not fair. That's a rug pull waiting to happen.</p>

                  <p className="manifesto-p">The community gets to judge what's reasonable. If your contract shows the creator taking 3% of every transaction while 97% goes to users, most people will find that acceptable. If you're taking 30%? Better have a compelling justification. If you have backdoors that let you change the terms later? Nobody should touch your platform.</p>

                  <p className="manifesto-p">Fairness is enforced through transparency and social consensus, not centralized regulation. Build fair systems and the community will support them. Build exploitative systems and you'll be correctly identified as a predator.</p>
                </div>

                <div className="rule">
                  <div className="rule-label">Rule 05</div>
                  <h4>No Altcoins</h4>
                  <p className="manifesto-p">If your application requires users to acquire some new token nobody has heard of, <strong>you've already failed web 3.</strong></p>

                  <p className="manifesto-p">Use Ethereum. Use Bitcoin. Use established currencies that regular people actually recognize and understand.</p>

                  <p className="manifesto-p">My sister knows nothing about crypto, but when she hears "you can win Ethereum playing chess" then she immediately grasps the value proposition. That's when you've achieved mainstream clarity.</p>

                  <p className="manifesto-p">Altcoins are a friction point at best, and a scam at worst.</p>

                  <p className="manifesto-p">Every new token is an education burden. Every custom currency is a reason for normal people to dismiss your project as a scam. Because here's the uncomfortable truth: most altcoins <em className="manifesto-em">are</em> scams, or at minimum, unnecessary complications serving only to enrich founders.</p>

                  <p className="manifesto-p">The Web 3 ecosystem doesn't need ten thousand currencies. It needs applications with real utility running on established networks. Ethereum is silver to Bitcoin's gold in the public consciousness. That's enough. Build on that foundation.</p>

                  <p className="manifesto-p">If you genuinely need custom token mechanics for your specific use case, you better have an extraordinarily compelling technical justification that can't be solved with standard currencies. And even then, you should be deeply skeptical of your own reasoning, because chances are you're just rationalizing a way to create speculative value you can capture.</p>
                </div>
              </div>
            </section>

            <hr className="manifesto-hr" />

            <section className="manifesto-section">
              <h2 className="manifesto-h2">We Got This</h2>

              <blockquote className="manifesto-blockquote">
                This sounds impossible. How can anyone build something useful, sustainable, fair, transparent, AND without a custom token?
              </blockquote>

              <p className="manifesto-p">These five rules are not aspirational. They're achievable right now with current technology. They're not theoretical ideals. They're practical standards we can implement today.</p>

              <p className="manifesto-p">You just need to understand what Web3 is actually good at and build within those constraints instead of fighting them.</p>

              <p className="manifesto-p">Here's some examples that follow all five rules. Anyone can build these. I'm not gatekeeping the ideas, I'm giving them away:</p>

              <div className="example-card">
                <h3>Example 1 - Lottery</h3>
                <p className="manifesto-p">A fully on-chain lottery that runs forever on an Ethereum Layer 2 network. Players buy tickets with ETH.</p>

                <p className="manifesto-p">When a round ends, the contract automatically selects a winner based on fair odds by number of tickets bought per wallet, then selects a random winner and gives them 95% of the ETH. The remaining 5% is kept for sustainability to cover gas costs for the next round, and immediately starts a new round.</p>

                <p className="manifesto-p">Each lottery round would have a fixed number of max participants, and the round automatically ends if that number is reached to ensure that the 5% of the pot covers the network fee to run the <code>pickRandomWinner</code>. I.e a billion wallets in a raffle would be impossible today, because the pot itself is probably not enough to cover the gas to run contract logic at that point. But 100,000 players per round? Absolutely doable.</p>

                <p className="manifesto-p">No operators. No off-chain randomness. No custom token. Pure utility, pure transparency.</p>
              </div>

              <div className="example-card">
                <h3>Example 2 - Chess</h3>
                <p className="manifesto-p">The developer fronts the storage cost once, hardcoding the maximum number of possible concurrent games. Say up to 10 million concurrent matches, but not anymore.</p>

                <p className="manifesto-p">After that, the contract runs itself: players pay a small entry fee, matches resolve on-chain, winners advance through brackets, and prizes distribute automatically.</p>

                <p className="manifesto-p">No servers. No administration. Just code and game theory.</p>
              </div>

              <div className="callout">
                <p><strong>These aren't hypotheticals. They're blueprints.</strong></p>
              </div>

              <p className="manifesto-p">Each one delivers real utility, lives entirely on-chain, sustains its own economics, distributes rewards fairly, and uses only ETH.</p>
            </section>

            <section className="manifesto-section final-cta">
              <div className="proof-badge">And Here's the Proof</div>

              <h2>The Eternal Tic Tac Toe Protocol</h2>

              <p className="manifesto-p">I built one of these to test the theory: The Eternal Tic Tac Toe Protocol.</p>

              <p className="manifesto-p">It's a tournament-based Tic Tac Toe system with full bracket management from start to finish. Every move, every match, every payout—fully on-chain. Fully traceable. No backend servers. No admin privileges. No token. Just ETH, smart contracts, and gameplay that proves these five rules aren't aspirational—they're functional.</p>

              <p className="manifesto-p">This isn't a prototype waiting for funding. It's not a demo hoping for adoption. It's live, it works, and it checks all the boxes.</p>

              <p className="manifesto-p">The tools exist. The infrastructure is ready.</p>
              <p className="manifesto-p">We just need to build.</p>
            </section>

            <footer className="manifesto-footer">
              <p>This manifesto is yours to share, fork, and improve.<br />
              The only thing we ask is that you hold the line.</p>
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}
