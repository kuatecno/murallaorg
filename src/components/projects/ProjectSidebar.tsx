'use client';

import { useState, useEffect } from 'react';
import { Plus, FolderKanban, ChevronRight, MoreVertical, Edit2, Trash2, Archive } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  status: string;
  taskCount: number;
  completedTaskCount: number;
  progress: number;
}

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

export default function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onEditProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? All tasks in this project will also be deleted.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete project');

      toast.success('Project deleted successfully');

      if (selectedProjectId === projectId) {
        onSelectProject(null);
      }

      onDeleteProject(projectId);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const activeProjects = projects.filter(p => p.status === 'ACTIVE');
  const archivedProjects = projects.filter(p => p.status === 'ARCHIVED');



  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
          <button
            onClick={onCreateProject}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Create new project"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* All Projects */}
        <button
          onClick={() => onSelectProject(null)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${selectedProjectId === null
            ? 'bg-blue-50 text-blue-700'
            : 'hover:bg-gray-50 text-gray-700'
            }`}
        >
          <FolderKanban className="w-5 h-5" />
          <span className="font-medium">All Projects</span>
        </button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeProjects.length === 0 && archivedProjects.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            <FolderKanban className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No projects yet</p>
            <button
              onClick={onCreateProject}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Projects */}
            {activeProjects.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Active
                </h3>
                <div className="space-y-1">
                  {activeProjects.map((project) => (
                    <div
                      key={project.id}
                      className="relative group"
                    >
                      <button
                        onClick={() => onSelectProject(project.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${selectedProjectId === project.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50 text-gray-700'
                          }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium truncate">{project.name}</div>
                          <div className="text-xs text-gray-500">
                            {project.completedTaskCount} / {project.taskCount} tasks
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>

                      {/* Context Menu */}
                      <div className="absolute right-2 top-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === project.id ? null : project.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenu === project.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditProject(project);
                                  setActiveMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project.id, project.name);
                                  setActiveMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {project.taskCount > 0 && (
                        <div className="px-3 pb-2">
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="h-1 rounded-full transition-all"
                              style={{
                                width: `${project.progress}%`,
                                backgroundColor: project.color,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Archived Projects */}
            {archivedProjects.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                  <Archive className="w-3 h-3" />
                  Archived
                </h3>
                <div className="space-y-1">
                  {archivedProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => onSelectProject(project.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors opacity-60 ${selectedProjectId === project.id
                        ? 'bg-gray-100 text-gray-700'
                        : 'hover:bg-gray-50 text-gray-600'
                        }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium truncate text-sm">{project.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
