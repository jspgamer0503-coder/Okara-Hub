import React from 'react';
import { X, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';

export default function TabBar({ tabs, activeTabId, onSelect, onClose }) {
  return (
    <div className="flex items-center bg-nd-bar border-b border-nd-border h-9 flex-shrink-0 overflow-x-auto">
      {/* Home tab */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'flex items-center gap-1.5 px-3 h-full text-xs flex-shrink-0 transition-all border-r border-nd-border',
          activeTabId === null
            ? 'bg-nd-panel text-white'
            : 'text-nd-muted hover:text-nd-text hover:bg-nd-row'
        )}
      >
        <LayoutGrid size={13} />
        <span>Hub</span>
      </button>

      {/* Model tabs */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={cn(
            'flex items-center gap-2 px-3 h-full text-xs cursor-pointer transition-all border-r border-nd-border group flex-shrink-0',
            activeTabId === tab.id
              ? 'bg-nd-panel text-white'
              : 'text-nd-muted hover:text-nd-text hover:bg-nd-row'
          )}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tab.color || '#7c3aed' }} />
          <span className="max-w-[100px] truncate">{tab.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
            className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all flex-shrink-0"
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
