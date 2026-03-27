import { useState } from 'react';
import WhyArbitrum from './WhyArbitrum';

export default function V2GameLobbyIntro() {
  const [isWhyArbitrumExpanded, setIsWhyArbitrumExpanded] = useState(false);

  return (
    <div className="max-w-lg mx-auto mb-10">
      <WhyArbitrum
        variant="blue"
        isExpanded={isWhyArbitrumExpanded}
        onToggle={() => setIsWhyArbitrumExpanded(prev => !prev)}
      />
    </div>
  );
}
