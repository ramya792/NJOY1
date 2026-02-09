# NJOY - Social Media Platform

A modern social media application built with React, TypeScript, and Firebase.

## Features

- 📱 Real-time messaging with voice messages and emojis
- 📞 Audio/Video calling system
- 📷 Posts, Reels, and Stories
- 🔔 Activity status and notifications
- 🎵 Video songs integration
- 🔒 Privacy controls and settings
- ⚡ Real-time updates across all features

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Firebase account and project setup
- Cloudinary account for media uploads

### Installation

```sh
# Clone the repository
git clone https://github.com/ramya792/NJOY.git

# Navigate to the project directory
cd NJOY/remix-of-remix-of-remix-of-remix-of-remix-of-njoy-moments

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Development

```sh
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## Technologies Used

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix UI, Framer Motion
- **Backend**: Firebase (Firestore, Authentication)
- **Media Storage**: Cloudinary
- **Routing**: React Router v6
- **State Management**: React Context API
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Emoji**: emoji-mart

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # Shadcn UI components
│   ├── layout/      # Layout components
│   ├── profile/     # Profile-related components
│   ├── messages/    # Messaging components
│   └── calls/       # Calling system components
├── pages/           # Page components
├── contexts/        # React Context providers
├── lib/             # Utility functions and services
└── hooks/           # Custom React hooks
```

## Deployment

The app can be deployed to various platforms:

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **Firebase Hosting**: `firebase deploy`

## Documentation

For detailed feature documentation, see:
- [FEATURES.md](./FEATURES.md) - User guide
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical details
- [QUICK_START.md](./QUICK_START.md) - Quick reference

## License

MIT
