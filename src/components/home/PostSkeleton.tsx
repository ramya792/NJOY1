import React from 'react';

const PostSkeleton: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-full skeleton" />
        <div className="h-4 w-24 skeleton" />
      </div>

      {/* Image */}
      <div className="aspect-square skeleton" />

      {/* Actions */}
      <div className="p-3">
        <div className="flex gap-4 mb-3">
          <div className="w-6 h-6 skeleton rounded" />
          <div className="w-6 h-6 skeleton rounded" />
          <div className="w-6 h-6 skeleton rounded" />
        </div>
        <div className="h-4 w-20 skeleton mb-2" />
        <div className="h-4 w-full skeleton mb-1" />
        <div className="h-4 w-3/4 skeleton" />
      </div>
    </div>
  );
};

export default PostSkeleton;
