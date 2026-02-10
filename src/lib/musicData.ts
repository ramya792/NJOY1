export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  previewUrl: string;
  mood: MoodCategory;
}

export type MoodCategory = 'Love' | 'Sad' | 'Happy' | 'Party' | 'Chill' | 'Heartbreak' | 'Motivational' | 'Lonely';

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

// Fallback URL helper (SoundHelix instrumental - used only if iTunes API fails)
const getPreviewUrl = (n: number) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${((n - 1) % 16) + 1}.mp3`;

const MUSIC_LIBRARY: MusicTrack[] = [
  // ─── 💕 Love Songs ───
  { id: '1', title: 'Perfect', artist: 'Ed Sheeran', duration: '4:23', previewUrl: getPreviewUrl(1), mood: 'Love' },
  { id: '2', title: 'Thinking Out Loud', artist: 'Ed Sheeran', duration: '4:41', previewUrl: getPreviewUrl(2), mood: 'Love' },
  { id: '3', title: 'All of Me', artist: 'John Legend', duration: '4:29', previewUrl: getPreviewUrl(3), mood: 'Love' },
  { id: '4', title: 'Love Story', artist: 'Taylor Swift', duration: '3:56', previewUrl: getPreviewUrl(4), mood: 'Love' },
  { id: '5', title: 'Señorita', artist: 'Shawn Mendes & Camila Cabello', duration: '3:10', previewUrl: getPreviewUrl(5), mood: 'Love' },
  { id: '6', title: 'Peaches', artist: 'Justin Bieber', duration: '3:18', previewUrl: getPreviewUrl(6), mood: 'Love' },
  { id: '7', title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', duration: '2:21', previewUrl: getPreviewUrl(7), mood: 'Love' },
  { id: '8', title: 'Kiss Me More', artist: 'Doja Cat ft. SZA', duration: '3:28', previewUrl: getPreviewUrl(8), mood: 'Love' },
  { id: '9', title: 'Shivers', artist: 'Ed Sheeran', duration: '3:27', previewUrl: getPreviewUrl(9), mood: 'Love' },
  { id: '10', title: 'Shape of You', artist: 'Ed Sheeran', duration: '3:53', previewUrl: getPreviewUrl(10), mood: 'Love' },
  { id: '11', title: 'Earned It', artist: 'The Weeknd', duration: '4:37', previewUrl: getPreviewUrl(11), mood: 'Love' },
  { id: '12', title: 'Die For You', artist: 'The Weeknd', duration: '4:01', previewUrl: getPreviewUrl(12), mood: 'Love' },
  { id: '13', title: 'Snooze', artist: 'SZA', duration: '3:21', previewUrl: getPreviewUrl(13), mood: 'Love' },
  { id: '14', title: 'Leave The Door Open', artist: 'Silk Sonic', duration: '4:02', previewUrl: getPreviewUrl(14), mood: 'Love' },
  { id: '15', title: 'Essence', artist: 'Wizkid ft. Tems', duration: '4:09', previewUrl: getPreviewUrl(15), mood: 'Love' },
  { id: '16', title: 'Calm Down', artist: 'Rema & Selena Gomez', duration: '3:59', previewUrl: getPreviewUrl(16), mood: 'Love' },
  { id: '17', title: 'Cruel Summer', artist: 'Taylor Swift', duration: '2:58', previewUrl: getPreviewUrl(1), mood: 'Love' },
  { id: '18', title: 'Attention', artist: 'Charlie Puth', duration: '3:31', previewUrl: getPreviewUrl(2), mood: 'Love' },
  { id: '19', title: 'Closer', artist: 'The Chainsmokers ft. Halsey', duration: '4:04', previewUrl: getPreviewUrl(3), mood: 'Love' },
  { id: '20', title: 'Something Just Like This', artist: 'The Chainsmokers & Coldplay', duration: '4:07', previewUrl: getPreviewUrl(4), mood: 'Love' },
  { id: '21', title: 'One Kiss', artist: 'Calvin Harris & Dua Lipa', duration: '3:34', previewUrl: getPreviewUrl(5), mood: 'Love' },
  { id: '22', title: "Can't Feel My Face", artist: 'The Weeknd', duration: '3:33', previewUrl: getPreviewUrl(6), mood: 'Love' },
  { id: '23', title: 'Blank Space', artist: 'Taylor Swift', duration: '3:51', previewUrl: getPreviewUrl(7), mood: 'Love' },
  { id: '24', title: 'Positions', artist: 'Ariana Grande', duration: '2:52', previewUrl: getPreviewUrl(8), mood: 'Love' },
  { id: '25', title: "That's What I Like", artist: 'Bruno Mars', duration: '3:26', previewUrl: getPreviewUrl(9), mood: 'Love' },
  { id: '26', title: 'Dandelions', artist: 'Ruth B.', duration: '3:53', previewUrl: getPreviewUrl(10), mood: 'Love' },
  { id: '27', title: 'Espresso', artist: 'Sabrina Carpenter', duration: '2:55', previewUrl: getPreviewUrl(11), mood: 'Love' },
  { id: '28', title: 'Please Please Please', artist: 'Sabrina Carpenter', duration: '3:06', previewUrl: getPreviewUrl(12), mood: 'Love' },
  { id: '29', title: 'Beautiful Things', artist: 'Benson Boone', duration: '2:59', previewUrl: getPreviewUrl(13), mood: 'Love' },
  { id: '30', title: 'Greedy', artist: 'Tate McRae', duration: '2:31', previewUrl: getPreviewUrl(14), mood: 'Love' },
  { id: '31', title: 'Water', artist: 'Tyla', duration: '3:20', previewUrl: getPreviewUrl(15), mood: 'Love' },
  { id: '32', title: 'Lovin On Me', artist: 'Jack Harlow', duration: '2:18', previewUrl: getPreviewUrl(16), mood: 'Love' },
  { id: '33', title: 'Lose Control', artist: 'Teddy Swims', duration: '3:30', previewUrl: getPreviewUrl(1), mood: 'Love' },
  { id: '34', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', duration: '4:03', previewUrl: getPreviewUrl(2), mood: 'Love' },
  { id: '35', title: 'Love Nwantiti', artist: 'CKay', duration: '2:26', previewUrl: getPreviewUrl(3), mood: 'Love' },
  { id: '36', title: 'We Found Love', artist: 'Rihanna ft. Calvin Harris', duration: '3:35', previewUrl: getPreviewUrl(4), mood: 'Love' },
  { id: '37', title: 'Umbrella', artist: 'Rihanna ft. JAY-Z', duration: '4:36', previewUrl: getPreviewUrl(5), mood: 'Love' },
  { id: '38', title: 'Waiting For Love', artist: 'Avicii', duration: '3:50', previewUrl: getPreviewUrl(6), mood: 'Love' },
  { id: '39', title: 'Starving', artist: 'Hailee Steinfeld & Grey', duration: '3:01', previewUrl: getPreviewUrl(7), mood: 'Love' },
  { id: '40', title: 'Baby', artist: 'Justin Bieber ft. Ludacris', duration: '3:36', previewUrl: getPreviewUrl(8), mood: 'Love' },
  { id: '41', title: 'What Do You Mean?', artist: 'Justin Bieber', duration: '3:26', previewUrl: getPreviewUrl(9), mood: 'Love' },
  { id: '42', title: 'Havana', artist: 'Camila Cabello ft. Young Thug', duration: '3:37', previewUrl: getPreviewUrl(10), mood: 'Love' },
  { id: '43', title: 'Treat You Better', artist: 'Shawn Mendes', duration: '3:06', previewUrl: getPreviewUrl(11), mood: 'Love' },
  { id: '44', title: 'Photograph', artist: 'Ed Sheeran', duration: '4:19', previewUrl: getPreviewUrl(12), mood: 'Love' },
  { id: '45', title: 'Take Me To Church', artist: 'Hozier', duration: '4:01', previewUrl: getPreviewUrl(13), mood: 'Love' },
  { id: '46', title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee', duration: '3:47', previewUrl: getPreviewUrl(14), mood: 'Love' },
  { id: '47', title: 'Me Porto Bonito', artist: 'Bad Bunny & Chencho Corleone', duration: '2:58', previewUrl: getPreviewUrl(15), mood: 'Love' },
  { id: '48', title: 'Ojitos Lindos', artist: 'Bad Bunny & Bomba Estéreo', duration: '4:18', previewUrl: getPreviewUrl(16), mood: 'Love' },
  { id: '49', title: 'BESO', artist: 'ROSALÍA & Rauw Alejandro', duration: '3:24', previewUrl: getPreviewUrl(1), mood: 'Love' },
  { id: '50', title: 'Super Shy', artist: 'NewJeans', duration: '2:34', previewUrl: getPreviewUrl(2), mood: 'Love' },
  { id: '51', title: 'Love Dive', artist: 'IVE', duration: '3:04', previewUrl: getPreviewUrl(3), mood: 'Love' },
  { id: '52', title: "Sweet Child O' Mine", artist: "Guns N' Roses", duration: '5:56', previewUrl: getPreviewUrl(4), mood: 'Love' },

  // ─── 💕 Love - Bollywood/Indian ───
  { id: '53', title: 'Kesariya', artist: 'Arijit Singh', duration: '4:28', previewUrl: getPreviewUrl(5), mood: 'Love' },
  { id: '54', title: 'Raataan Lambiyan', artist: 'Jubin Nautiyal & Asees Kaur', duration: '3:49', previewUrl: getPreviewUrl(6), mood: 'Love' },
  { id: '55', title: 'Pasoori', artist: 'Ali Sethi & Shae Gill', duration: '3:52', previewUrl: getPreviewUrl(7), mood: 'Love' },
  { id: '56', title: 'Tum Hi Ho', artist: 'Arijit Singh', duration: '4:22', previewUrl: getPreviewUrl(8), mood: 'Love' },
  { id: '57', title: 'Apna Bana Le', artist: 'Arijit Singh', duration: '4:39', previewUrl: getPreviewUrl(9), mood: 'Love' },
  { id: '58', title: 'Chaleya', artist: 'Arijit Singh & Shilpa Rao', duration: '3:45', previewUrl: getPreviewUrl(10), mood: 'Love' },
  { id: '59', title: 'Tere Hawaale', artist: 'Arijit Singh & Shilpa Rao', duration: '4:46', previewUrl: getPreviewUrl(11), mood: 'Love' },
  { id: '60', title: 'Maan Meri Jaan', artist: 'King', duration: '3:15', previewUrl: getPreviewUrl(12), mood: 'Love' },
  { id: '61', title: 'Phir Aur Kya Chahiye', artist: 'Arijit Singh', duration: '4:38', previewUrl: getPreviewUrl(13), mood: 'Love' },
  { id: '62', title: 'Buttabomma', artist: 'Armaan Malik', duration: '3:20', previewUrl: getPreviewUrl(14), mood: 'Love' },
  { id: '63', title: 'Chuttamalle', artist: 'Arijit Singh & Shilpa Rao', duration: '3:38', previewUrl: getPreviewUrl(15), mood: 'Love' },
  { id: '64', title: 'Excuses', artist: 'AP Dhillon & Gurinder Gill', duration: '2:55', previewUrl: getPreviewUrl(16), mood: 'Love' },
  { id: '65', title: 'Lover', artist: 'Diljit Dosanjh', duration: '3:09', previewUrl: getPreviewUrl(1), mood: 'Love' },

  // ─── 😢 Sad Songs ───
  { id: '66', title: 'Someone Like You', artist: 'Adele', duration: '4:47', previewUrl: getPreviewUrl(2), mood: 'Sad' },
  { id: '67', title: 'Hello', artist: 'Adele', duration: '4:55', previewUrl: getPreviewUrl(3), mood: 'Sad' },
  { id: '68', title: 'Easy On Me', artist: 'Adele', duration: '3:44', previewUrl: getPreviewUrl(4), mood: 'Sad' },
  { id: '69', title: 'Let Her Go', artist: 'Passenger', duration: '4:12', previewUrl: getPreviewUrl(5), mood: 'Sad' },
  { id: '70', title: 'Save Your Tears', artist: 'The Weeknd', duration: '3:35', previewUrl: getPreviewUrl(6), mood: 'Sad' },
  { id: '71', title: 'Happier', artist: 'Marshmello & Bastille', duration: '3:34', previewUrl: getPreviewUrl(7), mood: 'Sad' },
  { id: '72', title: 'Glimpse of Us', artist: 'Joji', duration: '3:53', previewUrl: getPreviewUrl(8), mood: 'Sad' },
  { id: '73', title: 'Heather', artist: 'Conan Gray', duration: '3:18', previewUrl: getPreviewUrl(9), mood: 'Sad' },
  { id: '74', title: 'As It Was', artist: 'Harry Styles', duration: '2:47', previewUrl: getPreviewUrl(10), mood: 'Sad' },
  { id: '75', title: 'Anti-Hero', artist: 'Taylor Swift', duration: '3:20', previewUrl: getPreviewUrl(11), mood: 'Sad' },
  { id: '76', title: 'Wait For U', artist: 'Future ft. Drake & Tems', duration: '3:21', previewUrl: getPreviewUrl(12), mood: 'Sad' },
  { id: '77', title: 'Stressed Out', artist: 'Twenty One Pilots', duration: '3:22', previewUrl: getPreviewUrl(13), mood: 'Sad' },
  { id: '78', title: 'Sorry', artist: 'Justin Bieber', duration: '3:20', previewUrl: getPreviewUrl(14), mood: 'Sad' },
  { id: '79', title: "Thinkin Bout Me", artist: 'Morgan Wallen', duration: '2:58', previewUrl: getPreviewUrl(15), mood: 'Sad' },
  { id: '80', title: 'I Had Some Help', artist: 'Post Malone ft. Morgan Wallen', duration: '2:58', previewUrl: getPreviewUrl(16), mood: 'Sad' },
  { id: '81', title: 'Kahani Suno 2.0', artist: 'Kaifi Khalil', duration: '4:12', previewUrl: getPreviewUrl(1), mood: 'Sad' },
  { id: '82', title: 'Agar Tum Saath Ho', artist: 'Arijit Singh & Alka Yagnik', duration: '5:41', previewUrl: getPreviewUrl(2), mood: 'Sad' },
  { id: '83', title: 'O Bedardeya', artist: 'Arijit Singh', duration: '4:20', previewUrl: getPreviewUrl(3), mood: 'Sad' },
  { id: '84', title: 'Ella Baila Sola', artist: 'Eslabon Armado & Peso Pluma', duration: '2:43', previewUrl: getPreviewUrl(4), mood: 'Sad' },

  // ─── 🥲 Lonely / Feeling Alone ───
  { id: '85', title: 'Faded', artist: 'Alan Walker', duration: '3:32', previewUrl: getPreviewUrl(5), mood: 'Lonely' },
  { id: '86', title: 'Alone', artist: 'Marshmello', duration: '3:20', previewUrl: getPreviewUrl(6), mood: 'Lonely' },
  { id: '87', title: 'After Dark', artist: 'Mr.Kitty', duration: '4:31', previewUrl: getPreviewUrl(7), mood: 'Lonely' },
  { id: '88', title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', duration: '4:32', previewUrl: getPreviewUrl(8), mood: 'Lonely' },
  { id: '89', title: 'Sweater Weather', artist: 'The Neighbourhood', duration: '4:00', previewUrl: getPreviewUrl(9), mood: 'Lonely' },
  { id: '90', title: 'Heathens', artist: 'Twenty One Pilots', duration: '3:15', previewUrl: getPreviewUrl(10), mood: 'Lonely' },
  { id: '91', title: 'No Love', artist: 'Shubh', duration: '2:51', previewUrl: getPreviewUrl(11), mood: 'Lonely' },
  { id: '92', title: 'Snowfall', artist: 'Øneheart & reidenshi', duration: '1:38', previewUrl: getPreviewUrl(12), mood: 'Lonely' },
  { id: '93', title: 'Hotel California', artist: 'Eagles', duration: '6:30', previewUrl: getPreviewUrl(13), mood: 'Lonely' },

  // ─── 💔 Heartbreak ───
  { id: '94', title: 'Drivers License', artist: 'Olivia Rodrigo', duration: '4:02', previewUrl: getPreviewUrl(14), mood: 'Heartbreak' },
  { id: '95', title: 'Good 4 U', artist: 'Olivia Rodrigo', duration: '2:58', previewUrl: getPreviewUrl(15), mood: 'Heartbreak' },
  { id: '96', title: 'Vampire', artist: 'Olivia Rodrigo', duration: '3:39', previewUrl: getPreviewUrl(16), mood: 'Heartbreak' },
  { id: '97', title: 'Deja Vu', artist: 'Olivia Rodrigo', duration: '3:35', previewUrl: getPreviewUrl(1), mood: 'Heartbreak' },
  { id: '98', title: 'Kill Bill', artist: 'SZA', duration: '2:33', previewUrl: getPreviewUrl(2), mood: 'Heartbreak' },
  { id: '99', title: 'Smokin Out The Window', artist: 'Silk Sonic', duration: '3:21', previewUrl: getPreviewUrl(3), mood: 'Heartbreak' },
  { id: '100', title: 'Mr. Brightside', artist: 'The Killers', duration: '3:42', previewUrl: getPreviewUrl(4), mood: 'Heartbreak' },
  { id: '101', title: 'Somebody That I Used To Know', artist: 'Gotye', duration: '4:04', previewUrl: getPreviewUrl(5), mood: 'Heartbreak' },
  { id: '102', title: 'Rolling in the Deep', artist: 'Adele', duration: '3:48', previewUrl: getPreviewUrl(6), mood: 'Heartbreak' },
  { id: '103', title: 'Set Fire to the Rain', artist: 'Adele', duration: '4:02', previewUrl: getPreviewUrl(7), mood: 'Heartbreak' },
  { id: '104', title: 'Wrecking Ball', artist: 'Miley Cyrus', duration: '3:41', previewUrl: getPreviewUrl(8), mood: 'Heartbreak' },
  { id: '105', title: 'Love Yourself', artist: 'Justin Bieber', duration: '3:53', previewUrl: getPreviewUrl(9), mood: 'Heartbreak' },
  { id: '106', title: 'Stitches', artist: 'Shawn Mendes', duration: '3:26', previewUrl: getPreviewUrl(10), mood: 'Heartbreak' },
  { id: '107', title: 'Last Last', artist: 'Burna Boy', duration: '4:12', previewUrl: getPreviewUrl(11), mood: 'Heartbreak' },
  { id: '108', title: 'Why This Kolaveri Di', artist: 'Dhanush', duration: '3:36', previewUrl: getPreviewUrl(12), mood: 'Heartbreak' },
  { id: '109', title: 'Bzrp Music Sessions 53', artist: 'Bizarrap & Shakira', duration: '3:30', previewUrl: getPreviewUrl(13), mood: 'Heartbreak' },

  // ─── 😊 Happy / Feel Good ───
  { id: '110', title: 'Levitating', artist: 'Dua Lipa', duration: '3:23', previewUrl: getPreviewUrl(14), mood: 'Happy' },
  { id: '111', title: 'Butter', artist: 'BTS', duration: '2:44', previewUrl: getPreviewUrl(15), mood: 'Happy' },
  { id: '112', title: 'Dynamite', artist: 'BTS', duration: '3:19', previewUrl: getPreviewUrl(16), mood: 'Happy' },
  { id: '113', title: 'Watermelon Sugar', artist: 'Harry Styles', duration: '2:54', previewUrl: getPreviewUrl(1), mood: 'Happy' },
  { id: '114', title: 'Shake It Off', artist: 'Taylor Swift', duration: '3:39', previewUrl: getPreviewUrl(2), mood: 'Happy' },
  { id: '115', title: "Don't Start Now", artist: 'Dua Lipa', duration: '3:03', previewUrl: getPreviewUrl(3), mood: 'Happy' },
  { id: '116', title: 'Say So', artist: 'Doja Cat', duration: '3:57', previewUrl: getPreviewUrl(4), mood: 'Happy' },
  { id: '117', title: 'About Damn Time', artist: 'Lizzo', duration: '3:13', previewUrl: getPreviewUrl(5), mood: 'Happy' },
  { id: '118', title: "We Don't Talk About Bruno", artist: 'Encanto Cast', duration: '3:30', previewUrl: getPreviewUrl(6), mood: 'Happy' },
  { id: '119', title: "I Ain't Worried", artist: 'OneRepublic', duration: '2:28', previewUrl: getPreviewUrl(7), mood: 'Happy' },
  { id: '120', title: 'Sunflower', artist: 'Post Malone & Swae Lee', duration: '2:38', previewUrl: getPreviewUrl(8), mood: 'Happy' },
  { id: '121', title: 'Head & Heart', artist: 'Joel Corry ft. MNEK', duration: '2:44', previewUrl: getPreviewUrl(9), mood: 'Happy' },
  { id: '122', title: 'OMG', artist: 'NewJeans', duration: '3:31', previewUrl: getPreviewUrl(10), mood: 'Happy' },
  { id: '123', title: 'VERY NICE', artist: 'SEVENTEEN', duration: '3:25', previewUrl: getPreviewUrl(11), mood: 'Happy' },
  { id: '124', title: 'Peru', artist: 'Fireboy DML', duration: '2:38', previewUrl: getPreviewUrl(12), mood: 'Happy' },
  { id: '125', title: 'Rush', artist: 'Ayra Starr', duration: '2:42', previewUrl: getPreviewUrl(13), mood: 'Happy' },
  { id: '126', title: 'Feather', artist: 'Sabrina Carpenter', duration: '3:05', previewUrl: getPreviewUrl(14), mood: 'Happy' },
  { id: '127', title: 'Mood', artist: '24kGoldn ft. iann dior', duration: '2:20', previewUrl: getPreviewUrl(15), mood: 'Happy' },
  { id: '128', title: 'Naatu Naatu', artist: 'Rahul Sipligunj & Kaala Bhairava', duration: '3:22', previewUrl: getPreviewUrl(16), mood: 'Happy' },

  // ─── 🎉 Party / High Energy ───
  { id: '129', title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20', previewUrl: getPreviewUrl(1), mood: 'Party' },
  { id: '130', title: 'Montero', artist: 'Lil Nas X', duration: '2:17', previewUrl: getPreviewUrl(2), mood: 'Party' },
  { id: '131', title: 'Industry Baby', artist: 'Lil Nas X', duration: '3:32', previewUrl: getPreviewUrl(3), mood: 'Party' },
  { id: '132', title: 'Bad Habits', artist: 'Ed Sheeran', duration: '3:50', previewUrl: getPreviewUrl(4), mood: 'Party' },
  { id: '133', title: 'Unholy', artist: 'Sam Smith & Kim Petras', duration: '2:36', previewUrl: getPreviewUrl(5), mood: 'Party' },
  { id: '134', title: "God's Plan", artist: 'Drake', duration: '3:18', previewUrl: getPreviewUrl(6), mood: 'Party' },
  { id: '135', title: 'Sicko Mode', artist: 'Travis Scott', duration: '5:12', previewUrl: getPreviewUrl(7), mood: 'Party' },
  { id: '136', title: 'Rockstar', artist: 'Post Malone ft. 21 Savage', duration: '3:38', previewUrl: getPreviewUrl(8), mood: 'Party' },
  { id: '137', title: 'HUMBLE.', artist: 'Kendrick Lamar', duration: '2:57', previewUrl: getPreviewUrl(9), mood: 'Party' },
  { id: '138', title: 'Rich Flex', artist: 'Drake & 21 Savage', duration: '3:59', previewUrl: getPreviewUrl(10), mood: 'Party' },
  { id: '139', title: 'First Class', artist: 'Jack Harlow', duration: '2:54', previewUrl: getPreviewUrl(11), mood: 'Party' },
  { id: '140', title: 'Super Gremlin', artist: 'Kodak Black', duration: '3:09', previewUrl: getPreviewUrl(12), mood: 'Party' },
  { id: '141', title: 'Dákiti', artist: 'Bad Bunny & Jhay Cortez', duration: '3:25', previewUrl: getPreviewUrl(13), mood: 'Party' },
  { id: '142', title: 'Tití Me Preguntó', artist: 'Bad Bunny', duration: '4:03', previewUrl: getPreviewUrl(14), mood: 'Party' },
  { id: '143', title: 'Pepas', artist: 'Farruko', duration: '4:45', previewUrl: getPreviewUrl(15), mood: 'Party' },
  { id: '144', title: 'La Bebe', artist: 'Yng Lvcas & Peso Pluma', duration: '3:33', previewUrl: getPreviewUrl(16), mood: 'Party' },
  { id: '145', title: 'How You Like That', artist: 'BLACKPINK', duration: '3:01', previewUrl: getPreviewUrl(1), mood: 'Party' },
  { id: '146', title: 'Pink Venom', artist: 'BLACKPINK', duration: '3:07', previewUrl: getPreviewUrl(2), mood: 'Party' },
  { id: '147', title: 'Next Level', artist: 'aespa', duration: '3:42', previewUrl: getPreviewUrl(3), mood: 'Party' },
  { id: '148', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', duration: '4:30', previewUrl: getPreviewUrl(4), mood: 'Party' },
  { id: '149', title: '24K Magic', artist: 'Bruno Mars', duration: '3:46', previewUrl: getPreviewUrl(5), mood: 'Party' },
  { id: '150', title: 'Starboy', artist: 'The Weeknd ft. Daft Punk', duration: '3:50', previewUrl: getPreviewUrl(6), mood: 'Party' },
  { id: '151', title: '7 Rings', artist: 'Ariana Grande', duration: '2:58', previewUrl: getPreviewUrl(7), mood: 'Party' },
  { id: '152', title: 'Rain On Me', artist: 'Lady Gaga & Ariana Grande', duration: '3:02', previewUrl: getPreviewUrl(8), mood: 'Party' },
  { id: '153', title: 'Physical', artist: 'Dua Lipa', duration: '3:13', previewUrl: getPreviewUrl(9), mood: 'Party' },
  { id: '154', title: 'Break My Soul', artist: 'Beyoncé', duration: '4:38', previewUrl: getPreviewUrl(10), mood: 'Party' },
  { id: '155', title: 'CUFF IT', artist: 'Beyoncé', duration: '3:45', previewUrl: getPreviewUrl(11), mood: 'Party' },
  { id: '156', title: 'Lean On', artist: 'Major Lazer & DJ Snake', duration: '2:56', previewUrl: getPreviewUrl(12), mood: 'Party' },
  { id: '157', title: 'Roses', artist: 'SAINt JHN (Imanbek Remix)', duration: '2:50', previewUrl: getPreviewUrl(13), mood: 'Party' },
  { id: '158', title: 'Cheap Thrills', artist: 'Sia', duration: '3:31', previewUrl: getPreviewUrl(14), mood: 'Party' },
  { id: '159', title: 'This Is What You Came For', artist: 'Calvin Harris ft. Rihanna', duration: '3:23', previewUrl: getPreviewUrl(15), mood: 'Party' },
  { id: '160', title: "Don't Stop The Music", artist: 'Rihanna', duration: '4:27', previewUrl: getPreviewUrl(16), mood: 'Party' },
  { id: '161', title: 'Levels', artist: 'Avicii', duration: '3:18', previewUrl: getPreviewUrl(1), mood: 'Party' },
  { id: '162', title: 'Not Like Us', artist: 'Kendrick Lamar', duration: '4:33', previewUrl: getPreviewUrl(2), mood: 'Party' },
  { id: '163', title: 'A Bar Song (Tipsy)', artist: 'Shaboozey', duration: '3:17', previewUrl: getPreviewUrl(3), mood: 'Party' },
  { id: '164', title: 'Million Dollar Baby', artist: 'Tommy Richman', duration: '2:13', previewUrl: getPreviewUrl(4), mood: 'Party' },
  { id: '165', title: 'Billie Jean', artist: 'Michael Jackson', duration: '4:54', previewUrl: getPreviewUrl(5), mood: 'Party' },
  { id: '166', title: 'Dark Horse', artist: 'Katy Perry', duration: '3:35', previewUrl: getPreviewUrl(6), mood: 'Party' },
  { id: '167', title: 'Oo Antava', artist: 'Indravathi Chauhan', duration: '3:18', previewUrl: getPreviewUrl(7), mood: 'Party' },
  { id: '168', title: 'Saami Saami', artist: 'Mounika Yadav', duration: '3:41', previewUrl: getPreviewUrl(8), mood: 'Party' },
  { id: '169', title: 'Ranjithame', artist: 'Anirudh Ravichander', duration: '3:56', previewUrl: getPreviewUrl(9), mood: 'Party' },
  { id: '170', title: 'Arabic Kuthu', artist: 'Anirudh Ravichander', duration: '4:34', previewUrl: getPreviewUrl(10), mood: 'Party' },
  { id: '171', title: 'Vaathi Coming', artist: 'Anirudh Ravichander', duration: '3:22', previewUrl: getPreviewUrl(11), mood: 'Party' },
  { id: '172', title: 'Kaavaalaa', artist: 'Anirudh Ravichander', duration: '4:07', previewUrl: getPreviewUrl(12), mood: 'Party' },
  { id: '173', title: 'Naa Ready', artist: 'Anirudh Ravichander', duration: '3:25', previewUrl: getPreviewUrl(13), mood: 'Party' },
  { id: '174', title: 'Brown Munde', artist: 'AP Dhillon', duration: '3:29', previewUrl: getPreviewUrl(14), mood: 'Party' },
  { id: '175', title: 'Loaded', artist: 'Tiwa Savage', duration: '3:22', previewUrl: getPreviewUrl(15), mood: 'Party' },
  { id: '176', title: 'Jhoome Jo Pathaan', artist: 'Arijit Singh', duration: '3:38', previewUrl: getPreviewUrl(16), mood: 'Party' },
  { id: '177', title: 'Besharam Rang', artist: 'Shilpa Rao & Caralisa Monteiro', duration: '3:41', previewUrl: getPreviewUrl(1), mood: 'Party' },
  { id: '178', title: 'Circo Loco', artist: 'Drake & 21 Savage', duration: '3:55', previewUrl: getPreviewUrl(2), mood: 'Party' },

  // ─── 😌 Chill / Vibes ───
  { id: '179', title: 'Heat Waves', artist: 'Glass Animals', duration: '3:58', previewUrl: getPreviewUrl(3), mood: 'Chill' },
  { id: '180', title: 'Bones', artist: 'Imagine Dragons', duration: '2:45', previewUrl: getPreviewUrl(4), mood: 'Chill' },
  { id: '181', title: 'New Rules', artist: 'Dua Lipa', duration: '3:29', previewUrl: getPreviewUrl(5), mood: 'Chill' },
  { id: '182', title: 'Paint The Town Red', artist: 'Doja Cat', duration: '3:52', previewUrl: getPreviewUrl(6), mood: 'Chill' },

  // ─── 💪 Motivational / Inspirational ───
  { id: '183', title: 'Believer', artist: 'Imagine Dragons', duration: '3:24', previewUrl: getPreviewUrl(7), mood: 'Motivational' },
  { id: '184', title: 'Thunder', artist: 'Imagine Dragons', duration: '3:07', previewUrl: getPreviewUrl(8), mood: 'Motivational' },
  { id: '185', title: 'Enemy', artist: 'Imagine Dragons', duration: '2:53', previewUrl: getPreviewUrl(9), mood: 'Motivational' },
  { id: '186', title: 'Radioactive', artist: 'Imagine Dragons', duration: '3:06', previewUrl: getPreviewUrl(10), mood: 'Motivational' },
  { id: '187', title: 'Counting Stars', artist: 'OneRepublic', duration: '4:17', previewUrl: getPreviewUrl(11), mood: 'Motivational' },
  { id: '188', title: 'Flowers', artist: 'Miley Cyrus', duration: '3:20', previewUrl: getPreviewUrl(12), mood: 'Motivational' },
  { id: '189', title: 'Thank U, Next', artist: 'Ariana Grande', duration: '3:27', previewUrl: getPreviewUrl(13), mood: 'Motivational' },
  { id: '190', title: 'Karma', artist: 'Taylor Swift', duration: '3:24', previewUrl: getPreviewUrl(14), mood: 'Motivational' },
  { id: '191', title: 'Titanium', artist: 'David Guetta ft. Sia', duration: '4:05', previewUrl: getPreviewUrl(15), mood: 'Motivational' },
  { id: '192', title: 'Roar', artist: 'Katy Perry', duration: '3:43', previewUrl: getPreviewUrl(16), mood: 'Motivational' },
  { id: '193', title: 'Chandelier', artist: 'Sia', duration: '3:36', previewUrl: getPreviewUrl(1), mood: 'Motivational' },
  { id: '194', title: 'Bohemian Rhapsody', artist: 'Queen', duration: '5:55', previewUrl: getPreviewUrl(2), mood: 'Motivational' },
  { id: '195', title: "Don't Stop Believin'", artist: 'Journey', duration: '4:11', previewUrl: getPreviewUrl(3), mood: 'Motivational' },
  { id: '196', title: 'Wake Me Up', artist: 'Avicii', duration: '4:07', previewUrl: getPreviewUrl(4), mood: 'Motivational' },
  { id: '197', title: 'The Nights', artist: 'Avicii', duration: '2:56', previewUrl: getPreviewUrl(5), mood: 'Motivational' },
  { id: '198', title: 'LALISA', artist: 'LISA', duration: '3:27', previewUrl: getPreviewUrl(6), mood: 'Motivational' },
  { id: '199', title: 'ANTIFRAGILE', artist: 'LE SSERAFIM', duration: '3:15', previewUrl: getPreviewUrl(7), mood: 'Motivational' },
  { id: '200', title: 'Born To Shine', artist: 'Diljit Dosanjh', duration: '3:55', previewUrl: getPreviewUrl(8), mood: 'Motivational' },
];

export default MUSIC_LIBRARY;
