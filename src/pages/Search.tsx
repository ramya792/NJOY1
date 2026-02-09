import React from 'react';
import SearchTabs from '@/components/search/SearchTabs';

const Search = React.forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref}>
      <SearchTabs />
    </div>
  );
});

Search.displayName = 'Search';

export default Search;
