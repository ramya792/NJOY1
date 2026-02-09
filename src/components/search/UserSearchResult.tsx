import React from 'react';
import { useNavigate } from 'react-router-dom';

interface UserSearchResultProps {
  user: {
    username: string;
    displayName: string;
    photoURL: string;
    followers?: string[];
    following?: string[];
    postsCount?: number;
  };
  userId: string;
}

const UserSearchResult: React.FC<UserSearchResultProps> = ({ user, userId }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/user/${userId}`)}
      className="flex items-center gap-3 w-full p-3 hover:bg-secondary rounded-lg transition-colors"
    >
      <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.username}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground">
            {user.username?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="text-left flex-1 min-w-0">
        <p className="font-semibold text-sm">{user.username}</p>
        <p className="text-sm text-muted-foreground truncate">{user.displayName}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{user.postsCount || 0} posts</span>
          <span>{user.followers?.length || 0} followers</span>
          <span>{user.following?.length || 0} following</span>
        </div>
      </div>
    </button>
  );
};

export default UserSearchResult;
