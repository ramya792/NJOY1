export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  previewUrl: string;
  thumbnailUrl?: string;
  startTime?: number; // Start time in seconds for playing a specific part
  endTime?: number; // End time in seconds
}

// Fetch real song preview with vocals from iTunes API (30-second clips)
const previewCache = new Map<string, string>();
const pendingFetches = new Map<string, Promise<string | null>>();

export async function fetchPreviewUrl(title: string, artist: string): Promise<string | null> {
  const cacheKey = `${title}-${artist}`;
  if (previewCache.has(cacheKey)) return previewCache.get(cacheKey)!;
  
  // Deduplicate concurrent requests for the same track
  if (pendingFetches.has(cacheKey)) return pendingFetches.get(cacheKey)!;
  
  const fetchPromise = (async () => {
    try {
      const term = encodeURIComponent(`${title} ${artist}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(
        `https://itunes.apple.com/search?term=${term}&limit=1&media=music`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      
      const data = await res.json();
      if (data.results?.[0]?.previewUrl) {
        previewCache.set(cacheKey, data.results[0].previewUrl);
        return data.results[0].previewUrl;
      }
      return null;
    } catch {
      return null;
    } finally {
      pendingFetches.delete(cacheKey);
    }
  })();
  
  pendingFetches.set(cacheKey, fetchPromise);
  return fetchPromise;
}

let defaultMusicCache: MusicTrack[] = [];

// Fetch live search results from iTunes API
export async function searchMusicOnline(query: string): Promise<MusicTrack[]> {
  let searchTerm = query.trim();
  const isDefaultSearch = searchTerm.length < 2;

  if (isDefaultSearch) {
    if (defaultMusicCache.length > 0) return defaultMusicCache;
    
    // Mix of diverse terms to get a list without hardcoding tracks
    const terms = [
      'Telugu hits', 
      'Anirudh', 
      'A.R. Rahman', 
      'Sid Sriram', 
      'Bollywood trending', 
      'Global hits', 
      'Top Love Songs', 
      'Devi Sri Prasad'
    ];
    searchTerm = terms[Math.floor(Math.random() * terms.length)];
  }

  try {
    const term = encodeURIComponent(searchTerm);
    // Fetch more results to filter out ones without previews
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&limit=40&media=music`);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const results = data.results.map((item: any, index: number) => {
        // format duration from milliseconds to mm:ss
        const durationMs = item.trackTimeMillis || 180000;
        const totalSeconds = Math.floor(durationMs / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        
        const track: MusicTrack = {
          id: `itunes-${item.trackId}-${index}`,
          title: item.trackName || 'Unknown Title',
          artist: item.artistName || 'Unknown Artist',
          duration: `${mins}:${secs.toString().padStart(2, '0')}`,
          previewUrl: item.previewUrl,
          thumbnailUrl: item.artworkUrl100,
        };
        
        // Cache the preview url for later use
        if (item.previewUrl) {
          previewCache.set(`${track.title}-${track.artist}`, item.previewUrl);
        }
        
        return track;
      }).filter((track: MusicTrack) => track.previewUrl);

      // Only save to cache if we actually got results
      if (isDefaultSearch && results.length > 0) {
        defaultMusicCache = results;
      }

      return results;
    }
  } catch (error) {
    console.error('iTunes API error:', error);
  }
  
  return [];
}
