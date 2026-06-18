import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import { isElectron } from '../lib/utils';
import { APP_ICON_32 } from '../lib/appIcon';

export default function TitleBar({ activeModel }) {
  const [isMax, setIsMax] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    const check = async () => setIsMax(await window.electronAPI.isMaximized());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const btn = (action, Icon, hoverClass) => (
    <button
      onClick={() => isElectron && window.electronAPI[action]()}
      className={`titlebar-no-drag w-8 h-8 flex items-center justify-center rounded hover:${hoverClass} transition-colors text-gray-500 hover:text-white`}
    >
      <Icon size={12} />
    </button>
  );

  return (
    <div className="titlebar-drag flex items-center h-14 bg-nd-bar border-b border-nd-border select-none flex-shrink-0 px-3 gap-3">
      <div className="titlebar-no-drag flex items-center gap-2">
        <img
          src={APP_ICON_32}
          alt="Neural Dock"
          width={52}
          height={52}
          draggable={false}
          style={{ display: 'block', objectFit: 'contain' }}
        />
        <span className="text-white font-bold text-base tracking-wide">Neural Dock</span>
      </div>

      {activeModel && (
        <div
          className="titlebar-no-drag flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
          style={{ background: `${activeModel.color}22`, border: `1px solid ${activeModel.color}55`, color: activeModel.color }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: activeModel.color }} />
          {activeModel.name}
        </div>
      )}

      <div className="flex-1" />

      <div className="titlebar-no-drag flex items-center">
        {btn('minimize', Minus, 'bg-nd-row')}
        {btn('maximize', isMax ? Maximize2 : Square, 'bg-nd-row')}
        <button
          onClick={() => isElectron && window.electronAPI.close()}
          className="titlebar-no-drag w-8 h-8 flex items-center justify-center rounded hover:bg-red-600 transition-colors text-gray-500 hover:text-white"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
