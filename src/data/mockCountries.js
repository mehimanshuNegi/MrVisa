/**
 * Normalized Destination Countries Data Layer
 * Connects to mockVisas for associated visa products
 */

import { mockVisas } from './mockVisas';

export const mockCountries = [
  {
    id: 'thailand',
    name: 'Thailand',
    code: 'TH',
    flagEmoji: '🇹🇭',
    flagUrl: 'https://flagcdn.com/w80/th.png',
    image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1000&q=85',
    description: 'Golden temples, tropical islands, and warm hospitality.',
    visas: ['thailand']
  },
  {
    id: 'united-arab-emirates',
    aliasId: 'uae',
    name: 'United Arab Emirates',
    code: 'AE',
    flagEmoji: '🇦🇪',
    flagUrl: 'https://flagcdn.com/w80/ae.png',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1000&q=85',
    description: 'Futuristic architecture, desert safaris, and luxury shopping.',
    visas: ['uae']
  },
  {
    id: 'sri-lanka',
    name: 'Sri Lanka',
    code: 'LK',
    flagEmoji: '🇱🇰',
    flagUrl: 'https://flagcdn.com/w80/lk.png',
    image: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=1000&q=85',
    description: 'Ancient heritage, emerald tea gardens, and golden coasts.',
    visas: ['sri-lanka']
  },
  {
    id: 'malaysia',
    name: 'Malaysia',
    code: 'MY',
    flagEmoji: '🇲🇾',
    flagUrl: 'https://flagcdn.com/w80/my.png',
    image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1000&q=85',
    description: 'Diverse culture, iconic architecture, and lush rainforests.',
    visas: ['malaysia']
  },
  {
    id: 'vietnam',
    name: 'Vietnam',
    code: 'VN',
    flagEmoji: '🇻🇳',
    flagUrl: 'https://flagcdn.com/w80/vn.png',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1000&q=85',
    description: 'Emerald waters, rich history, and world-renowned cuisine.',
    visas: ['vietnam']
  },
  {
    id: 'indonesia',
    name: 'Indonesia',
    code: 'ID',
    flagEmoji: '🇮🇩',
    flagUrl: 'https://flagcdn.com/w80/id.png',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=85',
    description: 'Tropical paradise, vibrant arts, and serene beaches.',
    visas: ['indonesia']
  },
  {
    id: 'egypt',
    name: 'Egypt',
    code: 'EG',
    flagEmoji: '🇪🇬',
    flagUrl: 'https://flagcdn.com/w80/eg.png',
    image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1000&q=85',
    description: 'Cradle of ancient civilization and the timeless Nile River.',
    visas: ['egypt']
  },
  {
    id: 'usa',
    name: 'USA',
    code: 'US',
    flagEmoji: '🇺🇸',
    flagUrl: 'https://flagcdn.com/w80/us.png',
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1000&q=85',
    description: 'World-class metropolises, national parks, and global business.',
    visas: ['usa']
  },
  {
    id: 'japan',
    name: 'Japan',
    code: 'JP',
    flagEmoji: '🇯🇵',
    flagUrl: 'https://flagcdn.com/w80/jp.png',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=85',
    description: 'Ancient traditions seamlessly blended with futuristic wonders.',
    visas: ['japan']
  },
  {
    id: 'singapore',
    name: 'Singapore',
    code: 'SG',
    flagEmoji: '🇸🇬',
    flagUrl: 'https://flagcdn.com/w80/sg.png',
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1000&q=85',
    description: 'A global garden city of innovation, dining, and cleanliness.',
    visas: ['singapore']
  },
  {
    id: 'georgia',
    name: 'Georgia',
    code: 'GE',
    flagEmoji: '🇬🇪',
    flagUrl: 'https://flagcdn.com/w80/ge.png',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1000&q=85',
    description: 'Majestic Caucasus mountains and legendary hospitality.',
    visas: ['georgia']
  },
  {
    id: 'france',
    name: 'France',
    code: 'FR',
    flagEmoji: '🇫🇷',
    flagUrl: 'https://flagcdn.com/w80/fr.png',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1000&q=85',
    description: 'Art, romance, gastronomy, and the gateway to Europe Schengen.',
    visas: ['france']
  }
];

export const searchCountriesList = [
  'Any Country',
  ...mockCountries.map((c) => c.name)
];
