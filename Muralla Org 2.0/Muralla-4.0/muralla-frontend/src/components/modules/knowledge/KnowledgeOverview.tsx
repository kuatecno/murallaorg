import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

const KnowledgeOverview: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Knowledge Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Organization's single source of truth - policies, playbooks, and institutional memory
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Total Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              127
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              8
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              This week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              3
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/knowledge/policies" className="p-6 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors">
              <div className="text-3xl mb-3">📋</div>
              <div className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-2">Policies & SOPs</div>
              <p className="text-sm text-indigo-600 dark:text-indigo-400">
                Company policies, procedures, and compliance documentation
              </p>
            </a>
            <a href="/knowledge/playbooks" className="p-6 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors">
              <div className="text-3xl mb-3">📖</div>
              <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Playbooks & Templates</div>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Reusable frameworks and templates for common scenarios
              </p>
            </a>
            <a href="/knowledge/wiki" className="p-6 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors">
              <div className="text-3xl mb-3">🧠</div>
              <div className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-2">Institutional Memory</div>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Wiki pages, lessons learned, and organizational knowledge
              </p>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">
                📋
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Updated "Remote Work Policy"
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  2 hours ago by Sarah Miller
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">
                📖
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Created "Project Kickoff Template"
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  1 day ago by John Doe
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm">
                🧠
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Added "API Integration Guide"
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  3 days ago by Robert Johnson
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeOverview;
