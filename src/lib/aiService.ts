// AI Service for Meta AI chat functionality
// Smart response system with Gemini API integration

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''; 

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

// Comprehensive knowledge base for offline/fallback answers
const KNOWLEDGE_BASE: Record<string, string> = {
  // ========== WORLD LEADERS & POLITICS ==========
  'usa_government': "The United States has a President, not a Prime Minister. The head of state and government is the President.\n\nThe US government has three branches:\n• Executive (President)\n• Legislative (Congress: Senate & House of Representatives)\n• Judicial (Supreme Court)\n\nThe USA is a federal republic with 50 states.",
  'usa_president': "As of 2025, the President of the United States is Donald Trump (47th President). He took office on January 20, 2025, representing the Republican Party.\n\nThe US uses a presidential system — the President serves as both head of state and head of government. There is no Prime Minister in the USA.",
  'india_pm': "As of 2026, Narendra Modi is the Prime Minister of India. He has been serving since May 2014, representing the Bharatiya Janata Party (BJP). He is currently in his third term as PM.\n\nIndia is a parliamentary democracy with both a President (ceremonial) and Prime Minister (head of government).",
  'uk_pm': "As of 2025, the Prime Minister of the United Kingdom is Keir Starmer. He took office on July 5, 2024, representing the Labour Party.\n\nThe UK is a constitutional monarchy where the Prime Minister is the head of government, while the monarch (King Charles III) is the head of state.",
  'canada_pm': "As of 2025, the Prime Minister of Canada is Mark Carney. He became PM after Justin Trudeau resigned as Liberal Party leader.\n\nCanada is a parliamentary democracy and constitutional monarchy.",
  'china_leader': "Xi Jinping is the President of China and General Secretary of the Chinese Communist Party. He has been in power since 2012 and is one of the most powerful leaders in the world.\n\nChina's official name is the People's Republic of China.",
  'russia_leader': "Vladimir Putin is the President of Russia. He has been a dominant figure in Russian politics since 1999, serving as either President or Prime Minister.\n\nRussia is officially the Russian Federation.",
  'france_leader': "As of 2025, the President of France is Emmanuel Macron. He has been serving since May 2017.\n\nFrance is a semi-presidential republic where the President is the head of state and appoints the Prime Minister.",
  'germany_leader': "As of 2025, the Chancellor of Germany is Friedrich Merz (CDU). Germany uses a parliamentary system where the Chancellor is the head of government.\n\nThe President of Germany is a largely ceremonial role.",
  'japan_leader': "As of 2025, the Prime Minister of Japan is Shigeru Ishiba (LDP). Japan is a constitutional monarchy with the Emperor as ceremonial head of state.\n\nThe Prime Minister is the head of government.",

  // ========== COUNTRIES ==========
  'usa': "The United States of America (USA) is a country in North America. Key facts:\n\n• Capital: Washington, D.C.\n• Population: ~335 million\n• 50 states\n• President: Head of state & government\n• Largest economy in the world\n• Currency: US Dollar (USD)\n• Famous for: Hollywood, Silicon Valley, NASA, diverse culture\n\nThe USA is the world's third-largest country by area.",
  'uk': "The United Kingdom (UK) consists of England, Scotland, Wales, and Northern Ireland. Key facts:\n\n• Capital: London\n• Population: ~67 million\n• Constitutional monarchy\n• King Charles III (head of state)\n• Currency: British Pound (GBP)\n• Famous for: Big Ben, Shakespeare, The Beatles, Premier League",
  'china': "China (People's Republic of China) is the world's most populous country. Key facts:\n\n• Capital: Beijing\n• Population: ~1.4 billion\n• Second largest economy\n• Great Wall of China\n• Currency: Chinese Yuan (CNY)\n• Famous for: Ancient civilization, technology manufacturing, martial arts",
  'japan': "Japan is an island nation in East Asia. Key facts:\n\n• Capital: Tokyo\n• Population: ~125 million\n• Third largest economy\n• Constitutional monarchy\n• Currency: Japanese Yen (JPY)\n• Famous for: Technology, anime, sushi, samurai culture, bullet trains",
  'australia': "Australia is both a country and a continent. Key facts:\n\n• Capital: Canberra (largest city: Sydney)\n• Population: ~26 million\n• Currency: Australian Dollar (AUD)\n• Famous for: Great Barrier Reef, kangaroos, Sydney Opera House\n• Unique wildlife found nowhere else on Earth",
  'brazil': "Brazil is the largest country in South America. Key facts:\n\n• Capital: Brasília (largest city: São Paulo)\n• Population: ~215 million\n• Currency: Brazilian Real (BRL)\n• Famous for: Amazon Rainforest, Carnival, football (soccer), Christ the Redeemer",

  // ========== SCIENCE ==========
  'solar_system': "Our solar system consists of:\n\n• The Sun (a star at the center)\n• 8 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune\n• Dwarf planets (like Pluto)\n• Moons, asteroids, and comets\n\nThe solar system is about 4.6 billion years old and is located in the Milky Way galaxy.",
  'planets': "The 8 planets of our solar system (in order from the Sun):\n\n1. Mercury - Smallest, closest to Sun\n2. Venus - Hottest planet\n3. Earth - Our home, has liquid water\n4. Mars - The Red Planet\n5. Jupiter - Largest planet\n6. Saturn - Famous for its rings\n7. Uranus - Tilted on its side\n8. Neptune - Furthest from Sun\n\nPluto was reclassified as a dwarf planet in 2006.",
  'moon': "The Moon is Earth's only natural satellite. Facts:\n\n• Distance from Earth: ~384,400 km\n• Diameter: ~3,474 km (about 1/4 of Earth)\n• No atmosphere\n• Has phases (new, crescent, half, full)\n• Affects Earth's tides\n• First humans landed in 1969 (Apollo 11, Neil Armstrong)\n• Takes 27.3 days to orbit Earth",
  'earth': "Earth is the third planet from the Sun and the only known planet with life. Facts:\n\n• Age: ~4.5 billion years\n• Diameter: ~12,742 km\n• 71% covered by water\n• Atmosphere: 78% nitrogen, 21% oxygen\n• One moon\n• Rotation: 24 hours (one day)\n• Orbit: 365.25 days (one year)\n\nEarth is in the 'habitable zone' — the perfect distance from the Sun for liquid water.",
  'photosynthesis': "Photosynthesis is the process by which plants make food using sunlight. The equation:\n\n6CO₂ + 6H₂O + sunlight → C₆H₁₂O₆ + 6O₂\n\n• Plants absorb carbon dioxide and water\n• Sunlight provides energy\n• Chlorophyll (in leaves) captures light\n• Produces glucose (food) and oxygen\n\nPhotosynthesis is essential for life — it produces the oxygen we breathe!",
  'dna': "DNA (Deoxyribonucleic Acid) is the molecule that carries genetic information. Facts:\n\n• Found in every cell of your body\n• Double helix shape (discovered by Watson & Crick, 1953)\n• Made of 4 bases: Adenine, Thymine, Guanine, Cytosine\n• Contains genes — instructions for building proteins\n• Humans share 99.9% of DNA with each other\n• About 3 billion base pairs in human DNA\n\nDNA makes you unique!",
  'evolution': "Evolution is the process by which living organisms change over generations. Key concepts:\n\n• Natural selection (survival of the fittest)\n• Proposed by Charles Darwin in 1859\n• Species adapt to their environment\n• Genetic mutations create variation\n• Takes millions of years\n• All life shares common ancestors\n\nEvolution is supported by fossil records, DNA evidence, and observable changes in species.",
  'atom': "An atom is the smallest unit of matter. Structure:\n\n• Protons (positive charge, in nucleus)\n• Neutrons (no charge, in nucleus)\n• Electrons (negative charge, orbit nucleus)\n\nFacts:\n• Everything is made of atoms\n• Over 100 types (elements)\n• Most of an atom is empty space\n• Atoms bond to form molecules\n• Example: Water (H₂O) = 2 hydrogen atoms + 1 oxygen atom",
  'electricity': "Electricity is the flow of electric charge (electrons). Types:\n\n• Static electricity (built-up charge)\n• Current electricity (flowing charge)\n\nKey concepts:\n• Voltage (pressure pushing electrons)\n• Current (flow rate, measured in Amps)\n• Resistance (opposition to flow, measured in Ohms)\n• Ohm's Law: V = I × R\n\nElectricity powers our modern world — lights, computers, phones, and more!",

  // ========== MATH ==========
  'pi': "Pi (π) is a mathematical constant — the ratio of a circle's circumference to its diameter.\n\n• Value: 3.14159265358979...\n• It's irrational (never-ending, non-repeating)\n• Used in geometry, trigonometry, physics\n• Area of circle = πr²\n• Circumference = 2πr\n• Pi Day: March 14 (3/14)\n\nPi has been calculated to over 100 trillion digits!",
  'pythagoras': "The Pythagorean Theorem is a fundamental formula in geometry:\n\na² + b² = c²\n\nWhere:\n• a and b are the two shorter sides of a right triangle\n• c is the hypotenuse (longest side)\n\nExample: If a = 3 and b = 4, then c = √(9 + 16) = √25 = 5\n\nDiscovered by the Greek mathematician Pythagoras (~570 BC).",

  // ========== HISTORY ==========
  'world_war_1': "World War I (1914-1918) — also called 'The Great War':\n\n• Triggered by assassination of Archduke Franz Ferdinand\n• Allied Powers vs Central Powers\n• Over 20 million deaths\n• Introduced trench warfare, tanks, chemical weapons\n• Treaty of Versailles ended the war\n• Led to the fall of several empires (Ottoman, Austro-Hungarian, Russian, German)\n\nWWI reshaped the world map and set the stage for WWII.",
  'world_war_2': "World War II (1939-1945) — the deadliest conflict in history:\n\n• Started with Germany's invasion of Poland\n• Axis Powers (Germany, Japan, Italy) vs Allied Powers (USA, UK, USSR, France)\n• Holocaust: 6 million Jews killed\n• ~70-85 million total deaths\n• Atomic bombs dropped on Hiroshima & Nagasaki\n• Led to the United Nations, Cold War\n• Ended with Allied victory",
  'moon_landing': "The Apollo 11 Moon Landing (July 20, 1969):\n\n• First humans to walk on the Moon\n• Neil Armstrong: 'That's one small step for man, one giant leap for mankind'\n• Crew: Neil Armstrong, Buzz Aldrin, Michael Collins\n• Mission lasted 8 days\n• Part of NASA's Apollo program\n• USA won the 'Space Race' against the Soviet Union\n\n12 people total have walked on the Moon (all American, all between 1969-1972).",

  // ========== SPORTS ==========
  'cricket': "Cricket is a bat-and-ball sport popular worldwide, especially in South Asia, UK, and Australia.\n\n• Two teams of 11 players\n• Formats: Test (5 days), ODI (50 overs), T20 (20 overs)\n• ICC Cricket World Cup is the biggest tournament\n• Popular countries: India, Australia, England, Pakistan, South Africa\n• Key terms: Wickets, runs, overs, boundaries",
  'football_soccer': "Football (Soccer) is the world's most popular sport!\n\n• 11 players per team\n• Played on a rectangular field\n• Goal: Score by kicking ball into net\n• FIFA World Cup: Biggest tournament (every 4 years)\n• Top leagues: Premier League, La Liga, Serie A, Bundesliga\n• Famous players: Messi, Ronaldo, Pelé, Maradona\n\nOver 4 billion fans worldwide!",
  'olympics': "The Olympic Games are the world's biggest sporting event:\n\n• Held every 4 years (Summer & Winter)\n• Athletes from ~200 countries compete\n• Ancient origins in Greece (~776 BC)\n• Modern Olympics started in 1896\n• Hundreds of events across dozens of sports\n• Olympic motto: 'Faster, Higher, Stronger – Together'\n\nThe next Summer Olympics will decide new venues for future years.",

  // ========== SOCIAL MEDIA ==========
  'social_media': "Social media refers to online platforms and applications that enable people to create, share content, and interact with each other. Key aspects:\n\n• Connect with friends and family\n• Share photos, videos, thoughts\n• Create communities and groups\n• Follow interests and trends\n• Real-time communication\n• Build personal or business brands\n\nPopular platforms: Facebook, Instagram, Twitter/X, TikTok, YouTube, WhatsApp, Snapchat.\n\nBenefits: Stay connected, share experiences, learn, entertainment\nChallenges: Privacy concerns, misinformation, screen time\n\nSocial media has transformed how we communicate in the 21st century!",
  'instagram': "Instagram is a popular social media platform owned by Meta. Key features:\n\n• Share photos and videos\n• Stories (24-hour content)\n• Reels (short videos)\n• Direct messaging\n• Follow friends and creators\n• Explore trending content\n\nIt has over 2 billion users worldwide and is focused on visual content sharing.",
  'facebook': "Facebook is the world's largest social network with over 3 billion users! Created by Mark Zuckerberg in 2004. Features:\n\n• Posts, photos, and videos\n• Groups and pages\n• Marketplace\n• Messenger chat\n• Events and more\n\nIt's now part of Meta, which also owns Instagram and WhatsApp.",
  'whatsapp': "WhatsApp is a free messaging app owned by Meta. Key features:\n\n• Text, voice, and video calls\n• Group chats (up to 1024 people)\n• End-to-end encryption\n• File and media sharing\n• Status updates\n• Available on phones and computers\n\nOne of the most popular messaging apps globally with over 2 billion users.",
  'twitter': "Twitter (now called X) is a social media platform for short messages called tweets. Features:\n\n• Post text, images, videos\n• Follow people and topics\n• Trending topics\n• Direct messages\n• Spaces (audio conversations)\n\nOwned by Elon Musk since 2022. Known for real-time news and public conversations.",
  'youtube': "YouTube is the world's largest video-sharing platform, owned by Google. Facts:\n\n• Over 2.7 billion users\n• Upload and watch videos\n• Live streaming\n• YouTube Shorts (short videos)\n• Creators can monetize content\n• Everything from education to entertainment\n\nIt's the second most visited website after Google!",
  'tiktok': "TikTok is a short-form video app popular with younger audiences. Features:\n\n• 15-second to 10-minute videos\n• Music, dancing, comedy, tutorials\n• AI-powered 'For You' feed\n• Duets and stitches\n• Live streaming\n\nOver 1 billion users, known for viral trends and challenges!",

  // ========== FAMOUS PEOPLE ==========
  'elon_musk': "Elon Musk is a business magnate and entrepreneur. Key facts:\n\n• CEO of Tesla (electric vehicles)\n• CEO of SpaceX (space exploration)\n• Owner of X (formerly Twitter)\n• Neuralink (brain-computer interfaces)\n• The Boring Company (tunnels)\n• Born in South Africa, 1971\n• One of the wealthiest people in the world\n\nKnown for his ambitious goals including colonizing Mars.",
  'albert_einstein': "Albert Einstein (1879-1955) was a theoretical physicist, widely regarded as one of the greatest scientists ever.\n\n• Famous equation: E = mc²\n• Theory of General Relativity\n• Nobel Prize in Physics (1921)\n• Born in Germany, later moved to the USA\n• Revolutionized our understanding of space, time, and gravity\n\nHis work laid the foundation for modern physics.",
  'mahatma_gandhi': "Mahatma Gandhi (1869-1948) was the leader of India's independence movement.\n\n• Led nonviolent resistance (Satyagraha)\n• Known as 'Father of the Nation' in India\n• Key events: Salt March, Quit India Movement\n• Advocated for civil rights, peace, and simplicity\n• Assassinated on January 30, 1948\n• Inspired leaders like Martin Luther King Jr. and Nelson Mandela\n\nHis philosophy of nonviolence influenced movements worldwide.",
  'bill_gates': "Bill Gates (born 1955) is an American business magnate and philanthropist.\n\n• Co-founded Microsoft in 1975\n• Made PC computing accessible worldwide\n• Was the world's richest person for many years\n• Bill & Melinda Gates Foundation (one of the largest charities)\n• Focus on global health, education, poverty\n• Author of several books\n\nMicrosoft Windows and Office changed how the world uses computers.",
  'steve_jobs': "Steve Jobs (1955-2011) was the co-founder of Apple Inc.\n\n• Created the Macintosh, iPod, iPhone, iPad\n• Co-founded Pixar Animation Studios\n• Known for innovation and design excellence\n• 'Stay hungry, stay foolish' — his famous quote\n• Revolutionized personal computing, music, and smartphones\n• Died of pancreatic cancer at age 56\n\nHe is considered one of the greatest innovators of the modern era.",
  'mark_zuckerberg': "Mark Zuckerberg (born 1984) is the co-founder and CEO of Meta (formerly Facebook).\n\n• Created Facebook in 2004 at Harvard\n• Meta owns Facebook, Instagram, WhatsApp, and Threads\n• One of the youngest billionaires ever\n• Focuses on virtual/augmented reality (Meta Quest)\n• Philanthropist through the Chan Zuckerberg Initiative\n\nFacebook has over 3 billion users worldwide.",

  // ========== TECHNOLOGY ==========
  'computer': "A computer is an electronic device that processes data and performs tasks. Key components:\n\n• CPU (processor - the 'brain')\n• RAM (memory for running programs)\n• Storage (hard drive or SSD)\n• Input devices (keyboard, mouse)\n• Output devices (monitor, speakers)\n\nComputers run on operating systems like Windows, macOS, or Linux.",
  'internet': "The Internet is a global network connecting billions of computers and devices.\n\n• Connects through cables, satellites, and wireless signals\n• Enables communication, information sharing, entertainment\n• Uses protocols like HTTP, TCP/IP\n• Accessed via browsers and apps\n\nThe World Wide Web (WWW) is the system of websites you browse. WiFi is wireless internet connection!",
  'blockchain': "Blockchain is a distributed, decentralized digital ledger technology.\n\n• Records transactions across many computers\n• Extremely secure and tamper-proof\n• Powers cryptocurrencies like Bitcoin and Ethereum\n• Used in supply chain, healthcare, voting\n• Each 'block' is linked to the previous one\n\nBlockchain enables trustless transactions without intermediaries.",
  'cryptocurrency': "Cryptocurrency is digital currency that uses cryptography for security.\n\n• Bitcoin: First and most famous (created 2009 by Satoshi Nakamoto)\n• Ethereum: Programmable blockchain with smart contracts\n• Decentralized — no central bank or government controls it\n• Blockchain technology ensures security\n• Volatile prices\n• Used for investing, payments, DeFi\n\nThere are thousands of cryptocurrencies in existence.",

  // ========== EMOTIONS & CONCEPTS ==========
  'happiness': "Happiness is a positive emotional state characterized by feelings of joy, contentment, and satisfaction. How to cultivate happiness:\n\n• Practice gratitude daily\n• Spend time with loved ones\n• Pursue meaningful goals\n• Take care of physical health (exercise, sleep)\n• Help others and show kindness\n• Live in the present moment\n• Develop positive relationships\n\nResearch shows happiness comes more from experiences, relationships, and personal growth than from material possessions.",
  'success': "Success means achieving your goals and living a fulfilling life. Keys to success:\n\n• Set clear, specific goals\n• Work hard and stay consistent\n• Learn from failures\n• Develop good habits\n• Surround yourself with positive people\n• Keep learning and growing\n• Stay persistent and patient\n• Maintain work-life balance\n\nSuccess is personal — it's defined by your own values and aspirations, not by others' standards!",
  'friendship': "Friendship is a close relationship between people based on mutual trust, care, and support. Qualities of good friendship:\n\n• Trust and honesty\n• Support in good and bad times\n• Shared interests and experiences\n• Respect for each other\n• Good communication\n• Loyalty and reliability\n• Fun and laughter together\n\nTrue friends accept you as you are, celebrate your successes, and help you through challenges. Quality matters more than quantity!",
  'education': "Education is the process of acquiring knowledge, skills, values, and understanding. Importance:\n\n• Opens career opportunities\n• Develops critical thinking\n• Builds confidence and self-awareness\n• Empowers you to make better decisions\n• Contributes to society\n• Lifelong learning enriches life\n\nTypes: Formal (school, college), Informal (life experience), Non-formal (workshops, online courses)\n\nEducation is one of the most powerful tools for personal and societal growth!",
  'health': "Health is a state of complete physical, mental, and social well-being. Key aspects:\n\n**Physical Health:**\n• Regular exercise (30+ min daily)\n• Balanced nutrition\n• 7-9 hours of sleep\n• Stay hydrated\n• Regular check-ups\n\n**Mental Health:**\n• Manage stress\n• Practice mindfulness\n• Maintain social connections\n• Seek help when needed\n\n**Prevention:**\n• Avoid smoking and excessive alcohol\n• Practice good hygiene\n• Vaccinations\n\nYour health is your greatest wealth!",

  // ========== ACADEMIC SUBJECTS ==========
  'mathematics': "Mathematics is the study of numbers, shapes, patterns, and logical reasoning. Key branches:\n\n• Arithmetic: Basic operations (+, -, ×, ÷)\n• Algebra: Using symbols and variables\n• Geometry: Shapes, angles, measurements\n• Trigonometry: Triangles and angles\n• Calculus: Change and motion\n• Statistics: Data analysis\n\nWhy it's important:\n• Problem-solving skills\n• Critical thinking\n• Used in science, engineering, finance\n• Essential in everyday life\n\nMath is the universal language of logic and patterns!",
  'science': "Science is the systematic study of the natural world through observation and experimentation. Major branches:\n\n**Physical Sciences:**\n• Physics: Matter, energy, forces\n• Chemistry: Substances and reactions\n• Astronomy: Space and celestial objects\n\n**Life Sciences:**\n• Biology: Living organisms\n• Ecology: Environment and ecosystems\n• Medicine: Human health\n\n**Earth Sciences:**\n• Geology: Earth's structure\n• Meteorology: Weather and climate\n• Oceanography: Oceans\n\nScience helps us understand the world and improve human life!",
  'history': "History is the study of past events and human civilizations. Why it matters:\n\n• Learn from past mistakes\n• Understand how societies developed\n• Appreciate different cultures\n• See patterns in human behavior\n• Know where we came from\n\nMajor periods:\n• Ancient (before 500 CE)\n• Medieval (500-1500 CE)\n• Modern (1500-present)\n\nKey events: Agricultural Revolution, Ancient civilizations, World Wars, Industrial Revolution, Digital Age\n\n'Those who don't learn from history are doomed to repeat it.'",
  'music': "Music is the art of organizing sounds in time to create melody, harmony, and rhythm. Elements:\n\n• Melody: The tune\n• Harmony: Chords and combinations\n• Rhythm: Beat and timing\n• Tempo: Speed\n• Dynamics: Volume\n\nBenefits:\n• Reduces stress\n• Improves mood\n• Enhances memory\n• Boosts creativity\n• Brings people together\n\nGenres: Classical, Rock, Pop, Hip-Hop, Jazz, Country, Electronic, and many more!\n\nMusic is a universal language that connects all cultures!",
  'art': "Art is the expression of human creativity and imagination through visual, auditory, or performance mediums. Forms:\n\n**Visual Arts:**\n• Painting, Drawing, Sculpture\n• Photography, Digital art\n\n**Performance Arts:**\n• Dance, Theater, Music\n\n**Applied Arts:**\n• Architecture, Design, Fashion\n\nWhy art matters:\n• Self-expression\n• Cultural preservation\n• Emotional communication\n• Beauty and inspiration\n• Different perspectives\n\nFamous artists: Leonardo da Vinci, Pablo Picasso, Vincent van Gogh, Frida Kahlo\n\nArt enriches life and expands our understanding of the world!",
  'language': "Language is a system of communication using words, sounds, and symbols. Key facts:\n\n• ~7,000 languages worldwide\n• Most spoken: English, Mandarin, Hindi, Spanish, Arabic\n• Language families: Indo-European, Sino-Tibetan, Afro-Asiatic, etc.\n\nComponents:\n• Vocabulary: Words\n• Grammar: Structure rules\n• Pronunciation: Sounds\n• Writing systems: Scripts\n\nBenefits of learning languages:\n• Better career opportunities\n• Enhanced cognitive skills\n• Cultural understanding\n• Travel experiences\n• Brain health\n\nLanguage is humanity's most powerful tool for connection!",

  // ========== ENTERTAINMENT ==========
  'movies': "Movies (also called films or cinema) are visual stories told through moving pictures and sound. Key aspects:\n\n**Types of Movies:**\n• Action, Comedy, Drama, Horror, Thriller\n• Romance, Sci-Fi, Fantasy, Animation\n• Documentary, Biography\n\n**Elements:**\n• Director: Creative vision\n• Actors: Bring characters to life\n• Cinematography: Camera work\n• Script: Story and dialogue\n• Music/Soundtrack: Emotional impact\n• Special effects: Visual magic\n\n**Famous Studios:** Disney, Warner Bros, Universal, Marvel, Pixar\n\n**Benefits:**\n• Entertainment and escapism\n• Cultural experiences\n• Emotional connection\n• Storytelling and art\n• Social bonding\n\nMovies are one of the most popular forms of entertainment worldwide!",
  'books': "Books are written works that tell stories, share knowledge, or express ideas. Types:\n\n**Fiction:**\n• Novels: Long stories\n• Short stories: Brief narratives\n• Fantasy, Mystery, Romance, Sci-Fi, Thriller\n\n**Non-Fiction:**\n• Biography/Autobiography\n• Self-help and personal development\n• History, Science, Philosophy\n• Educational and reference\n\n**Benefits of Reading:**\n• Improves vocabulary and language\n• Enhances imagination\n• Reduces stress\n• Increases knowledge\n• Improves focus and concentration\n• Better writing skills\n• Empathy and understanding\n\nFamous authors: Shakespeare, J.K. Rowling, Stephen King, Agatha Christie, Paulo Coelho\n\n'A reader lives a thousand lives before he dies.'",
  'games': "Games are structured activities for entertainment, learning, or competition. Types:\n\n**Video Games:**\n• Action, Adventure, RPG (Role-Playing)\n• Strategy, Sports, Racing\n• Platforms: PC, Console (PlayStation, Xbox), Mobile\n• Popular: Minecraft, Fortnite, GTA, FIFA, PUBG\n\n**Traditional Games:**\n• Board games (Chess, Monopoly, Scrabble)\n• Card games (Poker, Uno)\n• Sports (Football, Basketball, Cricket)\n\n**Benefits:**\n• Problem-solving skills\n• Hand-eye coordination\n• Strategic thinking\n• Social interaction\n• Stress relief\n• Teamwork\n\n**E-Sports:** Competitive gaming with professional players and tournaments\n\nGaming is now a multi-billion dollar industry!",
  'sports': "Sports are physical activities involving competition, skill, and rules. Popular sports:\n\n**Team Sports:**\n• Football/Soccer: Most popular globally\n• Cricket: Popular in South Asia, UK, Australia\n• Basketball: Fast-paced, high-scoring\n• Baseball: America's pastime\n• Volleyball, Hockey, Rugby\n\n**Individual Sports:**\n• Tennis, Golf, Swimming\n• Athletics (Track & Field)\n• Boxing, Martial Arts\n• Gymnastics\n\n**Benefits:**\n• Physical fitness and health\n• Discipline and dedication\n• Teamwork and leadership\n• Stress relief\n• Confidence building\n• Social connections\n\n**Major Events:**\n• Olympics: Every 4 years\n• FIFA World Cup: Football championship\n• Super Bowl, Wimbledon, NBA Finals\n\nSports bring people together and promote healthy living!",
  'travel': "Travel is the act of moving from one place to another, typically for pleasure, exploration, or business. Benefits:\n\n**Why Travel:**\n• Experience new cultures\n• See beautiful places\n• Try different foods\n• Meet new people\n• Create memories\n• Personal growth\n• Broaden perspectives\n• Adventure and excitement\n\n**Types:**\n• Adventure travel (hiking, camping)\n• Beach vacations\n• City tours (museums, landmarks)\n• Cultural experiences\n• Road trips\n• Backpacking\n\n**Popular Destinations:**\n• Paris (Eiffel Tower)\n• New York (Statue of Liberty)\n• Rome (Colosseum)\n• Dubai (Burj Khalifa)\n• Bali (beaches and culture)\n• Tokyo (technology and tradition)\n\n**Tips:**\n• Research your destination\n• Learn basic local phrases\n• Respect local customs\n• Travel insurance\n• Pack light\n\n'Travel is the only thing you buy that makes you richer!'",
  'food': "Food is any substance consumed to provide nutritional support and energy. Key aspects:\n\n**Cuisine Types:**\n• Italian: Pizza, Pasta, Gelato\n• Chinese: Noodles, Dumplings, Fried Rice\n• Indian: Curry, Biryani, Samosas\n• Mexican: Tacos, Burritos, Enchiladas\n• Japanese: Sushi, Ramen, Tempura\n• American: Burgers, Hot Dogs, BBQ\n\n**Food Groups:**\n• Carbohydrates: Bread, rice, pasta\n• Proteins: Meat, fish, eggs, beans\n• Fruits and vegetables\n• Dairy: Milk, cheese, yogurt\n• Fats: Oils, nuts, butter\n\n**Healthy Eating:**\n• Balanced diet with variety\n• Eat fruits and vegetables\n• Drink plenty of water\n• Limit processed foods\n• Moderate portions\n\n**Fun Facts:**\n• Food brings cultures together\n• Cooking is both art and science\n• Taste is influenced by smell\n• Different cuisines worldwide\n\nGood food nourishes body and soul!",
};

class AIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  }

  // Search the knowledge base for the best matching answer
  private searchKnowledgeBase(message: string): string | null {
    const lower = message.toLowerCase();

    // ========== USA / AMERICA ==========
    if (/(usa|united states|america|american)/.test(lower)) {
      if (/prime minister/.test(lower)) {
        return "The United States does NOT have a Prime Minister. The USA has a President as the head of state and government.\n\n" + KNOWLEDGE_BASE['usa_president'];
      }
      if (/president|leader|head of state|who (leads|runs|governs)/.test(lower)) {
        return KNOWLEDGE_BASE['usa_president'];
      }
      if (/capital|government|politics|states/.test(lower)) {
        return KNOWLEDGE_BASE['usa'];
      }
      return KNOWLEDGE_BASE['usa'];
    }

    // ========== INDIA ==========
    if (/(india|indian|narendra modi|modi)/.test(lower)) {
      if (/prime minister|pm|leader|government|president|politics/.test(lower)) {
        return KNOWLEDGE_BASE['india_pm'];
      }
      return "India is a fascinating country in South Asia! Quick facts:\n\n• Capital: New Delhi\n• Population: 1.4+ billion (most populous country)\n• Area: 7th largest country\n• Languages: 22 official languages, hundreds spoken\n• Economy: 5th largest in the world\n• Famous for: Taj Mahal, yoga, Bollywood, IT industry, cuisine\n• Prime Minister: Narendra Modi (since 2014)";
    }

    // ========== UK ==========
    if (/(uk|united kingdom|britain|british|england|english)/.test(lower)) {
      if (/prime minister|pm|leader/.test(lower)) {
        return KNOWLEDGE_BASE['uk_pm'];
      }
      return KNOWLEDGE_BASE['uk'];
    }

    // ========== CANADA ==========
    if (/canada|canadian/.test(lower)) {
      if (/prime minister|pm|leader/.test(lower)) {
        return KNOWLEDGE_BASE['canada_pm'];
      }
      return KNOWLEDGE_BASE['canada_pm'];
    }

    // ========== CHINA ==========
    if (/china|chinese|xi jinping/.test(lower)) {
      if (/president|leader|pm|prime minister|who (leads|runs)/.test(lower)) {
        return KNOWLEDGE_BASE['china_leader'];
      }
      return KNOWLEDGE_BASE['china'];
    }

    // ========== RUSSIA ==========
    if (/russia|russian|putin/.test(lower)) {
      if (/president|leader|pm|prime minister/.test(lower)) {
        return KNOWLEDGE_BASE['russia_leader'];
      }
      return KNOWLEDGE_BASE['russia_leader'];
    }

    // ========== FRANCE ==========
    if (/france|french|macron/.test(lower)) {
      if (/president|leader|pm|prime minister/.test(lower)) {
        return KNOWLEDGE_BASE['france_leader'];
      }
      return KNOWLEDGE_BASE['france_leader'];
    }

    // ========== GERMANY ==========
    if (/germany|german/.test(lower)) {
      if (/chancellor|leader|pm|prime minister|president/.test(lower)) {
        return KNOWLEDGE_BASE['germany_leader'];
      }
      return KNOWLEDGE_BASE['germany_leader'];
    }

    // ========== JAPAN ==========
    if (/japan|japanese/.test(lower)) {
      if (/prime minister|pm|leader/.test(lower)) {
        return KNOWLEDGE_BASE['japan_leader'];
      }
      return KNOWLEDGE_BASE['japan'];
    }

    // ========== AUSTRALIA ==========
    if (/australia|australian/.test(lower)) {
      return KNOWLEDGE_BASE['australia'];
    }

    // ========== BRAZIL ==========
    if (/brazil|brazilian/.test(lower)) {
      return KNOWLEDGE_BASE['brazil'];
    }

    // ========== Generic "prime minister" or "president" without country context ==========
    if (/who is.*(prime minister|pm)\b/.test(lower) && !/(of|in)\s+(the\s+)?\w/.test(lower)) {
      return "I'd be happy to tell you about a Prime Minister! Could you specify which country? For example:\n\n• India — Narendra Modi\n• UK — Keir Starmer\n• Canada — Mark Carney\n• Japan — Shigeru Ishiba\n\nNote: Some countries like the USA don't have a Prime Minister — they have a President instead.";
    }

    if (/who is.*(president)\b/.test(lower) && !/(of|in)\s+(the\s+)?\w/.test(lower)) {
      return "I'd be happy to tell you about a President! Could you specify which country? For example:\n\n• USA — Donald Trump\n• France — Emmanuel Macron\n• China — Xi Jinping\n• Russia — Vladimir Putin";
    }

    // ========== FAMOUS PEOPLE ==========
    if (/elon musk|tesla|spacex/.test(lower)) return KNOWLEDGE_BASE['elon_musk'];
    if (/einstein|e\s*=\s*mc/.test(lower)) return KNOWLEDGE_BASE['albert_einstein'];
    if (/gandhi|mahatma/.test(lower)) return KNOWLEDGE_BASE['mahatma_gandhi'];
    if (/bill gates|microsoft/.test(lower)) return KNOWLEDGE_BASE['bill_gates'];
    if (/steve jobs|apple (founder|creator)/.test(lower)) return KNOWLEDGE_BASE['steve_jobs'];
    if (/zuckerberg|meta (founder|creator|ceo)/.test(lower)) return KNOWLEDGE_BASE['mark_zuckerberg'];

    // ========== SCIENCE ==========
    if (/solar system/.test(lower)) return KNOWLEDGE_BASE['solar_system'];
    if (/planets?\b/.test(lower) && /how many|list|name|what|solar/.test(lower)) return KNOWLEDGE_BASE['planets'];
    if (/\bmoon\b/.test(lower) && /what|about|facts|landing/.test(lower)) return KNOWLEDGE_BASE['moon'];
    if (/\bearth\b/.test(lower) && /what|about|facts|planet/.test(lower)) return KNOWLEDGE_BASE['earth'];
    if (/photosynthesis/.test(lower)) return KNOWLEDGE_BASE['photosynthesis'];
    if (/\bdna\b|deoxyribonucleic/.test(lower)) return KNOWLEDGE_BASE['dna'];
    if (/evolution|darwin/.test(lower)) return KNOWLEDGE_BASE['evolution'];
    if (/\batom\b|atomic/.test(lower)) return KNOWLEDGE_BASE['atom'];
    if (/electricity|electric/.test(lower) && /what|how|explain/.test(lower)) return KNOWLEDGE_BASE['electricity'];
    if (/gravity/.test(lower)) return "Gravity is the force that attracts objects toward each other! Key facts:\n\n• Described by Isaac Newton (falling apple story)\n• Keeps us on Earth\n• Makes things fall down\n• Holds planets in orbit around the sun\n• Stronger with more mass\n• Einstein refined it with General Relativity\n\nWithout gravity, everything would float away into space!";

    // ========== MATH ==========
    if (/\bpi\b|3\.14/.test(lower)) return KNOWLEDGE_BASE['pi'];
    if (/pythagoras|pythagorean/.test(lower)) return KNOWLEDGE_BASE['pythagoras'];

    // ========== HISTORY ==========
    if (/world war (1|one|i\b)|ww1|wwi|first world war/.test(lower)) return KNOWLEDGE_BASE['world_war_1'];
    if (/world war (2|two|ii\b)|ww2|wwii|second world war/.test(lower)) return KNOWLEDGE_BASE['world_war_2'];
    if (/moon landing|apollo 11|neil armstrong/.test(lower)) return KNOWLEDGE_BASE['moon_landing'];

    // ========== SPORTS ==========
    if (/cricket/.test(lower)) return KNOWLEDGE_BASE['cricket'];
    if (/\bfootball\b|\bsoccer\b|fifa/.test(lower)) return KNOWLEDGE_BASE['football_soccer'];
    if (/olympic/.test(lower)) return KNOWLEDGE_BASE['olympics'];

    // ========== SOCIAL MEDIA ==========
    if (/instagram/.test(lower)) return KNOWLEDGE_BASE['instagram'];
    if (/facebook/.test(lower)) return KNOWLEDGE_BASE['facebook'];
    if (/whatsapp/.test(lower)) return KNOWLEDGE_BASE['whatsapp'];
    if (/twitter|x\.com|\btweet/.test(lower)) return KNOWLEDGE_BASE['twitter'];
    if (/youtube/.test(lower)) return KNOWLEDGE_BASE['youtube'];
    if (/tiktok/.test(lower)) return KNOWLEDGE_BASE['tiktok'];

    // ========== TECHNOLOGY ==========
    if (/\bcomputer\b/.test(lower) && /what|about|explain/.test(lower)) return KNOWLEDGE_BASE['computer'];
    if (/internet|wifi|world wide web/.test(lower)) return KNOWLEDGE_BASE['internet'];
    if (/blockchain/.test(lower)) return KNOWLEDGE_BASE['blockchain'];
    if (/crypto|bitcoin|ethereum/.test(lower)) return KNOWLEDGE_BASE['cryptocurrency'];

    // ========== PROGRAMMING ==========
    if (/\bpython\b/.test(lower) && /what|learn|about|tell/.test(lower)) {
      return "Python is one of the most popular programming languages! Why it's great:\n\n• Easy to learn and read\n• Versatile (web, AI, data science, automation, games)\n• Huge community and libraries\n• Used by Google, Netflix, NASA, Instagram\n• Great for beginners\n• High-paying job opportunities\n\nPython code is clean and readable, making it perfect for both beginners and experts!";
    }
    if (/(javascript|\bjs\b)/.test(lower) && /what|learn|about|tell/.test(lower)) {
      return "JavaScript is the programming language of the web! Key facts:\n\n• Makes websites interactive\n• Runs in all web browsers\n• Used for front-end (UI) and back-end (servers)\n• Powers frameworks like React, Vue, Angular\n• Essential for web development\n• Also used for mobile apps (React Native)\n\nEvery website you visit uses JavaScript!";
    }
    if (/\bhtml\b/.test(lower)) return "HTML (HyperText Markup Language) is the foundation of all websites!\n\n• Creates structure of web pages\n• Uses tags like <h1>, <p>, <img>\n• Not a programming language (it's a markup language)\n• Works with CSS (styling) and JavaScript (interactivity)\n\nEvery website starts with HTML!";
    if (/\bcss\b/.test(lower)) return "CSS (Cascading Style Sheets) makes websites look beautiful!\n\n• Styles HTML elements\n• Controls colors, fonts, layouts\n• Makes websites responsive (mobile-friendly)\n• Creates animations and effects\n\nCSS works with HTML to create attractive, modern websites!";

    // ========== AI ==========
    if (/artificial intelligence|\bai\b/.test(lower) && /human|people|difference/.test(lower)) {
      return "Key differences between AI and humans:\n\n**AI:**\n• Processes data extremely fast\n• Never gets tired or emotional\n• Can't truly understand or feel\n• Limited to trained data\n• Excellent at specific tasks\n\n**Humans:**\n• Creative and intuitive\n• Conscious and self-aware\n• Emotional intelligence\n• Can learn from few examples\n• General intelligence\n• Have imagination and dreams";
    }
    if (/artificial intelligence|\bai\b/.test(lower) && /what|explain|about/.test(lower)) {
      return "Artificial Intelligence (AI) is technology that enables machines to simulate human intelligence:\n\n• Machine Learning (learns from data)\n• Natural Language Processing (understands language)\n• Computer Vision (recognizes images)\n• Decision making and problem solving\n\nExamples: Voice assistants, recommendation systems, self-driving cars, chatbots!\n\nAI is transforming healthcare, education, business, and daily life.";
    }

    // ========== GENERAL KNOWLEDGE ==========
    if (/speed of light/.test(lower)) return "The speed of light is approximately 299,792,458 meters per second (about 300,000 km/s or 186,000 miles/s).\n\n• Fastest speed possible in the universe\n• Light from the Sun takes ~8 minutes to reach Earth\n• Denoted as 'c' in physics\n• Einstein's E=mc² relates energy to the speed of light\n• Nothing with mass can reach the speed of light";
    if (/biggest country|largest country/.test(lower)) return "The largest countries in the world by area:\n\n1. Russia — 17.1 million km²\n2. Canada — 10.0 million km²\n3. USA — 9.8 million km²\n4. China — 9.6 million km²\n5. Brazil — 8.5 million km²\n6. Australia — 7.7 million km²\n7. India — 3.3 million km²\n\nRussia is nearly twice the size of the second-largest country!";
    if (/tallest building|burj khalifa/.test(lower)) return "The Burj Khalifa in Dubai (UAE) is the tallest building in the world!\n\n• Height: 828 meters (2,717 feet)\n• 163 floors\n• Completed in 2010\n• Named after Sheikh Khalifa bin Zayed Al Nahyan\n• Cost about $1.5 billion to build\n• Has the world's highest observation deck\n\nThe Jeddah Tower in Saudi Arabia is being built to surpass it at over 1,000 meters!";
    if (/biggest ocean|largest ocean|pacific/.test(lower)) return "The Pacific Ocean is the largest and deepest ocean on Earth!\n\n• Area: ~165.25 million km²\n• Covers more area than all land masses combined\n• Deepest point: Mariana Trench (10,994 meters / 36,070 feet)\n• Named by explorer Ferdinand Magellan\n\nThe 5 oceans in order of size:\n1. Pacific\n2. Atlantic\n3. Indian\n4. Southern (Antarctic)\n5. Arctic";
    if (/longest river|nile|amazon river/.test(lower)) return "The longest rivers in the world:\n\n1. Nile River (Africa) — ~6,650 km\n2. Amazon River (South America) — ~6,400 km\n3. Yangtze River (China) — ~6,300 km\n4. Mississippi-Missouri (USA) — ~6,275 km\n5. Yenisei River (Russia) — ~5,539 km\n\nNote: There's debate about whether the Nile or Amazon is truly the longest, depending on how the source is measured!";
    if (/mount everest|tallest mountain|highest mountain/.test(lower)) return "Mount Everest is the tallest mountain on Earth!\n\n• Height: 8,849 meters (29,032 feet)\n• Located in the Himalayas (Nepal/Tibet border)\n• First summited by Edmund Hillary & Tenzing Norgay (1953)\n• Called 'Sagarmatha' in Nepali and 'Chomolungma' in Tibetan\n• Over 6,000 people have reached the summit\n• Extremely dangerous — over 300 deaths recorded";

    // ========== EMOTIONS & CONCEPTS ==========
    if (/\bhappiness\b|what makes.*happy|how to be happy/.test(lower)) return KNOWLEDGE_BASE['happiness'];
    if (/\bsuccess\b|how to be successful|what is success/.test(lower)) return KNOWLEDGE_BASE['success'];
    if (/\bfriendship\b|what is.*friend|good friend/.test(lower)) return KNOWLEDGE_BASE['friendship'];
    if (/\beducation\b|learning|schooling|why study/.test(lower) && /what|importance|why|meaning/.test(lower)) return KNOWLEDGE_BASE['education'];
    if (/\bhealth\b|healthy|wellness|fitness/.test(lower) && /what|importance|how|tips/.test(lower)) return KNOWLEDGE_BASE['health'];

    // ========== ACADEMIC SUBJECTS ==========
    if (/\bmathematics\b|\bmath\b|maths/.test(lower) && /what|about|subject|study/.test(lower)) return KNOWLEDGE_BASE['mathematics'];
    if (/\bscience\b/.test(lower) && /what|about|study|branches|types/.test(lower)) return KNOWLEDGE_BASE['science'];
    if (/\bhistory\b/.test(lower) && /what|why|importance|study|about/.test(lower)) return KNOWLEDGE_BASE['history'];
    if (/\bmusic\b/.test(lower) && /what|about|benefits|elements/.test(lower)) return KNOWLEDGE_BASE['music'];
    if (/\bart\b/.test(lower) && /what|about|types|importance|forms/.test(lower)) return KNOWLEDGE_BASE['art'];
    if (/\blanguage\b/.test(lower) && /what|about|how many|learning/.test(lower)) return KNOWLEDGE_BASE['language'];

    // ========== ENTERTAINMENT ==========
    if (/\bmovie|\bfilm|\bcinema/.test(lower)) return KNOWLEDGE_BASE['movies'];
    if (/\bbook/.test(lower) && /what|about|reading|why|benefits/.test(lower)) return KNOWLEDGE_BASE['books'];
    if (/\bgame|\bgaming|\bvideo game/.test(lower)) return KNOWLEDGE_BASE['games'];
    if (/\bsport/.test(lower) && /what|about|types|benefits|popular/.test(lower)) return KNOWLEDGE_BASE['sports'];
    if (/\btravel/.test(lower) && /what|about|why|benefits|where/.test(lower)) return KNOWLEDGE_BASE['travel'];
    if (/\bfood|\bcuisine|\beating/.test(lower) && /what|about|types|healthy/.test(lower)) return KNOWLEDGE_BASE['food'];

    return null;
  }

  // Enhanced smart response system - provides natural, context-aware responses
  private generateSmartResponse(message: string, conversationHistory: ChatMessage[] = []): string {
    const lowerMessage = message.toLowerCase().trim();
    
    // First, try the knowledge base for factual questions
    const kbAnswer = this.searchKnowledgeBase(message);
    if (kbAnswer) return kbAnswer;

    // Greetings with time-aware responses
    if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|sup|yo|hii|hlo)\b/.test(lowerMessage)) {
      const hour = new Date().getHours();
      const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const greetings = [
        `${timeGreeting}! I'm Meta AI, your intelligent assistant. How can I help you today?`,
        `Hello! Great to see you. I'm Meta AI - ask me anything you'd like to know!`,
        `Hey there! I'm Meta AI, ready to help with questions, advice, or just a good conversation.`,
        `Hi! I'm Meta AI. Whether it's information, creative help, or problem-solving, I'm here for you!`,
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Status check - "are you okay"
    if (/are you (okay|ok|fine|good|alright|working)/.test(lowerMessage)) {
      return "Yes, I'm working perfectly! I'm Meta AI and I'm here to help you with anything you need. What would you like to know or discuss?";
    }

    // User wants answer - handle demanding/urgent requests
    if (/(give|want|need|tell|show).*answer|answer.*please|give.*answer|i want answer/.test(lowerMessage)) {
      return "Of course! I'm here to help. Please ask me your question clearly, and I'll do my best to give you a detailed answer. What would you like to know?";
    }

    // How are you / Status
    if (/how are you|how're you|hru|how r u|whats up|what's up|wassup/.test(lowerMessage)) {
      const responses = [
        "I'm doing great, thank you! I'm always excited to help and learn from our conversations. What can I assist you with?",
        "I'm functioning perfectly and ready to help! How are you doing today?",
        "All systems operational! I'm here and eager to assist you with whatever you need. How's your day going?",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // What can you do / Capabilities
    if (/what can you do|what do you do|your capabilities|can you help|what are you|tell me about yourself/.test(lowerMessage)) {
      return "I'm Meta AI, and I can help you with:\n\n• Answering questions on virtually any topic\n• Creative writing (stories, poems, content)\n• Explaining complex concepts simply\n• Problem-solving and brainstorming\n• Coding help and technical advice\n• Study assistance and learning\n• General conversation and advice\n\nWhat would you like to explore?";
    }

    // Who are you / Identity
    if (/who are you|what are you|your name|are you (ai|a bot|real)/.test(lowerMessage)) {
      return "I'm Meta AI, an advanced artificial intelligence assistant. I'm here to help you with information, creative tasks, problem-solving, and meaningful conversations. Think of me as your knowledgeable companion who's always ready to assist!";
    }

    // Math calculations
    if (/\d+\s*[\+\-\*\/×÷]\s*\d+/.test(lowerMessage)) {
      try {
        const result = this.calculateMath(lowerMessage);
        return `The answer is ${result}.\n\nWould you like me to explain the calculation or help with another math problem?`;
      } catch (error) {
        return "I can help you with calculations! Please write the math problem clearly. For example: '15 + 7' or '144 / 12'";
      }
    }

    // Time and date queries
    if (/what time|current time|what's the time|time is it/.test(lowerMessage)) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `It's currently ${timeStr}. Is there anything else I can help you with?`;
    }

    if (/what date|today's date|what day|current date|what's today/.test(lowerMessage)) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return `Today is ${dateStr}. How can I assist you further?`;
    }

    // Thank you responses
    if (/thank you|thanks|thx|ty|appreciate|grateful/.test(lowerMessage)) {
      const responses = [
        "You're very welcome! I'm always happy to help. Feel free to ask me anything else!",
        "My pleasure! That's what I'm here for. Don't hesitate to reach out if you need more help.",
        "Glad I could help! Come back anytime you need assistance.",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Goodbye
    if (/^(bye|goodbye|see you|see ya|talk later|gtg|gotta go|cya)\b/.test(lowerMessage)) {
      const responses = [
        "Goodbye! It was great chatting with you. Come back anytime!",
        "Take care! I'll be here whenever you need assistance. Have a wonderful day!",
        "See you later! Feel free to return anytime you need help or just want to chat.",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Topic-specific responses
    if (/weather|forecast|temperature|rain|sunny|climate/.test(lowerMessage)) {
      return "I don't have access to real-time weather data, but I'd recommend:\n\n• Checking Weather.com or your local weather app\n• Looking at AccuWeather for detailed forecasts\n• Using your phone's built-in weather widget\n\nIs there anything else I can help you with?";
    }

    if (/recipe|cook|food|meal|dish|cuisine|restaurant/.test(lowerMessage)) {
      return "I'd love to help with cooking! I can:\n\n• Suggest recipes for specific cuisines or ingredients\n• Explain cooking techniques\n• Help with meal planning\n• Provide ingredient substitutions\n• Give cooking tips and tricks\n\nWhat type of dish are you interested in making?";
    }

    if (/joke|funny|laugh|humor|comedy/.test(lowerMessage)) {
      const jokes = [
        "Why don't scientists trust atoms? Because they make up everything! 😄\n\nWant to hear another one?",
        "I told my computer I needed a break, and now it won't stop sending me Kit-Kat ads! 🍫\n\nShall I tell you another joke?",
        "Why did the scarecrow win an award? Because he was outstanding in his field! 🌾\n\nWould you like more jokes?",
        "What do you call a fake noodle? An impasta! 🍝\n\nWant another joke?",
        "Why don't eggs tell jokes? They'd crack each other up! 🥚\n\nShall I tell you more?",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    // Questions (contains ?) or question words OR requests for information
    if (lowerMessage.includes('?') || 
        /(who|what|when|where|why|how|which|whose|is there|are there|can you|do you|does|did|will|would|could|should)/.test(lowerMessage) ||
        /(tell me about|give.*words about|tell about|say something about|explain|describe|talk about|information about)/.test(lowerMessage)) {
      return this.answerQuestion(message, conversationHistory);
    }

    // Statements or topics
    return this.respondToStatement(message, conversationHistory);
  }

  private calculateMath(expression: string): number {
    // Simple calculator
    const cleaned = expression.replace(/[^\d\+\-\*\/\(\)\.]/g, '');
    try {
      return new Function('return ' + cleaned)();
    } catch {
      throw new Error('Invalid calculation');
    }
  }

  private answerQuestion(question: string, history: ChatMessage[]): string {
    const lowerQuestion = question.toLowerCase();

    // Try knowledge base first
    const kbAnswer = this.searchKnowledgeBase(question);
    if (kbAnswer) return kbAnswer;

    // ========== TECHNOLOGY ==========
    if (/smartphone|phone|mobile/.test(lowerQuestion) && /what/.test(lowerQuestion)) {
      return "A smartphone is a mobile computer that fits in your pocket! Features:\n\n• Make calls and send texts\n• Internet browsing\n• Apps for everything\n• Camera and video\n• GPS navigation\n• Social media\n• Games, music, videos\n\nPopular brands: iPhone (Apple), Samsung, Google Pixel, OnePlus.";
    }

    if (/laptop/.test(lowerQuestion)) {
      return "A laptop is a portable computer you can carry anywhere. Key features:\n\n• Built-in screen, keyboard, trackpad\n• Battery powered\n• Same capabilities as desktop computers\n• Good for work, school, entertainment\n\nPopular brands: MacBook, Dell, HP, Lenovo, ASUS.";
    }

    // ========== SCIENCE ==========
    if (/water|h2o/.test(lowerQuestion) && /what/.test(lowerQuestion)) {
      return "Water is essential for all life on Earth! Facts:\n\n• Chemical formula: H₂O\n• Covers 71% of Earth's surface\n• Exists in 3 states: liquid, solid (ice), gas (steam)\n• Humans are about 60% water\n• Boils at 100°C, Freezes at 0°C";
    }

    if (/sun|solar/.test(lowerQuestion) && /what/.test(lowerQuestion)) {
      return "The Sun is a massive star at the center of our solar system!\n\n• 4.6 billion years old\n• Made of hydrogen and helium\n• Surface temperature: 5,500°C\n• 93 million miles from Earth\n• So big, 1.3 million Earths could fit inside";
    }

    // ========== GENERAL KNOWLEDGE ==========
    if (/love/.test(lowerQuestion) && /what/.test(lowerQuestion)) {
      return "Love is a complex emotion and feeling! It includes:\n\n• Deep affection and care\n• Strong attachment to someone\n• Companionship and trust\n• Romantic feelings\n• Unconditional support\n\nTypes: Romantic love, family love, friendship love, self-love.";
    }

    if (/life|meaning of life/.test(lowerQuestion) && /what/.test(lowerQuestion)) {
      return "This is one of humanity's deepest questions! Different perspectives:\n\n• Find happiness and fulfillment\n• Help others and make a difference\n• Learn, grow, and experience\n• Create meaningful relationships\n• Pursue your passions\n\nThe meaning of life is personal — it's what you make of it!";
    }

    // ========== COMPARISONS ==========
    if (/difference between|compare|vs\.?|versus/.test(lowerQuestion)) {
      if (/ai.*human|human.*ai/.test(lowerQuestion)) {
        return "Key differences:\n\n**AI:** Processes data fast, never tires, limited to training, great at specific tasks\n**Humans:** Creative, conscious, emotional intelligence, general intelligence, imagination\n\nAI is a powerful tool, but humans remain unique in consciousness and creativity!";
      }
      return "I'd be happy to compare those! Could you specify the two things you want me to compare?";
    }

    // ========== LEARN / STUDY / CODE ==========
    if (/learn|study|education|teach|school|college|university|homework/.test(lowerQuestion)) {
      return "I'm here to help you learn! I can assist with:\n\n• Explaining difficult concepts\n• Breaking down complex topics\n• Study strategies and tips\n• Practice questions\n• Subject-specific help\n\nWhat subject or topic would you like to explore?";
    }

    if (/code|program|developer|software|debug|algorithm/.test(lowerQuestion)) {
      return "I can help with programming! I can assist with:\n\n• Explaining code concepts\n• Debugging issues\n• Best practices and design patterns\n• Algorithm explanations\n• Multiple programming languages\n\nWhat specific coding question do you have?";
    }

    if (/creative|write|story|poem|content|blog|article|essay/.test(lowerQuestion)) {
      return "I'd love to help with creative writing! I can:\n\n• Help brainstorm ideas\n• Write stories, poems, or content\n• Improve existing writing\n• Suggest plot developments\n• Provide writing tips\n\nWhat would you like to create today?";
    }

    if (/advice|suggest|recommend|should i|help me decide|opinion/.test(lowerQuestion)) {
      return "I'm here to help you think through your decision! Tell me more about:\n\n• What the situation is\n• What options you're considering\n• What factors are important to you\n\nThe more context you provide, the better I can help!";
    }

    // ========== BETTER FALLBACK — try to extract topic and give a helpful response ==========
    // Extract the main topic from the question
    const topicMatch = lowerQuestion.match(/(?:what is|what are|who is|who are|tell me about|explain|describe)\s+(?:a |an |the )?([\w\s]+?)(?:\?|$)/);
    if (topicMatch) {
      const topic = topicMatch[1].trim();
      return `Great question about "${topic}"! While I don't have a detailed answer for this specific topic in my offline knowledge base, I can tell you more if you:\n\n• Ask about specific aspects of "${topic}"\n• Try related questions I might know about\n\nI have knowledge about: world leaders, countries, science, math, history, technology, programming, sports, social media, and famous people.\n\nFor the most detailed and up-to-date answers, consider adding a free Gemini API key in your settings — this will connect me to Google's AI for unlimited knowledge!`;
    }

    if (/how to|how do|how can/.test(lowerQuestion)) {
      const howMatch = lowerQuestion.match(/how (?:to|do|can)\s+(?:i |you |we )?([\w\s]+?)(?:\?|$)/);
      const howTopic = howMatch ? howMatch[1].trim() : 'that';
      return `I'd like to help you with "${howTopic}"! While I may not have step-by-step instructions for this specific task in my offline knowledge, here's what you can try:\n\n• Break the task into smaller parts and ask me about each\n• Ask about related concepts I might know\n\nFor comprehensive how-to guides, adding a free Gemini API key will give me access to detailed instructions on virtually any topic!`;
    }

    // Generic question fallback — much better than before
    return `I want to help answer your question! While my offline knowledge is limited to specific topics, I know about:\n\n• World leaders & politics (USA, India, UK, etc.)\n• Countries & geography\n• Science (physics, biology, chemistry)\n• Technology & programming\n• History & sports\n• Social media platforms\n• Famous people\n• Math concepts\n\nTry rephrasing your question, or for unlimited AI-powered answers, you can add a free Gemini API key in your .env file!\n\nGet one free at: https://makersuite.google.com/app/apikey`;
  }

  private respondToStatement(statement: string, history: ChatMessage[]): string {
    const lowerStatement = statement.toLowerCase();

    // Try knowledge base first for statements that look like questions
    const kbAnswer = this.searchKnowledgeBase(statement);
    if (kbAnswer) return kbAnswer;

    // Emotional content
    if (/love|like|enjoy|favorite|best|amazing|awesome/.test(lowerStatement)) {
      const responses = [
        "That's wonderful! It's great when we find things we're passionate about. What do you particularly enjoy about it?",
        "I can feel your enthusiasm! Would you like to tell me more about what makes this so special to you?",
        "That sounds fantastic! I'd love to hear more about your experience with this.",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    if (/hate|dislike|worst|terrible|awful|bad/.test(lowerStatement)) {
      const responses = [
        "I understand that can be frustrating. Would you like to talk more about it, or is there something I can help you with?",
        "That sounds challenging. What specifically bothers you about it?",
        "I hear you. Would you like suggestions on how to approach it differently?",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    if (/sad|depressed|down|upset|unhappy|lonely/.test(lowerStatement)) {
      return "I'm sorry you're feeling that way. While I'm an AI, I'm here to listen. If you're struggling significantly, please consider reaching out to a counselor or mental health professional.\n\nWould talking about what's bothering you help, or would you prefer a distraction?";
    }

    if (/happy|excited|great|wonderful|fantastic|thrilled/.test(lowerStatement)) {
      const responses = [
        "That's fantastic! I'm so glad to hear you're feeling positive! What's making you so happy?",
        "Wonderful! It's always great to share good news. Would you like to tell me more?",
        "I love the enthusiasm! What's the occasion?",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    if (/tired|exhausted|sleepy|fatigue/.test(lowerStatement)) {
      return "It sounds like you could use some rest! Remember to:\n\n• Take breaks when needed\n• Stay hydrated\n• Get adequate sleep (7-9 hours)\n• Consider a short walk for energy";
    }

    if (/bored|boring|nothing to do/.test(lowerStatement)) {
      return "Feeling bored? I can help! I could:\n\n• Tell you interesting facts\n• Suggest activities or hobbies\n• Have a thought-provoking discussion\n• Help you learn something new\n• Tell jokes or riddles\n\nWhat sounds interesting to you?";
    }

    if (/problem|issue|trouble|difficult|hard|stuck/.test(lowerStatement)) {
      return "It sounds like you're facing a challenge. I'm here to help! Tell me more about what's going on.";
    }

    if (/trying to|working on|building|creating|making/.test(lowerStatement)) {
      return "That sounds like an interesting project! I'd love to hear more. How can I assist you with it?";
    }

    if (/I want|I need|I wish/.test(lowerStatement)) {
      return "I understand. Could you tell me more about this goal? Maybe I can help you think through how to achieve it.";
    }

    // Generic engagement
    const responses = [
      "I appreciate you sharing that! Is there anything specific you'd like to explore or discuss further?",
      "Interesting! Would you like to tell me more, or can I help you with something?",
      "Thanks for sharing! How can I help you with this?",
      "I'd love to help! Could you ask me a specific question about this topic?",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  async sendMessage(message: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    // Try API first if key is available
    if (this.apiKey && this.apiKey.length > 10) {
      try {
        // Build proper multi-turn conversation format for Gemini API
        const contents: Array<{ role: string; parts: { text: string }[] }> = [];
        
        // Add system instruction as the first user message context
        const systemPrompt = 'You are Meta AI, a helpful, friendly, and intelligent assistant. Respond naturally and conversationally. Keep responses concise but informative. Always try to give direct, factual answers to questions. If a question contains a misconception (like asking about a Prime Minister of a country that doesn\'t have one), politely correct the misconception while providing the correct information.';
        
        // Add conversation history
        for (const msg of conversationHistory) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.parts[0].text }],
          });
        }
        
        // Add current message
        contents.push({
          role: 'user',
          parts: [{ text: message }],
        });
        
        // If no history, prepend system context into the first user message
        if (contents.length === 1) {
          contents[0].parts[0].text = `${systemPrompt}\n\nUser question: ${message}`;
        }

        const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
            ],
          }),
        });

        if (response.ok) {
          const data: GeminiResponse = await response.json();
          if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
          }
        }
      } catch (error) {
        console.log('API unavailable, using smart responses');
      }
    }

    // Use smart response system as fallback
    return this.generateSmartResponse(message, conversationHistory);
  }

  async generateSuggestions(context: string): Promise<string[]> {
    try {
      const prompt = `Based on this conversation context: "${context}", suggest 3 short follow-up questions or prompts (each under 40 characters). Return only the suggestions, one per line, without numbering or explanation.`;
      
      const response = await this.sendMessage(prompt);
      const suggestions = response
        .split('\n')
        .filter(s => s.trim().length > 0)
        .slice(0, 3)
        .map(s => s.replace(/^[-*•]\s*/, '').trim());
      
      return suggestions.length > 0 ? suggestions : [
        'Tell me more',
        'How does that work?',
        'What else can you help with?',
      ];
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [
        'Tell me more',
        'How does that work?',
        'What else can you help with?',
      ];
    }
  }

  // Get AI assistant types
  getAIAssistants() {
    return [
      {
        id: 'meta-ai',
        name: 'Meta AI',
        description: 'General AI assistant powered by advanced language models',
        icon: 'bot',
        gradient: 'from-blue-500 via-purple-500 to-cyan-400',
        verified: true,
      },
      {
        id: 'creative-ai',
        name: 'Creative AI',
        description: 'Get help with creative writing, art ideas, and imagination',
        icon: 'palette',
        gradient: 'from-pink-500 via-rose-500 to-orange-400',
        verified: true,
      },
      {
        id: 'study-ai',
        name: 'Study Buddy',
        description: 'Your personal study assistant for learning and homework',
        icon: 'book',
        gradient: 'from-green-500 via-emerald-500 to-teal-400',
        verified: true,
      },
      {
        id: 'code-ai',
        name: 'Code Helper',
        description: 'Programming assistance and code explanations',
        icon: 'code',
        gradient: 'from-violet-500 via-purple-500 to-indigo-400',
        verified: true,
      },
    ];
  }

  // Format AI response with better formatting
  formatResponse(text: string): string {
    // Add basic markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />');
  }
}

export const aiService = new AIService();
export default aiService;
