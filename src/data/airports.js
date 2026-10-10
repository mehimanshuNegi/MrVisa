/**
 * Comprehensive dataset of recognized major domestic and international airports.
 * Each entry contains IATA code, airport name, city, and country for robust autocomplete.
 */

export const AIRPORTS = [
  // India - Major & International Hubs
  { iata: 'DEL', name: 'Indira Gandhi International Airport', city: 'New Delhi', country: 'India' },
  { iata: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India' },
  { iata: 'BLR', name: 'Kempegowda International Airport', city: 'Bengaluru', country: 'India' },
  { iata: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'India' },
  { iata: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', country: 'India' },
  { iata: 'CCU', name: 'Netaji Subhash Chandra Bose International Airport', city: 'Kolkata', country: 'India' },
  { iata: 'COK', name: 'Cochin International Airport', city: 'Kochi', country: 'India' },
  { iata: 'AMD', name: 'Sardar Vallabhbhai Patel International Airport', city: 'Ahmedabad', country: 'India' },
  { iata: 'GOI', name: 'Dabolim Airport', city: 'Goa (Dabolim)', country: 'India' },
  { iata: 'GOX', name: 'Manohar International Airport', city: 'Goa (Mopa)', country: 'India' },
  { iata: 'TRV', name: 'Thiruvananthapuram International Airport', city: 'Thiruvananthapuram', country: 'India' },
  { iata: 'CCJ', name: 'Calicut International Airport', city: 'Kozhikode', country: 'India' },
  { iata: 'PNQ', name: 'Pune Airport', city: 'Pune', country: 'India' },
  { iata: 'JAI', name: 'Jaipur International Airport', city: 'Jaipur', country: 'India' },
  { iata: 'LKO', name: 'Chaudhary Charan Singh International Airport', city: 'Lucknow', country: 'India' },
  { iata: 'ATQ', name: 'Sri Guru Ram Dass Jee International Airport', city: 'Amritsar', country: 'India' },
  { iata: 'IXC', name: 'Shaheed Bhagat Singh International Airport', city: 'Chandigarh', country: 'India' },
  { iata: 'GAU', name: 'Lokpriya Gopinath Bordoloi International Airport', city: 'Guwahati', country: 'India' },
  { iata: 'IXB', name: 'Bagdogra Airport', city: 'Siliguri/Bagdogra', country: 'India' },
  { iata: 'SXR', name: 'Sheikh ul-Alam International Airport', city: 'Srinagar', country: 'India' },
  { iata: 'IXJ', name: 'Jammu Airport', city: 'Jammu', country: 'India' },
  { iata: 'BBI', name: 'Biju Patnaik Airport', city: 'Bhubaneswar', country: 'India' },
  { iata: 'PAT', name: 'Jay Prakash Narayan Airport', city: 'Patna', country: 'India' },
  { iata: 'VNS', name: 'Lal Bahadur Shastri Airport', city: 'Varanasi', country: 'India' },
  { iata: 'NAG', name: 'Dr. Babasaheb Ambedkar International Airport', city: 'Nagpur', country: 'India' },
  { iata: 'IXE', name: 'Mangalore International Airport', city: 'Mangalore', country: 'India' },
  { iata: 'CJB', name: 'Coimbatore International Airport', city: 'Coimbatore', country: 'India' },
  { iata: 'TRZ', name: 'Tiruchirappalli International Airport', city: 'Tiruchirappalli', country: 'India' },
  { iata: 'IDR', name: 'Devi Ahilya Bai Holkar Airport', city: 'Indore', country: 'India' },
  { iata: 'BDQ', name: 'Vadodara Airport', city: 'Vadodara', country: 'India' },
  { iata: 'STV', name: 'Surat Airport', city: 'Surat', country: 'India' },
  { iata: 'VTZ', name: 'Visakhapatnam Airport', city: 'Visakhapatnam', country: 'India' },

  // Middle East & Gulf Hubs
  { iata: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates' },
  { iata: 'DWC', name: 'Al Maktoum International Airport', city: 'Dubai (South)', country: 'United Arab Emirates' },
  { iata: 'AUH', name: 'Zayed International Airport', city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { iata: 'SHJ', name: 'Sharjah International Airport', city: 'Sharjah', country: 'United Arab Emirates' },
  { iata: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar' },
  { iata: 'BAH', name: 'Bahrain International Airport', city: 'Manama', country: 'Bahrain' },
  { iata: 'MCT', name: 'Muscat International Airport', city: 'Muscat', country: 'Oman' },
  { iata: 'KWI', name: 'Kuwait International Airport', city: 'Kuwait City', country: 'Kuwait' },
  { iata: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia' },
  { iata: 'JED', name: 'King Abdulaziz International Airport', city: 'Jeddah', country: 'Saudi Arabia' },
  { iata: 'DMM', name: 'King Fahd International Airport', city: 'Dammam', country: 'Saudi Arabia' },
  { iata: 'MED', name: 'Prince Mohammad Bin Abdulaziz Airport', city: 'Medina', country: 'Saudi Arabia' },

  // Southeast Asia & East Asia Hubs
  { iata: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
  { iata: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' },
  { iata: 'DMK', name: 'Don Mueang International Airport', city: 'Bangkok', country: 'Thailand' },
  { iata: 'HKT', name: 'Phuket International Airport', city: 'Phuket', country: 'Thailand' },
  { iata: 'CNX', name: 'Chiang Mai International Airport', city: 'Chiang Mai', country: 'Thailand' },
  { iata: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia' },
  { iata: 'PEN', name: 'Penang International Airport', city: 'George Town/Penang', country: 'Malaysia' },
  { iata: 'DPS', name: 'Ngurah Rai (Bali) International Airport', city: 'Denpasar/Bali', country: 'Indonesia' },
  { iata: 'CGK', name: 'Soekarno-Hatta International Airport', city: 'Jakarta', country: 'Indonesia' },
  { iata: 'HAN', name: 'Noi Bai International Airport', city: 'Hanoi', country: 'Vietnam' },
  { iata: 'SGN', name: 'Tan Son Nhat International Airport', city: 'Ho Chi Minh City', country: 'Vietnam' },
  { iata: 'DAD', name: 'Da Nang International Airport', city: 'Da Nang', country: 'Vietnam' },
  { iata: 'MNL', name: 'Ninoy Aquino International Airport', city: 'Manila', country: 'Philippines' },
  { iata: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong' },
  { iata: 'TPE', name: 'Taiwan Taoyuan International Airport', city: 'Taipei', country: 'Taiwan' },
  { iata: 'NRT', name: 'Narita International Airport', city: 'Tokyo (Narita)', country: 'Japan' },
  { iata: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo (Haneda)', country: 'Japan' },
  { iata: 'KIX', name: 'Kansai International Airport', city: 'Osaka', country: 'Japan' },
  { iata: 'ICN', name: 'Incheon International Airport', city: 'Seoul (Incheon)', country: 'South Korea' },
  { iata: 'GMP', name: 'Gimpo International Airport', city: 'Seoul (Gimpo)', country: 'South Korea' },
  { iata: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China' },
  { iata: 'PKX', name: 'Beijing Daxing International Airport', city: 'Beijing', country: 'China' },
  { iata: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China' },
  { iata: 'CAN', name: 'Guangzhou Baiyun International Airport', city: 'Guangzhou', country: 'China' },

  // Europe - Top Hubs & Destinations
  { iata: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom' },
  { iata: 'LGW', name: 'London Gatwick Airport', city: 'London', country: 'United Kingdom' },
  { iata: 'STN', name: 'London Stansted Airport', city: 'London', country: 'United Kingdom' },
  { iata: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'United Kingdom' },
  { iata: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'United Kingdom' },
  { iata: 'CDG', name: 'Paris Charles de Gaulle Airport', city: 'Paris', country: 'France' },
  { iata: 'ORY', name: 'Paris Orly Airport', city: 'Paris', country: 'France' },
  { iata: 'NCE', name: 'Nice Côte d’Azur Airport', city: 'Nice', country: 'France' },
  { iata: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
  { iata: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany' },
  { iata: 'BER', name: 'Berlin Brandenburg Airport', city: 'Berlin', country: 'Germany' },
  { iata: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands' },
  { iata: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland' },
  { iata: 'GVA', name: 'Geneva Airport', city: 'Geneva', country: 'Switzerland' },
  { iata: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'Austria' },
  { iata: 'FCO', name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy' },
  { iata: 'MXP', name: 'Milan Malpensa Airport', city: 'Milan', country: 'Italy' },
  { iata: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain' },
  { iata: 'BCN', name: 'Josep Tarradellas Barcelona-El Prat Airport', city: 'Barcelona', country: 'Spain' },
  { iata: 'LIS', name: 'Humberto Delgado Airport', city: 'Lisbon', country: 'Portugal' },
  { iata: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'Belgium' },
  { iata: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark' },
  { iata: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden' },
  { iata: 'OSL', name: 'Oslo Airport, Gardermoen', city: 'Oslo', country: 'Norway' },
  { iata: 'HEL', name: 'Helsinki-Vantaa Airport', city: 'Helsinki', country: 'Finland' },
  { iata: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland' },
  { iata: 'ATH', name: 'Athens International Airport', city: 'Athens', country: 'Greece' },
  { iata: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey' },
  { iata: 'SAW', name: 'Istanbul Sabiha Gökçen Airport', city: 'Istanbul', country: 'Turkey' },
  { iata: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'Poland' },
  { iata: 'PRG', name: 'Václav Havel Airport Prague', city: 'Prague', country: 'Czech Republic' },
  { iata: 'BUD', name: 'Budapest Ferenc Liszt International Airport', city: 'Budapest', country: 'Hungary' },
  { iata: 'TBS', name: 'Tbilisi International Airport', city: 'Tbilisi', country: 'Georgia' },
  { iata: 'BUS', name: 'Batumi International Airport', city: 'Batumi', country: 'Georgia' },
  { iata: 'EVN', name: 'Zvartnots International Airport', city: 'Yerevan', country: 'Armenia' },
  { iata: 'GYD', name: 'Heydar Aliyev International Airport', city: 'Baku', country: 'Azerbaijan' },

  // Americas - North & South
  { iata: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
  { iata: 'EWR', name: 'Newark Liberty International Airport', city: 'New York / Newark', country: 'United States' },
  { iata: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'United States' },
  { iata: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'United States' },
  { iata: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States' },
  { iata: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States' },
  { iata: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'United States' },
  { iata: 'BOS', name: 'Boston Logan International Airport', city: 'Boston', country: 'United States' },
  { iata: 'IAD', name: 'Washington Dulles International Airport', city: 'Washington D.C.', country: 'United States' },
  { iata: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States' },
  { iata: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'United States' },
  { iata: 'IAH', name: 'George Bush Intercontinental Airport', city: 'Houston', country: 'United States' },
  { iata: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States' },
  { iata: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada' },
  { iata: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada' },
  { iata: 'YUL', name: 'Montréal-Trudeau International Airport', city: 'Montreal', country: 'Canada' },
  { iata: 'YYC', name: 'Calgary International Airport', city: 'Calgary', country: 'Canada' },
  { iata: 'MEX', name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico' },
  { iata: 'GRU', name: 'São Paulo/Guarulhos International Airport', city: 'São Paulo', country: 'Brazil' },
  { iata: 'EZE', name: 'Ministro Pistarini International Airport', city: 'Buenos Aires', country: 'Argentina' },

  // Australia & New Zealand & Oceania
  { iata: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia' },
  { iata: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia' },
  { iata: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'Australia' },
  { iata: 'PER', name: 'Perth Airport', city: 'Perth', country: 'Australia' },
  { iata: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand' },
  { iata: 'CHC', name: 'Christchurch International Airport', city: 'Christchurch', country: 'New Zealand' },

  // Africa & Indian Ocean Hubs
  { iata: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt' },
  { iata: 'JNB', name: 'O. R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa' },
  { iata: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', country: 'South Africa' },
  { iata: 'NBO', name: 'Jomo Kenyatta International Airport', city: 'Nairobi', country: 'Kenya' },
  { iata: 'ADD', name: 'Addis Ababa Bole International Airport', city: 'Addis Ababa', country: 'Ethiopia' },
  { iata: 'MRU', name: 'Sir Seewoosagur Ramgoolam International Airport', city: 'Mauritius', country: 'Mauritius' },
  { iata: 'MLE', name: 'Velana International Airport', city: 'Malé', country: 'Maldives' },
  { iata: 'CMB', name: 'Bandaranaike International Airport', city: 'Colombo', country: 'Sri Lanka' },
  { iata: 'KTM', name: 'Tribhuvan International Airport', city: 'Kathmandu', country: 'Nepal' },
  { iata: 'DAC', name: 'Hazrat Shahjalal International Airport', city: 'Dhaka', country: 'Bangladesh' }
];

/**
 * Formats an airport object into the official suggestion label:
 * e.g. "Indira Gandhi International Airport — Delhi (DEL)"
 */
export function formatAirportLabel(airport) {
  if (!airport) return '';
  return `${airport.name} — ${airport.city} (${airport.iata})`;
}

/**
 * Searches the airport dataset by IATA code, city, or airport name.
 * Returns up to maxResults matching airports.
 */
export function searchAirports(query = '', maxResults = 8) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return AIRPORTS.slice(0, maxResults);

  return AIRPORTS.filter((a) => {
    return (
      a.iata.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q)
    );
  }).slice(0, maxResults);
}

/**
 * Finds a specific airport by IATA code (case-insensitive)
 */
export function findAirportByIata(iata) {
  if (!iata) return null;
  const clean = String(iata).trim().toUpperCase();
  return AIRPORTS.find((a) => a.iata === clean) || null;
}
