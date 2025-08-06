import React from 'react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description, icon = "🚧" }) => {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">{icon}</div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          {description}
        </p>
        <div className="mt-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
