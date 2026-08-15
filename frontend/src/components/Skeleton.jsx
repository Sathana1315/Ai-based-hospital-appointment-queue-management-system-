import React from 'react';

/**
 * SkeletonBlock – a shimmer placeholder for loading states.
 * Props: width, height, borderRadius, style
 */
export const SkeletonBlock = ({ width = '100%', height = 16, borderRadius = 8, style = {} }) => (
  <div
    className="skeleton"
    style={{ width, height, borderRadius, ...style }}
  />
);

/**
 * SkeletonCard – mimics a glass-card loading placeholder.
 */
export const SkeletonCard = ({ lines = 3 }) => (
  <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
    <SkeletonBlock height={18} width="60%" />
    {Array.from({ length: lines - 1 }).map((_, i) => (
      <SkeletonBlock key={i} height={12} width={i % 2 === 0 ? '80%' : '50%'} />
    ))}
  </div>
);

/**
 * SkeletonTable – mimics a list of rows loading.
 */
export const SkeletonTable = ({ rows = 4 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonCard key={i} lines={2} />
    ))}
  </div>
);
