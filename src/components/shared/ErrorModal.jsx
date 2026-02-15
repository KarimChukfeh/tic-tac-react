import React from 'react';

const ErrorModal = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-red-700 to-red-900 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border-2 border-red-600/50">
        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-4">
          Enrollment Error
        </h2>

        {/* Message */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-5 mb-5">
          <p className="text-lg text-white text-center" dangerouslySetInnerHTML={{ __html: message }} />
        </div>

        {/* Button */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="bg-white hover:bg-red-50 text-red-900 font-semibold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
