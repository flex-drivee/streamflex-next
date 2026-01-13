import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-white border-t-transparent"
        role="status"
        aria-label="loading"
      ></div>
    </div>
  );
};

export default Spinner;