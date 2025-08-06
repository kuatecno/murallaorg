import React from 'react';

// Mock data for recent activities
const activities = [
  {
    id: 1,
    type: 'task',
    action: 'completed',
    title: 'Monthly inventory audit',
    user: {
      name: 'Ana Martinez',
      avatar: 'AM'
    },
    timestamp: '2 hours ago',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
      </svg>
    ),
    iconBg: 'bg-green-100 dark:bg-green-900',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  {
    id: 2,
    type: 'finance',
    action: 'added',
    title: 'New payment received from Café Workshops',
    amount: '$1,250.00',
    user: {
      name: 'System',
      avatar: 'SY'
    },
    timestamp: '4 hours ago',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
      </svg>
    ),
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 3,
    type: 'inventory',
    action: 'updated',
    title: 'Coffee beans stock level',
    details: 'Ordered 25kg of medium roast beans',
    user: {
      name: 'Roberto Kang',
      avatar: 'RK'
    },
    timestamp: 'Yesterday at 3:45 PM',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd"></path>
      </svg>
    ),
    iconBg: 'bg-yellow-100 dark:bg-yellow-900',
    iconColor: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    id: 4,
    type: 'event',
    action: 'created',
    title: 'New event: Local Artists Exhibition',
    details: 'Scheduled for August 15-20',
    user: {
      name: 'Juan Diaz',
      avatar: 'JD'
    },
    timestamp: 'Yesterday at 11:30 AM',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
      </svg>
    ),
    iconBg: 'bg-purple-100 dark:bg-purple-900',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
  {
    id: 5,
    type: 'knowledge',
    action: 'updated',
    title: 'Barista Training Manual',
    details: 'Added new section on specialty coffee preparation',
    user: {
      name: 'Teresa Sanchez',
      avatar: 'TS'
    },
    timestamp: '2 days ago',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"></path>
      </svg>
    ),
    iconBg: 'bg-pink-100 dark:bg-pink-900',
    iconColor: 'text-pink-600 dark:text-pink-400'
  },
  {
    id: 6,
    type: 'people',
    action: 'added',
    title: 'New team member',
    details: 'Maria Lopez joined as Assistant Manager',
    user: {
      name: 'System',
      avatar: 'SY'
    },
    timestamp: '3 days ago',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
      </svg>
    ),
    iconBg: 'bg-indigo-100 dark:bg-indigo-900',
    iconColor: 'text-indigo-600 dark:text-indigo-400'
  }
];

const ActivityItem: React.FC<{activity: any}> = ({ activity }) => {
  return (
    <div className="flex items-start space-x-4 py-4 first:pt-0 last:pb-0 border-b border-neutral-200 dark:border-neutral-700 last:border-0">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${activity.iconBg} ${activity.iconColor} flex items-center justify-center`}>
        {activity.icon}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
            {activity.title}
          </p>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap ml-2">
            {activity.timestamp}
          </span>
        </div>
        {activity.details && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {activity.details}
          </p>
        )}
        {activity.amount && (
          <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">
            {activity.amount}
          </p>
        )}
        <div className="flex items-center mt-2">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300 flex items-center justify-center text-xs">
              {activity.user.avatar}
            </div>
          </div>
          <p className="ml-2 text-xs text-neutral-600 dark:text-neutral-400">
            {activity.user.name}
          </p>
        </div>
      </div>
    </div>
  );
};

const RecentActivitySection: React.FC = () => {
  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Activity</h2>
        <div className="flex items-center space-x-2">
          <button className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            All
          </button>
          <span className="text-neutral-300 dark:text-neutral-700">|</span>
          <button className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Tasks
          </button>
          <span className="text-neutral-300 dark:text-neutral-700">|</span>
          <button className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Finance
          </button>
        </div>
      </div>
      
      <div className="space-y-0 divide-y divide-neutral-200 dark:divide-neutral-700">
        {activities.map(activity => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 text-center">
        <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
          View all activity →
        </button>
      </div>
    </div>
  );
};

export default RecentActivitySection;
