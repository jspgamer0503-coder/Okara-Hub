import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './lib/AppContext';
import { isElectron } from './lib/utils';
import TitleBar from './components/TitleBar';
import TabBar from './components/TabBar';
import Sidebar from './components/Sidebar';
import HubPage from './pages/HubPage';
import RouterPage from './pages/RouterPage';
import SettingsPage from './pages/SettingsPage';
import HistoryPage from './pages/HistoryPage';
import LogsPage from './pages/LogsPage';
import TranslatorPage from './pages/TranslatorPage';
import UpdateBanner from './components/UpdateBanner';

function AppInner() {
  const { models, openTabs, activeTabId, switchTab, closeTab, ready } = useApp();
  const [page, setPage] = useState('hub');
  const activeModel = models.find(m => m.id === activeTabId);

  const handleSelectTab = async (id) => {
    await switchTab(id);
    if (id !== null) setPage('hub');
  };

  useEffect(() => {
    if (isElectron) window.electronAPI.setSidebarWidth(280);
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    if (page !== 'hub') {
      window.electronAPI.hideBrowser();
    } else if (activeTabId) {
      window.electronAPI.openBrowser(activeTabId);
    }
  }, [page, activeTabId]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-nd-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-nd-accent flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <p className="text-nd-muted text-sm">Loading Neural Dock...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'hub': return <HubPage />;
      case 'router': return <RouterPage onNavigate={setPage} />;
      case 'settings': return <SettingsPage />;
      case 'history': return <HistoryPage onNavigate={setPage} />;
      case 'logs': return <LogsPage />;
      case 'translator': return <TranslatorPage onNavigate={setPage} />;
      default: return <HubPage />;
    }
  };

  const showContent = page !== 'hub' || activeTabId === null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-nd-bg">
      <TitleBar activeModel={activeModel} />
      {openTabs.length > 0 && (
        <TabBar tabs={openTabs} activeTabId={activeTabId} onSelect={handleSelectTab} onClose={closeTab} />
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={page} onNavigate={setPage} />
        {showContent ? (
          <div className="flex-1 overflow-hidden flex flex-col">{renderPage()}</div>
        ) : (
          <div className="flex-1 bg-nd-bg" />
        )}
      </div>
      <UpdateBanner />
    </div>
  );
}

export default function App() {
  return <AppProvider><AppInner /></AppProvider>;
}
