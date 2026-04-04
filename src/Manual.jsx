import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserManualV2 from './v2/components/UserManualV2.jsx';

const Manual = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-400 transition-colors hover:text-gray-200"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>

        <div id="user-manual">
          <UserManualV2 defaultExpanded collapsible={false} />
        </div>
      </div>
    </div>
  );
};

export default Manual;
