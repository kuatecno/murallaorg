import React from 'react';

// Quick action button component
const QuickActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  href: string;
  color: string;
}> = ({ icon, label, href, color }) => {
  return (
    <a 
      href={href}
      className={`flex items-center p-3 rounded-lg transition-all hover:bg-opacity-10 ${color} hover:bg-neutral-100 dark:hover:bg-neutral-800`}
    >
      <div className="flex-shrink-0 mr-3">
        {icon}
      </div>
      <div className="flex-grow">
        <p className="text-sm font-medium text-neutral-900 dark:text-white">{label}</p>
      </div>
    </a>
  );
};

const QuickActionsSection: React.FC = () => {
  const quickActions = [
    {
      icon: (
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"></path>
        </svg>
      ),
      label: 'Create new task',
      href: '/projects/new',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: (
        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd"></path>
        </svg>
      ),
      label: 'New knowledge document',
      href: '/knowledge/new',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: (
        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
        </svg>
      ),
      label: 'Schedule event',
      href: '/events/new',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: (
        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"></path>
        </svg>
      ),
      label: 'Record sale',
      href: '/sales/new',
      color: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      icon: (
        <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
        </svg>
      ),
      label: 'Add team member',
      href: '/people/new',
      color: 'text-pink-600 dark:text-pink-400'
    },
    {
      icon: (
        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z"></path>
        </svg>
      ),
      label: 'Add inventory item',
      href: '/inventory/new',
      color: 'text-indigo-600 dark:text-indigo-400'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions Card */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">Quick Actions</h2>
        <div className="space-y-1">
          {quickActions.map((action, index) => (
            <QuickActionButton 
              key={index}
              icon={action.icon}
              label={action.label}
              href={action.href}
              color={action.color}
            />
          ))}
        </div>
      </div>

      {/* Reminders Card */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">Reminders</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              <span className="text-sm text-neutral-800 dark:text-neutral-200">Submit monthly tax report</span>
            </div>
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">Tomorrow</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              <span className="text-sm text-neutral-800 dark:text-neutral-200">Staff meeting</span>
            </div>
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Jul 31, 10:00 AM</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              <span className="text-sm text-neutral-800 dark:text-neutral-200">Equipment maintenance</span>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Aug 2</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline w-full text-center">
            Set new reminder
          </button>
        </div>
      </div>

      {/* Bank Balance Card - Based on the Spanish memory about Cuenta Bancaria Empresa */}
      <div className="card bg-gradient-to-br from-primary-50 to-white dark:from-primary-900 dark:to-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Bank Account</h2>
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            Connected
          </span>
        </div>
        <div className="mb-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Current Balance</p>
          <p className="text-2xl font-semibold text-neutral-900 dark:text-white">$24,500.00</p>
          <div className="flex items-center mt-1">
            <span className="text-xs text-green-600 dark:text-green-400 mr-2">↑ 3.2%</span>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">from last week</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-neutral-600 dark:text-neutral-400">Income</p>
            <p className="font-medium text-green-600 dark:text-green-400">+$18,245.00</p>
          </div>
          <div className="text-right">
            <p className="text-neutral-600 dark:text-neutral-400">Expenses</p>
            <p className="font-medium text-red-600 dark:text-red-400">-$9,320.00</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <a href="/finance/bank" className="text-sm text-primary-600 dark:text-primary-400 hover:underline block text-center">
            View transactions →
          </a>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsSection;
