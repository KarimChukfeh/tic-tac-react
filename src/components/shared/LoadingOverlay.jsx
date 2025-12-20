/**
 * LoadingOverlay - Shared component for processing spinner overlay
 *
 * Full-screen overlay shown while processing moves or actions.
 */

const LoadingOverlay = ({
  message = 'Processing move...'
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 text-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
