export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  previewUrl: string;
  mood: MoodCategory;
  language: LanguageCategory;
}

export type MoodCategory = 'Love' | 'Sad' | 'Happy' | 'Party' | 'Chill' | 'Heartbreak' | 'Motivational' | 'Lonely';
export type LanguageCategory = 'English' | 'Hindi' | 'Telugu' | 'Tamil' | 'Malayalam' | 'Japanese';

export const MOOD_CATEGORIES: { label: string; value: MoodCategory | ''; emoji: string }[] = [
  { label: 'All', value: '', emoji: '🎵' },
  { label: 'Love', value: 'Love', emoji: '💕' },
  { label: 'Sad', value: 'Sad', emoji: '😢' },
  { label: 'Lonely', value: 'Lonely', emoji: '🥲' },
  { label: 'Happy', value: 'Happy', emoji: '😊' },
  { label: 'Party', value: 'Party', emoji: '🎉' },
  { label: 'Chill', value: 'Chill', emoji: '😌' },
  { label: 'Heartbreak', value: 'Heartbreak', emoji: '💔' },
  { label: 'Motivational', value: 'Motivational', emoji: '💪' },
];

export const LANGUAGE_CATEGORIES: { label: string; value: LanguageCategory | ''; flag: string }[] = [
  { label: 'All', value: '', flag: '🌍' },
  { label: 'English', value: 'English', flag: '🇺🇸' },
  { label: 'Hindi', value: 'Hindi', flag: '🇮🇳' },
  { label: 'Telugu', value: 'Telugu', flag: '🎬' },
  { label: 'Tamil', value: 'Tamil', flag: '🎭' },
  { label: 'Malayalam', value: 'Malayalam', flag: '🌴' },
  { label: 'Japanese', value: 'Japanese', flag: '🇯🇵' },
];

// Fetch real song preview with vocals from iTunes API (30-second clips)
const previewCache = new Map<string, string>();

export async function fetchPreviewUrl(title: string, artist: string): Promise<string | null> {
  const cacheKey = `${title}-${artist}`;
  if (previewCache.has(cacheKey)) return previewCache.get(cacheKey)!;
  try {
    const term = encodeURIComponent(`${title} ${artist}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&limit=1&media=music`);
    const data = await res.json();
    if (data.results?.[0]?.previewUrl) {
      previewCache.set(cacheKey, data.results[0].previewUrl);
      return data.results[0].previewUrl;
    }
    return null;
  } catch {
    return null;
  }
}

// Fallback URL helper
const getPreviewUrl = (n: number) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${((n - 1) % 16) + 1}.mp3`;

let _id = 0;
const t = (title: string, artist: string, duration: string, mood: MoodCategory, language: LanguageCategory): MusicTrack => ({
  id: String(++_id),
  title,
  artist,
  duration,
  previewUrl: getPreviewUrl(_id),
  mood,
  language,
});

const MUSIC_LIBRARY: MusicTrack[] = [
  // ═══════════════════════════════════
  // 🇺🇸 ENGLISH
  // ═══════════════════════════════════

  // ─── 💕 English Love ───
  t('Perfect', 'Ed Sheeran', '4:23', 'Love', 'English'),
  t('Thinking Out Loud', 'Ed Sheeran', '4:41', 'Love', 'English'),
  t('All of Me', 'John Legend', '4:29', 'Love', 'English'),
  t('Love Story', 'Taylor Swift', '3:56', 'Love', 'English'),
  t('Señorita', 'Shawn Mendes & Camila Cabello', '3:10', 'Love', 'English'),
  t('Peaches', 'Justin Bieber', '3:18', 'Love', 'English'),
  t('Stay', 'The Kid LAROI & Justin Bieber', '2:21', 'Love', 'English'),
  t('Kiss Me More', 'Doja Cat ft. SZA', '3:28', 'Love', 'English'),
  t('Shivers', 'Ed Sheeran', '3:27', 'Love', 'English'),
  t('Shape of You', 'Ed Sheeran', '3:53', 'Love', 'English'),
  t('Earned It', 'The Weeknd', '4:37', 'Love', 'English'),
  t('Die For You', 'The Weeknd', '4:01', 'Love', 'English'),
  t('Snooze', 'SZA', '3:21', 'Love', 'English'),
  t('Leave The Door Open', 'Silk Sonic', '4:02', 'Love', 'English'),
  t('Essence', 'Wizkid ft. Tems', '4:09', 'Love', 'English'),
  t('Calm Down', 'Rema & Selena Gomez', '3:59', 'Love', 'English'),
  t('Cruel Summer', 'Taylor Swift', '2:58', 'Love', 'English'),
  t('Attention', 'Charlie Puth', '3:31', 'Love', 'English'),
  t('Closer', 'The Chainsmokers ft. Halsey', '4:04', 'Love', 'English'),
  t('Something Just Like This', 'The Chainsmokers & Coldplay', '4:07', 'Love', 'English'),
  t('One Kiss', 'Calvin Harris & Dua Lipa', '3:34', 'Love', 'English'),
  t("Can't Feel My Face", 'The Weeknd', '3:33', 'Love', 'English'),
  t('Blank Space', 'Taylor Swift', '3:51', 'Love', 'English'),
  t('Positions', 'Ariana Grande', '2:52', 'Love', 'English'),
  t("That's What I Like", 'Bruno Mars', '3:26', 'Love', 'English'),
  t('Dandelions', 'Ruth B.', '3:53', 'Love', 'English'),
  t('Espresso', 'Sabrina Carpenter', '2:55', 'Love', 'English'),
  t('Please Please Please', 'Sabrina Carpenter', '3:06', 'Love', 'English'),
  t('Beautiful Things', 'Benson Boone', '2:59', 'Love', 'English'),
  t('Greedy', 'Tate McRae', '2:31', 'Love', 'English'),
  t('Water', 'Tyla', '3:20', 'Love', 'English'),
  t('Lovin On Me', 'Jack Harlow', '2:18', 'Love', 'English'),
  t('Lose Control', 'Teddy Swims', '3:30', 'Love', 'English'),
  t('Die With A Smile', 'Lady Gaga & Bruno Mars', '4:03', 'Love', 'English'),
  t('Love Nwantiti', 'CKay', '2:26', 'Love', 'English'),
  t('We Found Love', 'Rihanna ft. Calvin Harris', '3:35', 'Love', 'English'),
  t('Photograph', 'Ed Sheeran', '4:19', 'Love', 'English'),
  t('Havana', 'Camila Cabello ft. Young Thug', '3:37', 'Love', 'English'),
  t('Treat You Better', 'Shawn Mendes', '3:06', 'Love', 'English'),
  t('Super Shy', 'NewJeans', '2:34', 'Love', 'English'),
  t('Love Dive', 'IVE', '3:04', 'Love', 'English'),

  // ─── 😢 English Sad ───
  t('Someone Like You', 'Adele', '4:47', 'Sad', 'English'),
  t('Hello', 'Adele', '4:55', 'Sad', 'English'),
  t('Easy On Me', 'Adele', '3:44', 'Sad', 'English'),
  t('Let Her Go', 'Passenger', '4:12', 'Sad', 'English'),
  t('Save Your Tears', 'The Weeknd', '3:35', 'Sad', 'English'),
  t('Happier', 'Marshmello & Bastille', '3:34', 'Sad', 'English'),
  t('Glimpse of Us', 'Joji', '3:53', 'Sad', 'English'),
  t('Heather', 'Conan Gray', '3:18', 'Sad', 'English'),
  t('As It Was', 'Harry Styles', '2:47', 'Sad', 'English'),
  t('Anti-Hero', 'Taylor Swift', '3:20', 'Sad', 'English'),
  t('Stressed Out', 'Twenty One Pilots', '3:22', 'Sad', 'English'),
  t('Sorry', 'Justin Bieber', '3:20', 'Sad', 'English'),
  t("When The Party's Over", 'Billie Eilish', '3:16', 'Sad', 'English'),
  t('Lonely', 'Justin Bieber & Benny Blanco', '2:29', 'Sad', 'English'),
  t('Ghost', 'Justin Bieber', '2:33', 'Sad', 'English'),

  // ─── 🥲 English Lonely ───
  t('Faded', 'Alan Walker', '3:32', 'Lonely', 'English'),
  t('Alone', 'Marshmello', '3:20', 'Lonely', 'English'),
  t('After Dark', 'Mr.Kitty', '4:31', 'Lonely', 'English'),
  t('Do I Wanna Know?', 'Arctic Monkeys', '4:32', 'Lonely', 'English'),
  t('Sweater Weather', 'The Neighbourhood', '4:00', 'Lonely', 'English'),
  t('Heathens', 'Twenty One Pilots', '3:15', 'Lonely', 'English'),
  t('Snowfall', 'Øneheart & reidenshi', '1:38', 'Lonely', 'English'),
  t('Hotel California', 'Eagles', '6:30', 'Lonely', 'English'),
  t('Space Song', 'Beach House', '5:22', 'Lonely', 'English'),
  t('Dangerously', 'Charlie Puth', '3:29', 'Lonely', 'English'),

  // ─── 💔 English Heartbreak ───
  t('Drivers License', 'Olivia Rodrigo', '4:02', 'Heartbreak', 'English'),
  t('Good 4 U', 'Olivia Rodrigo', '2:58', 'Heartbreak', 'English'),
  t('Vampire', 'Olivia Rodrigo', '3:39', 'Heartbreak', 'English'),
  t('Deja Vu', 'Olivia Rodrigo', '3:35', 'Heartbreak', 'English'),
  t('Kill Bill', 'SZA', '2:33', 'Heartbreak', 'English'),
  t('Mr. Brightside', 'The Killers', '3:42', 'Heartbreak', 'English'),
  t('Somebody That I Used To Know', 'Gotye', '4:04', 'Heartbreak', 'English'),
  t('Rolling in the Deep', 'Adele', '3:48', 'Heartbreak', 'English'),
  t('Set Fire to the Rain', 'Adele', '4:02', 'Heartbreak', 'English'),
  t('Wrecking Ball', 'Miley Cyrus', '3:41', 'Heartbreak', 'English'),
  t('Love Yourself', 'Justin Bieber', '3:53', 'Heartbreak', 'English'),
  t('Stitches', 'Shawn Mendes', '3:26', 'Heartbreak', 'English'),
  t('We Are Never Getting Back Together', 'Taylor Swift', '3:13', 'Heartbreak', 'English'),
  t('Happier Than Ever', 'Billie Eilish', '4:58', 'Heartbreak', 'English'),

  // ─── 😊 English Happy ───
  t('Levitating', 'Dua Lipa', '3:23', 'Happy', 'English'),
  t('Butter', 'BTS', '2:44', 'Happy', 'English'),
  t('Dynamite', 'BTS', '3:19', 'Happy', 'English'),
  t('Watermelon Sugar', 'Harry Styles', '2:54', 'Happy', 'English'),
  t('Shake It Off', 'Taylor Swift', '3:39', 'Happy', 'English'),
  t("Don't Start Now", 'Dua Lipa', '3:03', 'Happy', 'English'),
  t('Say So', 'Doja Cat', '3:57', 'Happy', 'English'),
  t('About Damn Time', 'Lizzo', '3:13', 'Happy', 'English'),
  t("I Ain't Worried", 'OneRepublic', '2:28', 'Happy', 'English'),
  t('Sunflower', 'Post Malone & Swae Lee', '2:38', 'Happy', 'English'),
  t('Happy', 'Pharrell Williams', '3:53', 'Happy', 'English'),
  t('Good Feeling', 'Flo Rida', '4:08', 'Happy', 'English'),
  t('Mood', '24kGoldn ft. iann dior', '2:20', 'Happy', 'English'),
  t('Feather', 'Sabrina Carpenter', '3:05', 'Happy', 'English'),
  t('Walking On Sunshine', 'Katrina & The Waves', '3:58', 'Happy', 'English'),

  // ─── 🎉 English Party ───
  t('Blinding Lights', 'The Weeknd', '3:20', 'Party', 'English'),
  t('Montero', 'Lil Nas X', '2:17', 'Party', 'English'),
  t('Industry Baby', 'Lil Nas X', '3:32', 'Party', 'English'),
  t('Bad Habits', 'Ed Sheeran', '3:50', 'Party', 'English'),
  t('Unholy', 'Sam Smith & Kim Petras', '2:36', 'Party', 'English'),
  t("God's Plan", 'Drake', '3:18', 'Party', 'English'),
  t('Sicko Mode', 'Travis Scott', '5:12', 'Party', 'English'),
  t('Rockstar', 'Post Malone ft. 21 Savage', '3:38', 'Party', 'English'),
  t('HUMBLE.', 'Kendrick Lamar', '2:57', 'Party', 'English'),
  t('Uptown Funk', 'Mark Ronson ft. Bruno Mars', '4:30', 'Party', 'English'),
  t('24K Magic', 'Bruno Mars', '3:46', 'Party', 'English'),
  t('Starboy', 'The Weeknd ft. Daft Punk', '3:50', 'Party', 'English'),
  t('7 Rings', 'Ariana Grande', '2:58', 'Party', 'English'),
  t('Physical', 'Dua Lipa', '3:13', 'Party', 'English'),
  t('Break My Soul', 'Beyoncé', '4:38', 'Party', 'English'),
  t('CUFF IT', 'Beyoncé', '3:45', 'Party', 'English'),
  t('Lean On', 'Major Lazer & DJ Snake', '2:56', 'Party', 'English'),
  t('Cheap Thrills', 'Sia', '3:31', 'Party', 'English'),
  t('Levels', 'Avicii', '3:18', 'Party', 'English'),
  t('Not Like Us', 'Kendrick Lamar', '4:33', 'Party', 'English'),
  t('Billie Jean', 'Michael Jackson', '4:54', 'Party', 'English'),
  t('Dark Horse', 'Katy Perry', '3:35', 'Party', 'English'),

  // ─── 😌 English Chill ───
  t('Heat Waves', 'Glass Animals', '3:58', 'Chill', 'English'),
  t('Bones', 'Imagine Dragons', '2:45', 'Chill', 'English'),
  t('New Rules', 'Dua Lipa', '3:29', 'Chill', 'English'),
  t('Paint The Town Red', 'Doja Cat', '3:52', 'Chill', 'English'),
  t('Softly', 'Karan Aujla', '3:15', 'Chill', 'English'),
  t('Night Changes', 'One Direction', '3:47', 'Chill', 'English'),
  t('Rewrite The Stars', 'Zac Efron & Zendaya', '3:37', 'Chill', 'English'),
  t('Electric Love', 'BØRNS', '3:41', 'Chill', 'English'),

  // ─── 💪 English Motivational ───
  t('Believer', 'Imagine Dragons', '3:24', 'Motivational', 'English'),
  t('Thunder', 'Imagine Dragons', '3:07', 'Motivational', 'English'),
  t('Enemy', 'Imagine Dragons', '2:53', 'Motivational', 'English'),
  t('Radioactive', 'Imagine Dragons', '3:06', 'Motivational', 'English'),
  t('Counting Stars', 'OneRepublic', '4:17', 'Motivational', 'English'),
  t('Flowers', 'Miley Cyrus', '3:20', 'Motivational', 'English'),
  t('Titanium', 'David Guetta ft. Sia', '4:05', 'Motivational', 'English'),
  t('Roar', 'Katy Perry', '3:43', 'Motivational', 'English'),
  t('Chandelier', 'Sia', '3:36', 'Motivational', 'English'),
  t('Bohemian Rhapsody', 'Queen', '5:55', 'Motivational', 'English'),
  t("Don't Stop Believin'", 'Journey', '4:11', 'Motivational', 'English'),
  t('Wake Me Up', 'Avicii', '4:07', 'Motivational', 'English'),
  t('Hall of Fame', 'The Script ft. will.i.am', '3:22', 'Motivational', 'English'),
  t('Stronger', 'Kelly Clarkson', '3:42', 'Motivational', 'English'),
  t('Fight Song', 'Rachel Platten', '3:24', 'Motivational', 'English'),

  // ═══════════════════════════════════
  // 🇮🇳 HINDI
  // ═══════════════════════════════════

  // ─── 💕 Hindi Love ───
  t('Kesariya', 'Arijit Singh', '4:28', 'Love', 'Hindi'),
  t('Raataan Lambiyan', 'Jubin Nautiyal & Asees Kaur', '3:49', 'Love', 'Hindi'),
  t('Tum Hi Ho', 'Arijit Singh', '4:22', 'Love', 'Hindi'),
  t('Apna Bana Le', 'Arijit Singh', '4:39', 'Love', 'Hindi'),
  t('Chaleya', 'Arijit Singh & Shilpa Rao', '3:45', 'Love', 'Hindi'),
  t('Tere Hawaale', 'Arijit Singh & Shilpa Rao', '4:46', 'Love', 'Hindi'),
  t('Maan Meri Jaan', 'King', '3:15', 'Love', 'Hindi'),
  t('Phir Aur Kya Chahiye', 'Arijit Singh', '4:38', 'Love', 'Hindi'),
  t('Excuses', 'AP Dhillon & Gurinder Gill', '2:55', 'Love', 'Hindi'),
  t('Lover', 'Diljit Dosanjh', '3:09', 'Love', 'Hindi'),
  t('Raanjhanaa', 'Arijit Singh', '4:15', 'Love', 'Hindi'),
  t('Pehle Bhi Main', 'Vishal Mishra', '3:45', 'Love', 'Hindi'),
  t('Teri Baaton Mein Aisa Uljha Jiya', 'Raghav Chaitanya', '3:22', 'Love', 'Hindi'),
  t('Heeriye', 'Jasleen Royal ft. Arijit Singh', '3:18', 'Love', 'Hindi'),
  t('O Maahi', 'Arijit Singh', '4:12', 'Love', 'Hindi'),
  t('Tera Ban Jaunga', 'Akhil Sachdeva & Tulsi Kumar', '3:56', 'Love', 'Hindi'),
  t('Tujhe Kitna Chahne Lage', 'Arijit Singh', '4:45', 'Love', 'Hindi'),
  t('Hawayein', 'Arijit Singh', '4:55', 'Love', 'Hindi'),
  t('Sanam Teri Kasam', 'Ankit Tiwari', '5:28', 'Love', 'Hindi'),
  t('Pal', 'Arijit Singh & Shreya Ghoshal', '3:47', 'Love', 'Hindi'),
  t('Kabira', 'Tochi Raina & Rekha Bhardwaj', '3:43', 'Love', 'Hindi'),
  t('Tere Vaaste', 'Varun Jain & Sachin-Jigar', '3:28', 'Love', 'Hindi'),
  t('Tu Hi Yaar Mera', 'Arijit Singh & Neha Kakkar', '3:54', 'Love', 'Hindi'),
  t('Jo Tum Mere Ho', 'Anuv Jain', '3:01', 'Love', 'Hindi'),
  t('Baarishein', 'Anuv Jain', '3:20', 'Love', 'Hindi'),

  // ─── 😢 Hindi Sad ───
  t('Kahani Suno 2.0', 'Kaifi Khalil', '4:12', 'Sad', 'Hindi'),
  t('Agar Tum Saath Ho', 'Arijit Singh & Alka Yagnik', '5:41', 'Sad', 'Hindi'),
  t('O Bedardeya', 'Arijit Singh', '4:20', 'Sad', 'Hindi'),
  t('Channa Mereya', 'Arijit Singh', '4:49', 'Sad', 'Hindi'),
  t('Ae Dil Hai Mushkil', 'Arijit Singh', '4:29', 'Sad', 'Hindi'),
  t('Hamari Adhuri Kahani', 'Arijit Singh', '5:38', 'Sad', 'Hindi'),
  t('Tujhko Jo Paaya', 'Mohit Chauhan', '5:06', 'Sad', 'Hindi'),
  t('Phir Bhi Tumko Chaahunga', 'Arijit Singh', '4:45', 'Sad', 'Hindi'),
  t('Tum Se Hi', 'Mohit Chauhan', '5:33', 'Sad', 'Hindi'),
  t('Bolna', 'Arijit Singh & Asees Kaur', '4:25', 'Sad', 'Hindi'),
  t('Kaise Hua', 'Vishal Mishra', '3:22', 'Sad', 'Hindi'),
  t('Mann Bharryaa', 'B Praak', '3:33', 'Sad', 'Hindi'),

  // ─── 🎉 Hindi Party ───
  t('Jhoome Jo Pathaan', 'Arijit Singh', '3:38', 'Party', 'Hindi'),
  t('Besharam Rang', 'Shilpa Rao & Caralisa Monteiro', '3:41', 'Party', 'Hindi'),
  t('Brown Munde', 'AP Dhillon', '3:29', 'Party', 'Hindi'),
  t('Pasoori', 'Ali Sethi & Shae Gill', '3:52', 'Party', 'Hindi'),
  t('Bijlee Bijlee', 'Harrdy Sandhu', '3:02', 'Party', 'Hindi'),
  t('Srivalli', 'Javed Ali', '3:18', 'Party', 'Hindi'),
  t('Kar Gayi Chull', 'Badshah & Fazilpuria', '2:53', 'Party', 'Hindi'),
  t('London Thumakda', 'Labh Janjua & Sonu Kakkar', '3:04', 'Party', 'Hindi'),
  t('Kala Chashma', 'Badshah & Amar Arshi', '4:14', 'Party', 'Hindi'),
  t('Naach Meri Rani', 'Guru Randhawa & Nikhita Gandhi', '3:35', 'Party', 'Hindi'),
  t('Badtameez Dil', 'Benny Dayal', '4:10', 'Party', 'Hindi'),
  t('Gallan Goodiyan', 'Shankar-Ehsaan-Loy', '3:51', 'Party', 'Hindi'),
  t('Zingaat', 'Ajay-Atul', '3:36', 'Party', 'Hindi'),
  t('Dil Dhadakne Do', 'Priyanka Chopra & Farhan Akhtar', '4:56', 'Party', 'Hindi'),

  // ─── 💔 Hindi Heartbreak ───
  t('Tere Bina', 'A.R. Rahman', '5:26', 'Heartbreak', 'Hindi'),
  t('Tu Jaane Na', 'Atif Aslam', '5:07', 'Heartbreak', 'Hindi'),
  t('Aadat', 'Atif Aslam', '5:20', 'Heartbreak', 'Hindi'),
  t('Tum Hi Aana', 'Jubin Nautiyal', '4:23', 'Heartbreak', 'Hindi'),
  t('Khairiyat', 'Arijit Singh', '4:28', 'Heartbreak', 'Hindi'),
  t('Ranjha', 'B Praak', '3:55', 'Heartbreak', 'Hindi'),
  t('Lut Gaye', 'Jubin Nautiyal', '4:28', 'Heartbreak', 'Hindi'),
  t('Filhall', 'B Praak', '4:29', 'Heartbreak', 'Hindi'),
  t('Bewafa Tera Masoom Chehra', 'Jubin Nautiyal', '4:44', 'Heartbreak', 'Hindi'),

  // ─── 😌 Hindi Chill ───
  t('Iktara', 'Amit Trivedi & Kavita Seth', '3:30', 'Chill', 'Hindi'),
  t('Tum Ho', 'Mohit Chauhan', '4:41', 'Chill', 'Hindi'),
  t('Ilahi', 'Arijit Singh', '3:32', 'Chill', 'Hindi'),
  t('Safar', 'Arijit Singh', '5:21', 'Chill', 'Hindi'),
  t('Dil Diyan Gallan', 'Atif Aslam', '4:15', 'Chill', 'Hindi'),
  t('Tera Yaar Hoon Main', 'Arijit Singh', '4:07', 'Chill', 'Hindi'),
  t('Kun Faya Kun', 'A.R. Rahman', '7:52', 'Chill', 'Hindi'),
  t('Phir Se Ud Chala', 'Mohit Chauhan', '4:19', 'Chill', 'Hindi'),

  // ─── 💪 Hindi Motivational ───
  t('Born To Shine', 'Diljit Dosanjh', '3:55', 'Motivational', 'Hindi'),
  t('Lakshya', 'Shankar Mahadevan', '5:41', 'Motivational', 'Hindi'),
  t('Sultan', 'Sukhwinder Singh', '4:39', 'Motivational', 'Hindi'),
  t('Chak De India', 'Sukhwinder Singh', '5:08', 'Motivational', 'Hindi'),
  t('Zinda', 'Siddharth Mahadevan', '3:56', 'Motivational', 'Hindi'),
  t('Brothers Anthem', 'Vishal Dadlani', '3:29', 'Motivational', 'Hindi'),
  t('Dangal', 'Daler Mehndi', '3:15', 'Motivational', 'Hindi'),
  t('Kar Har Maidaan Fateh', 'Shreya Ghoshal & Sukhwinder Singh', '4:55', 'Motivational', 'Hindi'),

  // ═══════════════════════════════════
  // 🎬 TELUGU
  // ═══════════════════════════════════

  // ─── 💕 Telugu Love ───
  t('Buttabomma', 'Armaan Malik', '3:20', 'Love', 'Telugu'),
  t('Chuttamalle', 'Arijit Singh & Shilpa Rao', '3:38', 'Love', 'Telugu'),
  t('Nee Kannu Neeli Samudram', 'Sid Sriram', '4:30', 'Love', 'Telugu'),
  t('Inkem Inkem Inkem Kaavaale', 'Sid Sriram', '4:27', 'Love', 'Telugu'),
  t('Pillaa Raa', 'Sid Sriram', '3:45', 'Love', 'Telugu'),
  t('Ee Raathale', 'Anurag Kulkarni & Sanjith Hegde', '4:01', 'Love', 'Telugu'),
  t('What Amma What Is This Amma', 'Ram Miriyala', '3:33', 'Love', 'Telugu'),
  t('Enni Soni', 'Haricharan', '4:15', 'Love', 'Telugu'),
  t('O Pilla Subhanallah', 'Sid Sriram', '3:28', 'Love', 'Telugu'),
  t('Samajavaragamana', 'Sid Sriram', '4:02', 'Love', 'Telugu'),
  t('Choosi Chudangane', 'Sid Sriram', '4:31', 'Love', 'Telugu'),
  t('Kalaavathi', 'Sid Sriram', '3:44', 'Love', 'Telugu'),
  t('Saranga Dariya', 'Mangli', '3:57', 'Love', 'Telugu'),
  t('O Sita Hey Rama', 'Anurag Kulkarni', '4:10', 'Love', 'Telugu'),
  t('Priyathama Priyathama', 'Sid Sriram', '4:20', 'Love', 'Telugu'),
  t('Nuvve Nuvve', 'Harris Jayaraj', '4:55', 'Love', 'Telugu'),
  t('Manasu Maree', 'Sid Sriram', '3:59', 'Love', 'Telugu'),
  t('Srivalli (Telugu)', 'Sid Sriram', '3:18', 'Love', 'Telugu'),
  t('Vachinde', 'Sid Sriram', '4:32', 'Love', 'Telugu'),
  t('Ye Nimishamlo', 'Sid Sriram', '4:14', 'Love', 'Telugu'),
  t('Chinna Chinna', 'Sid Sriram', '3:45', 'Love', 'Telugu'),
  t('Kanunna Kalyanam', 'Sid Sriram', '4:10', 'Love', 'Telugu'),

  // ─── 😢 Telugu Sad ───
  t('Nee Neeli Kannullona', 'Vijay Deverakonda', '4:30', 'Sad', 'Telugu'),
  t('Kalyani Vaccha', 'Sid Sriram', '4:15', 'Sad', 'Telugu'),
  t('Nee Parichayamtho', 'Sid Sriram', '4:00', 'Sad', 'Telugu'),
  t('Yevandoi Nani Garu', 'Chinmayi', '4:22', 'Sad', 'Telugu'),
  t('Emai Poyave', 'Sid Sriram', '4:32', 'Sad', 'Telugu'),
  t('Nee Chitram Choosi', 'Haricharan', '4:08', 'Sad', 'Telugu'),
  t('Manasuna Unnadi', 'Sid Sriram', '3:47', 'Sad', 'Telugu'),
  t('Edo Jarugutondi', 'Sid Sriram', '4:45', 'Sad', 'Telugu'),
  t('Cheppave Chirugali', 'S.P. Balasubrahmanyam', '5:10', 'Sad', 'Telugu'),
  t('Telisiney Na Nuvvey', 'Sid Sriram', '4:35', 'Sad', 'Telugu'),

  // ─── 🎉 Telugu Party ───
  t('Oo Antava', 'Indravathi Chauhan', '3:18', 'Party', 'Telugu'),
  t('Saami Saami', 'Mounika Yadav', '3:41', 'Party', 'Telugu'),
  t('Ranjithame', 'Anirudh Ravichander', '3:56', 'Party', 'Telugu'),
  t('Arabic Kuthu', 'Anirudh Ravichander', '4:34', 'Party', 'Telugu'),
  t('Ala Vaikunthapurramuloo', 'Anurag Kulkarni', '3:48', 'Party', 'Telugu'),
  t('Butta Bomma', 'Armaan Malik', '3:20', 'Party', 'Telugu'),
  t('Naatu Naatu', 'Rahul Sipligunj & Kaala Bhairava', '3:22', 'Party', 'Telugu'),
  t('Top Lesi Poddi', 'Benny Dayal', '3:33', 'Party', 'Telugu'),
  t('Seeti Maar', 'Devi Sri Prasad', '3:45', 'Party', 'Telugu'),
  t('Jigelu Rani', 'Devi Sri Prasad', '3:55', 'Party', 'Telugu'),
  t('Ramuloo Ramulaa', 'Anurag Kulkarni', '3:48', 'Party', 'Telugu'),
  t('Mind Block', 'Blaaze', '3:20', 'Party', 'Telugu'),
  t('Eyy Bidda Idhi Naa Adda', 'Mani Sharma', '3:38', 'Party', 'Telugu'),
  t('Bullet', 'Ram Miriyala', '3:15', 'Party', 'Telugu'),

  // ─── 💔 Telugu Heartbreak ───
  t('Why This Kolaveri Di', 'Dhanush', '3:36', 'Heartbreak', 'Telugu'),
  t('Neeli Neeli Aakasam', 'Sid Sriram', '5:30', 'Heartbreak', 'Telugu'),
  t('Ye Manishike Majiliyo', 'Sid Sriram', '4:12', 'Heartbreak', 'Telugu'),
  t('Undiporaadhey', 'Sid Sriram', '4:45', 'Heartbreak', 'Telugu'),
  t('Oosupodu', 'Sid Sriram', '3:58', 'Heartbreak', 'Telugu'),
  t('Ninnu Kori', 'Sid Sriram', '4:20', 'Heartbreak', 'Telugu'),

  // ─── 💪 Telugu Motivational ───
  t('Jai Lava Kusa Title Song', 'Bobby', '3:40', 'Motivational', 'Telugu'),
  t('Vakeel Saab Anthem', 'Sid Sriram', '3:55', 'Motivational', 'Telugu'),
  t('Pushpa Pushpa', 'Devi Sri Prasad', '3:18', 'Motivational', 'Telugu'),
  t('Saahore Baahubali', 'Daler Mehndi', '4:12', 'Motivational', 'Telugu'),
  t('Dandalayya', 'M.M. Keeravani', '5:30', 'Motivational', 'Telugu'),

  // ═══════════════════════════════════
  // 🎭 TAMIL
  // ═══════════════════════════════════

  // ─── 💕 Tamil Love ───
  t('Kannazhaga', 'Dhanush & Shruti Haasan', '3:45', 'Love', 'Tamil'),
  t('Unna Ippo Paakkanum', 'Yuvan Shankar Raja', '4:02', 'Love', 'Tamil'),
  t('Nenjukkul Peidhidum', 'Harris Jayaraj', '5:13', 'Love', 'Tamil'),
  t('Kadhal En Kadhal', 'Yuvan Shankar Raja', '4:30', 'Love', 'Tamil'),
  t('Idhazhin Oram', 'Ajesh Ashok', '4:45', 'Love', 'Tamil'),
  t('Enna Solla', 'Anirudh Ravichander', '3:38', 'Love', 'Tamil'),
  t('Kanave Kanave', 'Anirudh Ravichander', '4:28', 'Love', 'Tamil'),
  t('Po Nee Po', 'A.R. Rahman', '4:55', 'Love', 'Tamil'),
  t('Maruvaarthai', 'Sid Sriram', '5:12', 'Love', 'Tamil'),
  t('Thalli Pogathey', 'Sid Sriram', '4:48', 'Love', 'Tamil'),
  t('Kadhale Kadhale', 'Sid Sriram', '4:02', 'Love', 'Tamil'),
  t('Ennai Nokki Paayum Thotta', 'Sid Sriram', '4:18', 'Love', 'Tamil'),
  t('Uyire', 'A.R. Rahman & Hariharan', '5:15', 'Love', 'Tamil'),
  t('Munbe Vaa', 'A.R. Rahman', '5:32', 'Love', 'Tamil'),
  t('Kannaana Kanney', 'D. Imman', '3:53', 'Love', 'Tamil'),
  t('Mazhai Kuruvi', 'A.R. Rahman', '3:46', 'Love', 'Tamil'),
  t('Imaikkaa Nodigal', 'Hiphop Tamizha', '3:31', 'Love', 'Tamil'),
  t('Malargal Kaettaen', 'Sid Sriram', '4:56', 'Love', 'Tamil'),
  t('Hey Penne', 'Yuvan Shankar Raja', '3:40', 'Love', 'Tamil'),

  // ─── 😢 Tamil Sad ───
  t('Nee Paartha Vizhigal', 'Yuvan Shankar Raja', '4:25', 'Sad', 'Tamil'),
  t('Vaseegara', 'Bombay Jayashri', '5:44', 'Sad', 'Tamil'),
  t('Oru Nodiyil', 'Sid Sriram', '4:08', 'Sad', 'Tamil'),
  t('Unakkenna Venum Sollu', 'Sid Sriram', '4:32', 'Sad', 'Tamil'),
  t('Kadhal Oru Aagayam', 'Sid Sriram', '4:22', 'Sad', 'Tamil'),
  t('Naan Un', 'Sid Sriram', '4:15', 'Sad', 'Tamil'),
  t('Uyir Uruvaatha', 'Sid Sriram', '4:00', 'Sad', 'Tamil'),
  t('Yaanji', 'Anirudh Ravichander', '3:55', 'Sad', 'Tamil'),

  // ─── 🎉 Tamil Party ───
  t('Vaathi Coming', 'Anirudh Ravichander', '3:22', 'Party', 'Tamil'),
  t('Kaavaalaa', 'Anirudh Ravichander', '4:07', 'Party', 'Tamil'),
  t('Naa Ready', 'Anirudh Ravichander', '3:25', 'Party', 'Tamil'),
  t('Arabic Kuthu (Tamil)', 'Anirudh Ravichander', '4:34', 'Party', 'Tamil'),
  t('Rowdy Baby', 'Dhanush & Dhee', '4:10', 'Party', 'Tamil'),
  t('Aalaporan Thamizhan', 'A.R. Rahman', '4:35', 'Party', 'Tamil'),
  t('Verithanam', 'A.R. Rahman', '3:47', 'Party', 'Tamil'),
  t('Surviva', 'Anirudh Ravichander', '3:43', 'Party', 'Tamil'),
  t('Marana Mass', 'Anirudh Ravichander', '3:30', 'Party', 'Tamil'),
  t('Kutti Story', 'Anirudh Ravichander', '3:12', 'Party', 'Tamil'),
  t('Jolly O Gymkhana', 'Anirudh Ravichander', '3:55', 'Party', 'Tamil'),
  t('Private Party', 'Anirudh Ravichander', '3:44', 'Party', 'Tamil'),
  t('Dippam Dippam', 'Anirudh Ravichander', '3:29', 'Party', 'Tamil'),

  // ─── 💔 Tamil Heartbreak ───
  t('Vennila Kabaddi Kuzhu', 'Yuvan Shankar Raja', '4:10', 'Heartbreak', 'Tamil'),
  t('Oru Kili Oru Kili', 'S.P. Balasubrahmanyam', '4:45', 'Heartbreak', 'Tamil'),
  t('Uyire Uyire', 'A.R. Rahman', '5:00', 'Heartbreak', 'Tamil'),
  t('Aasa Kooda', 'Sai Abhyankkar', '3:05', 'Heartbreak', 'Tamil'),
  t('Oh Penne', 'Yuvan Shankar Raja', '4:08', 'Heartbreak', 'Tamil'),

  // ─── 💪 Tamil Motivational ───
  t('Aaluma Doluma', 'Anirudh Ravichander', '4:15', 'Motivational', 'Tamil'),
  t('Kanguva Title Track', 'Devi Sri Prasad', '3:45', 'Motivational', 'Tamil'),
  t('Mersal Arasan', 'A.R. Rahman', '4:30', 'Motivational', 'Tamil'),
  t('Vilayaadu Mankku', 'Anirudh Ravichander', '3:18', 'Motivational', 'Tamil'),

  // ═══════════════════════════════════
  // 🌴 MALAYALAM
  // ═══════════════════════════════════

  // ─── 💕 Malayalam Love ───
  t('Appangal Embadum', 'Vineeth Sreenivasan', '4:15', 'Love', 'Malayalam'),
  t('Malare', 'Vijay Yesudas', '4:39', 'Love', 'Malayalam'),
  t('Oru Mezhuthiri', 'K.S. Harisankar', '4:20', 'Love', 'Malayalam'),
  t('Kannil Kannil', 'K.J. Yesudas', '4:55', 'Love', 'Malayalam'),
  t('Karmukilil', 'K.J. Yesudas', '5:10', 'Love', 'Malayalam'),
  t('Entammede Jimikki Kammal', 'Vineeth Sreenivasan', '3:28', 'Love', 'Malayalam'),
  t('Manikya Malaraya Poovi', 'Vineeth Sreenivasan', '3:46', 'Love', 'Malayalam'),
  t('Aaromale', 'Alphons Joseph', '4:22', 'Love', 'Malayalam'),
  t('Jeevamshamayi', 'K.S. Harisankar & Shreya Ghoshal', '3:52', 'Love', 'Malayalam'),
  t('Kaane Kaane', 'Arivu & Sithara Krishnakumar', '3:38', 'Love', 'Malayalam'),
  t('Nee Himamazhayayi', 'Vineeth Sreenivasan', '4:05', 'Love', 'Malayalam'),
  t('Pavizha Mazha', 'Haricharan', '4:18', 'Love', 'Malayalam'),
  t('Theerame', 'Chithara & Haricharan', '4:30', 'Love', 'Malayalam'),
  t('Hridayam Theme', 'Hesham Abdul Wahab', '4:45', 'Love', 'Malayalam'),
  t('Darshana', 'Hesham Abdul Wahab', '4:12', 'Love', 'Malayalam'),
  t('Thinkalazhcha Nishchayam', 'Vineeth Sreenivasan', '3:35', 'Love', 'Malayalam'),
  t('Mazhaye Mazhaye', 'Hariharan & K.S. Chithra', '4:48', 'Love', 'Malayalam'),

  // ─── 😢 Malayalam Sad ───
  t('Kumbalangi Nights Theme', 'Sushin Shyam', '4:30', 'Sad', 'Malayalam'),
  t('Njan Ninne Premikkunnu', 'K.J. Yesudas', '5:00', 'Sad', 'Malayalam'),
  t('Etho Varmukilin', 'K.S. Chithra', '5:15', 'Sad', 'Malayalam'),
  t('Poomaram', 'Vineeth Sreenivasan', '4:08', 'Sad', 'Malayalam'),
  t('Ente Kadha', 'Vineeth Sreenivasan', '3:55', 'Sad', 'Malayalam'),
  t('Theevandi Theme', 'Kailas Menon', '3:42', 'Sad', 'Malayalam'),
  t('Minnale', 'K.S. Harisankar', '4:32', 'Sad', 'Malayalam'),
  t('Parayuvan', 'Darshana', '3:48', 'Sad', 'Malayalam'),

  // ─── 🎉 Malayalam Party ───
  t('Jimmiki Kammal', 'Vineeth Sreenivasan', '3:28', 'Party', 'Malayalam'),
  t('Kalakkatha', 'Shyam Fernando', '3:40', 'Party', 'Malayalam'),
  t('Vaadi Pulla Vaadi', 'Hiphop Tamizha', '3:22', 'Party', 'Malayalam'),
  t('Illuminati', 'Dabzee & Sushin Shyam', '3:50', 'Party', 'Malayalam'),
  t('Pathala Pathala', 'Kamal Haasan', '4:05', 'Party', 'Malayalam'),
  t('Romancham Theme', 'Sushin Shyam', '3:15', 'Party', 'Malayalam'),

  // ─── 💔 Malayalam Heartbreak ───
  t('Pularuvan', 'Vineeth Sreenivasan', '4:00', 'Heartbreak', 'Malayalam'),
  t('Ishtam Enikkishtam', 'K.J. Yesudas', '5:05', 'Heartbreak', 'Malayalam'),
  t('Nee Mazha Peyyumbam', 'Vineeth Sreenivasan', '3:58', 'Heartbreak', 'Malayalam'),
  t('Uyiril Thodum', 'Alphons Joseph', '4:12', 'Heartbreak', 'Malayalam'),
  t('Ente Ummante', 'M.G. Sreekumar', '4:35', 'Heartbreak', 'Malayalam'),

  // ─── 💪 Malayalam Motivational ───
  t('Minnal Murali Theme', 'Shaan Rahman', '3:30', 'Motivational', 'Malayalam'),
  t('Ayyappanum Koshiyum Theme', 'Jakes Bejoy', '3:55', 'Motivational', 'Malayalam'),
  t('Lucifer Theme', 'Deepak Dev', '3:40', 'Motivational', 'Malayalam'),

  // ═══════════════════════════════════
  // 🇯🇵 JAPANESE
  // ═══════════════════════════════════

  // ─── 💕 Japanese Love ───
  t('Lemon', 'Kenshi Yonezu', '4:16', 'Love', 'Japanese'),
  t('Pretender', 'Official HIGE DANdism', '5:24', 'Love', 'Japanese'),
  t('Kataomoi', 'Aimer', '5:38', 'Love', 'Japanese'),
  t('Harunohi', 'Aimyon', '4:10', 'Love', 'Japanese'),
  t('First Love', 'Hikaru Utada', '4:18', 'Love', 'Japanese'),
  t('One Last Kiss', 'Hikaru Utada', '4:30', 'Love', 'Japanese'),
  t('Marigold', 'Aimyon', '3:54', 'Love', 'Japanese'),
  t('I Love...', 'Official HIGE DANdism', '5:34', 'Love', 'Japanese'),
  t('Shape of Love', 'ISSA & SoulJa', '4:22', 'Love', 'Japanese'),
  t('Renai Circulation', 'Kana Hanazawa', '4:13', 'Love', 'Japanese'),
  t('Sugar Song to Bitter Step', 'UNISON SQUARE GARDEN', '4:30', 'Love', 'Japanese'),
  t('Snow Halation', "μ's", '4:32', 'Love', 'Japanese'),
  t('Nandemonaiya', 'RADWIMPS', '5:43', 'Love', 'Japanese'),
  t('Sparkle', 'RADWIMPS', '8:54', 'Love', 'Japanese'),

  // ─── 😢 Japanese Sad ───
  t('Unravel', 'TK from Ling Tosite Sigure', '4:00', 'Sad', 'Japanese'),
  t('Orange', 'SEKAI NO OWARI', '5:24', 'Sad', 'Japanese'),
  t('Anata ni', 'MONGOL800', '3:44', 'Sad', 'Japanese'),
  t('3月9日', 'Remioromen', '5:31', 'Sad', 'Japanese'),
  t('Niji', 'Kazunari Ninomiya', '4:13', 'Sad', 'Japanese'),
  t('Kaikai Kitan', 'Eve', '3:40', 'Sad', 'Japanese'),
  t('Lost One no Goukoku', 'Neru', '3:36', 'Sad', 'Japanese'),
  t('Yoake to Hotaru', 'n-buna', '3:55', 'Sad', 'Japanese'),

  // ─── 🎉 Japanese Party ───
  t('Gurenge', 'LiSA', '3:57', 'Party', 'Japanese'),
  t('KICK BACK', 'Kenshi Yonezu', '3:17', 'Party', 'Japanese'),
  t('SPECIALZ', 'King Gnu', '3:52', 'Party', 'Japanese'),
  t('Mixed Nuts', 'Official HIGE DANdism', '3:30', 'Party', 'Japanese'),
  t('Idol', 'YOASOBI', '3:33', 'Party', 'Japanese'),
  t('Racing Into The Night', 'YOASOBI', '4:18', 'Party', 'Japanese'),
  t('Zankyou Sanka', 'Aimer', '4:04', 'Party', 'Japanese'),
  t('Inferno', 'Mrs. GREEN APPLE', '3:44', 'Party', 'Japanese'),
  t('Bling-Bang-Bang-Born', 'Creepy Nuts', '2:53', 'Party', 'Japanese'),
  t('The Rumbling', 'SiM', '4:09', 'Party', 'Japanese'),
  t('Sorairo Days', 'Shoko Nakagawa', '4:00', 'Party', 'Japanese'),

  // ─── 💔 Japanese Heartbreak ───
  t('Crying for Rain', 'Minami', '4:16', 'Heartbreak', 'Japanese'),
  t('Uchiage Hanabi', 'DAOKO × Kenshi Yonezu', '4:49', 'Heartbreak', 'Japanese'),
  t('Sayonara Elegy', 'Masaki Suda', '4:24', 'Heartbreak', 'Japanese'),
  t('Flamme', 'BUMP OF CHICKEN', '4:27', 'Heartbreak', 'Japanese'),
  t('Charles', 'Balloon ft. Flower', '3:48', 'Heartbreak', 'Japanese'),

  // ─── 😌 Japanese Chill ───
  t('Plastic Love', 'Mariya Takeuchi', '4:52', 'Chill', 'Japanese'),
  t('Stay With Me', 'Miki Matsubara', '3:42', 'Chill', 'Japanese'),
  t('Midnight Pretenders', 'Tomoko Aran', '4:38', 'Chill', 'Japanese'),
  t("A Cruel Angel's Thesis", 'Yoko Takahashi', '4:06', 'Chill', 'Japanese'),
  t('Ride on Time', 'Tatsuro Yamashita', '5:08', 'Chill', 'Japanese'),
  t('September', 'Taeko Ohnuki', '4:15', 'Chill', 'Japanese'),

  // ─── 💪 Japanese Motivational ───
  t('Blue Bird', 'Ikimono-gakari', '3:36', 'Motivational', 'Japanese'),
  t('GO!!!', 'FLOW', '3:52', 'Motivational', 'Japanese'),
  t('Peace Sign', 'Kenshi Yonezu', '4:00', 'Motivational', 'Japanese'),
  t('Silhouette', 'KANA-BOON', '4:12', 'Motivational', 'Japanese'),
  t('Again', 'YUI', '4:13', 'Motivational', 'Japanese'),
  t('Bokurano', 'Eve', '3:45', 'Motivational', 'Japanese'),
];

// Build search index for fast lookups
const searchIndex = new Map<string, number[]>();

function buildSearchIndex() {
  MUSIC_LIBRARY.forEach((track, idx) => {
    const words = `${track.title} ${track.artist} ${track.language} ${track.mood}`.toLowerCase().split(/\s+/);
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
export function searchMusic(
  query: string,
  mood?: MoodCategory | '',
  language?: LanguageCategory | ''
): MusicTrack[] {
  let results: MusicTrack[];

  if (query.trim().length >= 2) {
    const terms = query.toLowerCase().trim().split(/\s+/);
    const firstPrefix = terms[0].substring(0, Math.min(terms[0].length, 6));
    const candidates = searchIndex.get(firstPrefix) || [];

    results = candidates
      .map(idx => MUSIC_LIBRARY[idx])
      .filter(track => {
        const searchable = `${track.title} ${track.artist}`.toLowerCase();
        return terms.every(term => searchable.includes(term));
      });
  } else {
    results = MUSIC_LIBRARY;
  }

  if (mood) results = results.filter(t => t.mood === mood);
  if (language) results = results.filter(t => t.language === language);

  return results;
}

export default MUSIC_LIBRARY;
