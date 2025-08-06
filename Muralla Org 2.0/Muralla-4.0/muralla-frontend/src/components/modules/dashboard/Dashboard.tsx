import React from 'react';
import OverviewSection from './sections/OverviewSection';
import RecentActivitySection from './sections/RecentActivitySection';
import QuickActionsSection from './sections/QuickActionsSection';

const Dashboard: React.FC = () => {
  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-display font-semibold text-neutral-900 dark:text-white">Home Hub</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Welcome back! Here's what's happening in your organization.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overview Widgets - Top Section */}
        <div className="lg:col-span-12">
          <OverviewSection />
        </div>

        {/* Main Content Area - Two Column Layout */}
        <div className="lg:col-span-8">
          <RecentActivitySection />
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4">
          <QuickActionsSection />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
