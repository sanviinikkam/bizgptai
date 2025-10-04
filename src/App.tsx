import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Upload,
  Bell,
  Database,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { ChatInterface } from './components/ChatInterface';
import { DataUpload } from './components/DataUpload';
import { AlertsPanel, AlertsBadge } from './components/Alerts';
import { DatasetSelector } from './components/DatasetSelector';

type View = 'dashboard' | 'chat' | 'upload' | 'alerts' | 'datasets';

const AppContent: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { alerts, currentDataset } = useData();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const navigationItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat' as View, label: 'AI Query', icon: MessageSquare },
    { id: 'upload' as View, label: 'Upload Data', icon: Upload },
    { id: 'datasets' as View, label: 'Datasets', icon: Database },
    { id: 'alerts' as View, label: 'Alerts', icon: Bell }
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'chat':
        return <ChatInterface />;
      case 'upload':
        return (
          <div className="space-y-6">
            <DataUpload />
            {currentDataset && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Current Dataset Preview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {currentDataset.columns.map((col) => (
                          <th key={col.name} className="text-left py-2 px-3 font-semibold text-gray-900">
                            {col.name}
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              ({col.type})
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentDataset.preview_data?.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          {currentDataset.columns.map((col) => (
                            <td key={col.name} className="py-2 px-3 text-gray-700">
                              {row[col.name] !== null && row[col.name] !== undefined
                                ? String(row[col.name])
                                : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      case 'alerts':
        return <AlertsPanel />;
      case 'datasets':
        return <DatasetSelector />;
      default:
        return <Dashboard />;
    }
  };

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Business Insights AI</h1>
            <p className="text-sm text-gray-500 mt-1">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const hasNotification = item.id === 'alerts' && unreadAlertsCount > 0;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {hasNotification && <AlertsBadge />}
                  </div>
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {navigationItems.find(item => item.id === currentView)?.label}
                </h2>
                {currentDataset && (
                  <p className="text-sm text-gray-500">
                    Active: {currentDataset.name}
                  </p>
                )}
              </div>
            </div>

            {unreadAlertsCount > 0 && (
              <button
                onClick={() => setCurrentView('alerts')}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Bell className="w-6 h-6" />
                <AlertsBadge />
              </button>
            )}
          </div>
        </header>

        <main className="p-4 lg:p-8">
          {renderView()}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
