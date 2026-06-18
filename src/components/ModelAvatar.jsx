import React, { useState } from 'react';
import { useLogos } from '../lib/logos';

/**
 * Renders the official logo for a model.
 * Automatically re-renders when logos are fetched/updated in the background.
 * Falls back to a coloured letter avatar if no logo is available yet.
 */
export default function ModelAvatar({ model, size = 32, className = '' }) {
  const logos = useLogos();
  const logo  = logos[model.id] || null;
  const [imgError, setImgError] = useState(false);

  const r = Math.round(size * 0.28);
  const containerStyle = {
    width: size, height: size, minWidth: size, minHeight: size,
    borderRadius: r, flexShrink: 0,
  };

  if (logo && !imgError) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden ${className}`}
        style={{ ...containerStyle, background: `${model.color || '#7c3aed'}18` }}
      >
        <img
          src={logo}
          alt={model.name}
          onError={() => setImgError(true)}
          style={{ width: size * 0.72, height: size * 0.72, objectFit: 'contain' }}
          draggable={false}
        />
      </div>
    );
  }

  // Letter avatar while logo is loading / unavailable
  return (
    <div
      className={`flex items-center justify-center text-white font-bold select-none ${className}`}
      style={{
        ...containerStyle,
        background: `linear-gradient(135deg, ${model.color || '#7c3aed'}, ${model.color || '#7c3aed'}99)`,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {model.name.charAt(0).toUpperCase()}
    </div>
  );
}
