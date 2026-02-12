export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  previewUrl: string;
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

// Fallback URL helper
const getPreviewUrl = (n: number) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${((n - 1) % 16) + 1}.mp3`;

let _id = 0;
const t = (title: string, artist: string, duration: string): MusicTrack => ({
  id: String(++_id),
  title,
  artist,
  duration,
  previewUrl: getPreviewUrl(_id),
});

const MUSIC_LIBRARY: MusicTrack[] = [
  // Popular Artists - A-Z
  t('Shape of You', 'Ed Sheeran', '3:53'),
  t('Perfect', 'Ed Sheeran', '4:23'),
  t('Thinking Out Loud', 'Ed Sheeran', '4:41'),
  t('Photograph', 'Ed Sheeran', '4:18'),
  t('Castle on the Hill', 'Ed Sheeran', '4:21'),
  t('Shivers', 'Ed Sheeran', '3:27'),
  t('Bad Habits', 'Ed Sheeran', '3:50'),
  
  t('Blinding Lights', 'The Weeknd', '3:20'),
  t('Starboy', 'The Weeknd ft. Daft Punk', '3:50'),
  t('Save Your Tears', 'The Weeknd', '3:35'),
  t('The Hills', 'The Weeknd', '4:02'),
  t('Can\'t Feel My Face', 'The Weeknd', '3:34'),
  t('After Hours', 'The Weeknd', '6:01'),
  
  t('Levitating', 'Dua Lipa', '3:23'),
  t('Don\'t Start Now', 'Dua Lipa', '3:03'),
  t('New Rules', 'Dua Lipa', '3:29'),
  t('Physical', 'Dua Lipa', '3:13'),
  t('Break My Heart', 'Dua Lipa', '3:41'),
  
  t('As It Was', 'Harry Styles', '2:47'),
  t('Watermelon Sugar', 'Harry Styles', '2:54'),
  t('Sign of the Times', 'Harry Styles', '5:40'),
  t('Adore You', 'Harry Styles', '3:27'),
  t('Golden', 'Harry Styles', '3:28'),
  t('Late Night Talking', 'Harry Styles', '2:57'),
  
  t('Anti-Hero', 'Taylor Swift', '3:20'),
  t('Blank Space', 'Taylor Swift', '3:51'),
  t('Shake It Off', 'Taylor Swift', '3:39'),
  t('Style', 'Taylor Swift', '3:51'),
  t('Wildest Dreams', 'Taylor Swift', '3:40'),
  t('Lover', 'Taylor Swift', '3:41'),
  t('Cardigan', 'Taylor Swift', '3:59'),
  t('All Too Well', 'Taylor Swift', '5:29'),
  
  t('Flowers', 'Miley Cyrus', '3:20'),
  t('Wrecking Ball', 'Miley Cyrus', '3:41'),
  t('Malibu', 'Miley Cyrus', '3:51'),
  t('Midnight Sky', 'Miley Cyrus', '3:42'),
  
  t('Uptown Funk', 'Mark Ronson ft. Bruno Mars', '4:30'),
  t('24K Magic', 'Bruno Mars', '3:46'),
  t('That\'s What I Like', 'Bruno Mars', '3:26'),
  t('Just the Way You Are', 'Bruno Mars', '3:40'),
  t('Grenade', 'Bruno Mars', '3:42'),
  t('Locked Out of Heaven', 'Bruno Mars', '3:53'),
  t('When I Was Your Man', 'Bruno Mars', '3:33'),
  
  t('Someone Like You', 'Adele', '4:45'),
  t('Hello', 'Adele', '4:55'),
  t('Rolling in the Deep', 'Adele', '3:48'),
  t('Set Fire to the Rain', 'Adele', '4:01'),
  t('Easy On Me', 'Adele', '3:44'),
  t('Send My Love', 'Adele', '3:43'),
  
  t('Señorita', 'Shawn Mendes & Camila Cabello', '3:10'),
  t('Stitches', 'Shawn Mendes', '3:26'),
  t('There\'s Nothing Holdin\' Me Back', 'Shawn Mendes', '3:19'),
  t('In My Blood', 'Shawn Mendes', '3:31'),
  t('Treat You Better', 'Shawn Mendes', '3:07'),
  t('Lost in Japan', 'Shawn Mendes', '3:21'),
  
  t('God\'s Plan', 'Drake', '3:18'),
  t('One Dance', 'Drake ft. Wizkid & Kyla', '2:54'),
  t('Hotline Bling', 'Drake', '4:27'),
  t('In My Feelings', 'Drake', '3:37'),
  t('Passionfruit', 'Drake', '4:59'),
  t('Nice For What', 'Drake', '3:30'),
  
  t('Circles', 'Post Malone', '3:35'),
  t('Sunflower', 'Post Malone & Swae Lee', '2:38'),
  t('Rockstar', 'Post Malone ft. 21 Savage', '3:38'),
  t('Better Now', 'Post Malone', '3:51'),
  t('Congratulations', 'Post Malone ft. Quavo', '3:40'),
  t('I Fall Apart', 'Post Malone', '3:43'),
  
  t('Closer', 'The Chainsmokers ft. Halsey', '4:04'),
  t('Don\'t Let Me Down', 'The Chainsmokers ft. Daya', '3:28'),
  t('Something Just Like This', 'The Chainsmokers & Coldplay', '4:07'),
  t('Paris', 'The Chainsmokers', '3:41'),
  
  t('Radioactive', 'Imagine Dragons', '3:06'),
  t('Believer', 'Imagine Dragons', '3:24'),
  t('Thunder', 'Imagine Dragons', '3:07'),
  t('Demons', 'Imagine Dragons', '2:55'),
  t('Whatever It Takes', 'Imagine Dragons', '3:21'),
  t('Enemy', 'Imagine Dragons & JID', '2:53'),
  
  t('Counting Stars', 'OneRepublic', '4:17'),
  t('Apologize', 'OneRepublic', '3:28'),
  t('Secrets', 'OneRepublic', '3:45'),
  t('Good Life', 'OneRepublic', '4:12'),
  
  t('Memories', 'Maroon 5', '3:09'),
  t('Sugar', 'Maroon 5', '3:55'),
  t('Girls Like You', 'Maroon 5 ft. Cardi B', '3:55'),
  t('Moves Like Jagger', 'Maroon 5 ft. Christina Aguilera', '3:21'),
  t('Payphone', 'Maroon 5 ft. Wiz Khalifa', '3:51'),
  t('Animals', 'Maroon 5', '3:51'),
  
  t('Shallow', 'Lady Gaga & Bradley Cooper', '3:35'),
  t('Bad Romance', 'Lady Gaga', '4:54'),
  t('Poker Face', 'Lady Gaga', '3:57'),
  t('Born This Way', 'Lady Gaga', '4:20'),
  t('Applause', 'Lady Gaga', '3:32'),
  
  t('Happier', 'Marshmello ft. Bastille', '3:34'),
  t('Alone', 'Marshmello', '4:31'),
  t('Silence', 'Marshmello ft. Khalid', '3:00'),
  
  t('Wake Me Up', 'Avicii', '4:09'),
  t('The Nights', 'Avicii', '2:56'),
  t('Waiting For Love', 'Avicii', '3:50'),
  t('Levels', 'Avicii', '3:18'),
  t('Hey Brother', 'Avicii', '4:14'),
  
  t('Faded', 'Alan Walker', '3:32'),
  t('Alone', 'Alan Walker', '2:41'),
  t('Darkside', 'Alan Walker ft. Au/Ra & Tomine Harket', '3:27'),
  t('The Spectre', 'Alan Walker', '3:13'),
  
  t('Take Me to Church', 'Hozier', '4:01'),
  t('Someone You Loved', 'Lewis Capaldi', '3:02'),
  t('Before You Go', 'Lewis Capaldi', '3:35'),
  
  t('Stay', 'The Kid LAROI & Justin Bieber', '2:21'),
  t('Peaches', 'Justin Bieber ft. Daniel Caesar & Giveon', '3:18'),
  t('Love Yourself', 'Justin Bieber', '3:53'),
  t('Sorry', 'Justin Bieber', '3:20'),
  t('What Do You Mean?', 'Justin Bieber', '3:25'),
  t('Baby', 'Justin Bieber ft. Ludacris', '3:36'),
  t('Intentions', 'Justin Bieber ft. Quavo', '3:32'),
  
  t('Attention', 'Charlie Puth', '3:31'),
  t('See You Again', 'Wiz Khalifa ft. Charlie Puth', '3:49'),
  t('We Don\'t Talk Anymore', 'Charlie Puth ft. Selena Gomez', '3:37'),
  t('One Call Away', 'Charlie Puth', '3:13'),
  
  t('All of Me', 'John Legend', '4:29'),
  t('Ordinary People', 'John Legend', '4:29'),
  t('Love Me Now', 'John Legend', '3:43'),
  
  t('Chandelier', 'Sia', '3:36'),
  t('Cheap Thrills', 'Sia ft. Sean Paul', '3:31'),
  t('Elastic Heart', 'Sia', '4:17'),
  t('Titanium', 'David Guetta ft. Sia', '4:05'),
  
  t('Dance Monkey', 'Tones and I', '3:29'),
  t('Savage Love', 'Jawsh 685 & Jason Derulo', '2:51'),
  t('Positions', 'Ariana Grande', '2:52'),
  t('Thank U, Next', 'Ariana Grande', '3:27'),
  t('7 Rings', 'Ariana Grande', '2:58'),
  t('God Is a Woman', 'Ariana Grande', '3:17'),
  t('No Tears Left to Cry', 'Ariana Grande', '3:25'),
  t('Into You', 'Ariana Grande', '4:04'),
  
  t('Havana', 'Camila Cabello ft. Young Thug', '3:36'),
  t('Never Be the Same', 'Camila Cabello', '3:46'),
  t('Bam Bam', 'Camila Cabello ft. Ed Sheeran', '3:25'),
  
  t('Taki Taki', 'DJ Snake ft. Selena Gomez, Ozuna & Cardi B', '3:32'),
  t('Lean On', 'Major Lazer & DJ Snake ft. MØ', '2:56'),
  t('Let Me Love You', 'DJ Snake ft. Justin Bieber', '3:25'),
  
  t('Despacito', 'Luis Fonsi & Daddy Yankee ft. Justin Bieber', '3:47'),
  t('Bailando', 'Enrique Iglesias ft. Descemer Bueno & Gente de Zona', '4:04'),
  t('Mi Gente', 'J Balvin & Willy William', '3:09'),
  t('Felices los 4', 'Maluma', '3:49'),
  
  t('Girls', 'The 1975', '4:18'),
  t('Somebody Else', 'The 1975', '5:46'),
  t('Chocolate', 'The 1975', '3:44'),
  
  t('High Hopes', 'Panic! at the Disco', '3:10'),
  t('I Write Sins Not Tragedies', 'Panic! at the Disco', '3:06'),
  t('House of Memories', 'Panic! at the Disco', '3:28'),
  
  t('Heat Waves', 'Glass Animals', '3:58'),
  t('Stressed Out', 'Twenty One Pilots', '3:22'),
  t('Ride', 'Twenty One Pilots', '3:34'),
  t('Heathens', 'Twenty One Pilots', '3:15'),
  
  t('Royals', 'Lorde', '3:10'),
  t('Green Light', 'Lorde', '3:54'),
  t('Team', 'Lorde', '3:12'),
  
  t('Riptide', 'Vance Joy', '3:24'),
  t('Electric Love', 'BØRNS', '3:41'),
  t('Young Dumb & Broke', 'Khalid', '3:22'),
  t('Location', 'Khalid', '3:28'),
  
  t('Lose Yourself', 'Eminem', '5:26'),
  t('Without Me', 'Eminem', '4:50'),
  t('Stronger', 'Kanye West', '5:11'),
  t('Gold Digger', 'Kanye West ft. Jamie Foxx', '3:28'),
  
  t('HUMBLE.', 'Kendrick Lamar', '2:57'),
  t('Sicko Mode', 'Travis Scott', '5:12'),
  t('Highest in the Room', 'Travis Scott', '2:55'),
  
  t('Mockingbird', 'Eminem', '4:10'),
  t('Stan', 'Eminem ft. Dido', '6:44'),
  t('Love the Way You Lie', 'Eminem ft. Rihanna', '4:23'),
  
  t('Umbrella', 'Rihanna ft. Jay-Z', '4:35'),
  t('Diamonds', 'Rihanna', '3:45'),
  t('Work', 'Rihanna ft. Drake', '3:39'),
  t('We Found Love', 'Rihanna ft. Calvin Harris', '3:35'),
  t('Stay', 'Rihanna ft. Mikky Ekko', '4:00'),
  
  t('Halo', 'Beyoncé', '4:21'),
  t('Crazy in Love', 'Beyoncé ft. Jay-Z', '3:56'),
  t('Single Ladies', 'Beyoncé', '3:13'),
  t('Formation', 'Beyoncé', '3:26'),
  
  t('Rolling in the Deep', 'Adele', '3:48'),
  t('Roar', 'Katy Perry', '3:42'),
  t('Firework', 'Katy Perry', '3:47'),
  t('Dark Horse', 'Katy Perry ft. Juicy J', '3:35'),
  t('Teenage Dream', 'Katy Perry', '3:47'),
  
  t('Waka Waka', 'Shakira', '3:22'),
  t('Hips Don\'t Lie', 'Shakira ft. Wyclef Jean', '3:38'),
  t('Can\'t Remember to Forget You', 'Shakira ft. Rihanna', '3:26'),
  
  t('Viva La Vida', 'Coldplay', '4:01'),
  t('The Scientist', 'Coldplay', '5:09'),
  t('Fix You', 'Coldplay', '4:54'),
  t('Yellow', 'Coldplay', '4:29'),
  t('A Sky Full of Stars', 'Coldplay', '4:28'),
  
  t('Mr. Brightside', 'The Killers', '3:42'),
  t('Somebody That I Used to Know', 'Gotye ft. Kimbra', '4:04'),
  
  t('Pumped Up Kicks', 'Foster the People', '3:58'),
  t('Shut Up and Dance', 'Walk the Moon', '3:19'),
  t('Take On Me', 'a-ha', '3:46'),
  
  t('Smells Like Teen Spirit', 'Nirvana', '5:01'),
  t('Bohemian Rhapsody', 'Queen', '5:55'),
  t('Don\'t Stop Believin\'', 'Journey', '4:10'),
];

// Build search index for fast lookups
const searchIndex = new Map<string, number[]>();

function buildSearchIndex() {
  MUSIC_LIBRARY.forEach((track, idx) => {
    const words = `${track.title} ${track.artist}`.toLowerCase().split(/\s+/);
    words.forEach(word => {
      for (let len = 2; len <= Math.min(word.length, 6); len++) {
        const prefix = word.substring(0, len);
        if (!searchIndex.has(prefix)) searchIndex.set(prefix, []);
        const arr = searchIndex.get(prefix)!;
        if (!arr.includes(idx)) arr.push(idx);
      }
    });
  });
}
buildSearchIndex();

// Fast search function using the pre-built index
export function searchMusic(query: string): MusicTrack[] {
  if (query.trim().length >= 2) {
    const terms = query.toLowerCase().trim().split(/\s+/);
    const firstPrefix = terms[0].substring(0, Math.min(terms[0].length, 6));
    const candidates = searchIndex.get(firstPrefix) || [];

    return candidates
      .map(idx => MUSIC_LIBRARY[idx])
      .filter(track => {
        const searchable = `${track.title} ${track.artist}`.toLowerCase();
        return terms.every(term => searchable.includes(term));
      });
  }
  
  return MUSIC_LIBRARY;
}

export default MUSIC_LIBRARY;
