/**
 * NotFound - 404 error page
 *
 * Displayed when user navigates to a route that doesn't exist.
 * Matches the purple neon theme of the games.
 */

import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0a0015 0%, #1a0030 50%, #0f0020 100%)',
      }}
    >
      <div className="text-center max-w-2xl">
        {/* Glowing 404 */}
        <div className="mb-8">
          <h1
            className="text-9xl font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, #ff0044 0%, #0077ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 80px rgba(255, 0, 68, 0.5)',
            }}
          >
            404
          </h1>
        </div>

        {/* Message */}
        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/30 mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            You wandered off the chain!
          </h2>
          <p className="text-purple-300 text-lg mb-2">
            Page not found
          </p>
          <p className="text-gray-400 text-sm">
            The page you're looking for doesn't exist in this tournament.
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50"
          >
            Return to Home
          </button>

          <button
            onClick={() => navigate(-1)}
            className="px-8 py-4 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 font-bold rounded-xl transition-all border border-purple-400/30"
          >
            Go Back
          </button>
        </div>

        {/* Decorative chain links */}
        <div className="mt-12 flex justify-center gap-4 opacity-20">
          <span className="text-6xl">⛓️</span>
          <span className="text-6xl">💔</span>
          <span className="text-6xl">⛓️</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
