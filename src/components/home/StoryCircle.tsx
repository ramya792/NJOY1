import React from 'react';

interface StoryCircleProps {
  imageUrl: string;
  hasUnviewed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
};

const StoryCircle: React.FC<StoryCircleProps> = ({
  imageUrl,
  hasUnviewed = true,
  size = 'md',
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`${hasUnviewed ? 'story-ring' : 'p-[3px] border-2 border-muted rounded-full'}`}
    >
      <div className="story-ring-inner">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-secondary`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Story"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              ?
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default StoryCircle;
