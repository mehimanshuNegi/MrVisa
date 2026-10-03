import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { DocumentationService } from '../models/DocumentationService.js';
import { DummyTicketService } from '../models/DummyTicketService.js';
import { logger } from '../utils/logger.js';

export const INITIAL_DOCUMENTATION_SERVICES = [
  {
    title: 'Cover Letter',
    slug: 'cover-letter',
    category: 'Visa & Travel Documentation',
    shortDescription: 'Custom, embassy-compliant cover letter tailored to your visa application and itinerary.',
    description: 'A professionally drafted cover letter highlighting your purpose of travel, itinerary, financial capability, and ties to your home country. Formatted specifically to meet consulate and embassy standards.',
    icon: 'FileText',
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1000&q=85',
    features: [
      'Tailored to specific embassy visa guidelines',
      'Covers travel dates, flight, and accommodation details',
      'Highlights professional background and sponsorship',
      'Same-day digital turnaround'
    ],
    processingTime: '24 Hours',
    governmentFee: 0,
    serviceFee: 999,
    currency: 'INR',
    displayOrder: 1,
    isActive: true,
    requirements: [
      // Basic Information
      { title: 'Passport copy', category: 'Basic Information', required: true, inputType: 'file', displayOrder: 1 },
      { title: 'Visa application form / visa type', category: 'Basic Information', required: true, inputType: 'text', displayOrder: 2 },
      { title: 'Travel dates', category: 'Basic Information', required: true, inputType: 'date', displayOrder: 3 },
      { title: 'Purpose of travel', category: 'Basic Information', required: true, inputType: 'text', displayOrder: 4 },
      { title: 'Destination and cities', category: 'Basic Information', required: true, inputType: 'text', displayOrder: 5 },
      // Optional / If Available
      { title: 'Hotel booking', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if available', displayOrder: 6 },
      { title: 'Flight reservation', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if available', displayOrder: 7 },
      { title: 'Previous travel/visa history', category: 'Optional / If Available', required: false, inputType: 'text', condition: 'if relevant', displayOrder: 8 },
      { title: 'Bank/financial details', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if relevant', displayOrder: 9 },
      { title: 'Any specific information they want included', category: 'Optional / If Available', required: false, inputType: 'text', displayOrder: 10 },
      // Employment / Business
      { title: 'Employment/business details', category: 'Employment / Business', required: false, inputType: 'text', displayOrder: 11 },
      { title: 'Invitation letter', category: 'Employment / Business', required: false, inputType: 'file', condition: 'for business travellers', displayOrder: 12 },
      { title: 'Company details', category: 'Employment / Business', required: false, inputType: 'text', condition: 'for business travellers', displayOrder: 13 },
      { title: 'Meeting/event details', category: 'Employment / Business', required: false, inputType: 'text', condition: 'for business travellers', displayOrder: 14 }
    ]
  },
  {
    title: 'Travel Itinerary',
    slug: 'travel-itinerary',
    category: 'Visa & Travel Documentation',
    shortDescription: 'Embassy-ready, day-by-day travel plan matching your flight and hotel bookings.',
    description: 'A comprehensive, realistic day-wise travel schedule mapped to your visa application. Demonstrates clear tourist intent and planned movements across cities and countries.',
    icon: 'Layers',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=85',
    features: [
      'Day-by-day schedule with cities & sights',
      'Synced with flight and hotel reservation dates',
      'Embassy-compliant tourist route format',
      'Express delivery within 24 hours'
    ],
    processingTime: '24 Hours',
    governmentFee: 0,
    serviceFee: 1199,
    currency: 'INR',
    displayOrder: 2,
    isActive: true,
    deliverablesHeader: 'What NimuFly will prepare for you',
    deliverables: [
      'Day-by-day itinerary',
      'Cities',
      'Activities',
      'Accommodation',
      'Travel movement'
    ],
    requirements: [
      // Basic Information
      { title: 'Passport copy', category: 'Basic Information', required: true, inputType: 'file', displayOrder: 1 },
      { title: 'Destination/country', category: 'Basic Information', required: true, inputType: 'text', displayOrder: 2 },
      { title: 'Travel dates', category: 'Basic Information', required: true, inputType: 'date', displayOrder: 3 },
      { title: 'Cities to be visited', category: 'Basic Information', required: true, inputType: 'text', displayOrder: 4 },
      { title: 'Purpose of travel', category: 'Basic Information', required: true, inputType: 'text', displayOrder: 5 },
      { title: 'Number of travellers', category: 'Basic Information', required: true, inputType: 'number', displayOrder: 6 },
      // Optional / If Available
      { title: 'Preferred hotels', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if already booked', displayOrder: 7 },
      { title: 'Flight details', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if already booked', displayOrder: 8 },
      { title: 'Places/activities they want to visit', category: 'Optional / If Available', required: false, inputType: 'text', displayOrder: 9 },
      { title: 'Any fixed appointments/events', category: 'Optional / If Available', required: false, inputType: 'text', displayOrder: 10 }
    ]
  },
  {
    title: 'Income Tax Return + Computation',
    slug: 'itr',
    category: 'Tax & Financial Compliance',
    shortDescription: 'Certified ITR filing with computation of total income statement for visa financial proof.',
    description: 'Expert-assisted Income Tax Return preparation, computation of total income, and e-filing tailored specifically to meet the strict financial proof requirements of Schengen, US, UK, and Canadian visa consulates.',
    icon: 'FileText',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1000&q=85',
    features: [
      'Computation of total income & tax liability',
      'Consulate-approved tax clearance formatting',
      'Official ITR-V acknowledgment slip',
      'CA-assisted verification'
    ],
    processingTime: '24–48 Hours',
    governmentFee: 0,
    serviceFee: 1499,
    currency: 'INR',
    displayOrder: 3,
    isActive: true,
    conditionPrompt: 'What type of income do you have?',
    conditionOptions: [
      'Salaried',
      'Business / Self-Employed',
      'Professionals / Freelancers',
      'Capital Gains & Other Income'
    ],
    requirements: [
      { title: 'PAN card', category: 'Basic Information', required: true, inputType: 'file', displayOrder: 1 },
      { title: 'Aadhaar card', category: 'Basic Information', required: true, inputType: 'file', displayOrder: 2 },
      { title: 'Mobile number', category: 'Basic Information', required: true, inputType: 'text', displayOrder: 3 }
    ]
  },
  {
    title: 'Import Export Code (IEC)',
    slug: 'import-export',
    category: 'International Trade',
    shortDescription: '10-digit DGFT Import Export Code license for global trade and international business.',
    description: 'Obtain your official 10-digit Import Export Code issued by the Directorate General of Foreign Trade (DGFT), Ministry of Commerce. Mandatory for international shipping, customs clearance, and global business travel endorsements.',
    icon: 'Ship',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1000&q=85',
    features: [
      'Direct DGFT online portal issuance',
      'Official 10-digit electronic IEC certificate',
      'Lifetime validity with no renewal fees',
      'Valid for export-import customs clearance'
    ],
    processingTime: '1–2 Business Days',
    governmentFee: 500,
    serviceFee: 1499,
    currency: 'INR',
    displayOrder: 4,
    isActive: true,
    requirements: [
      // Identity & Contact
      { title: 'PAN card', category: 'Identity & Contact', required: true, inputType: 'file', displayOrder: 1 },
      { title: 'Aadhaar/identity proof', category: 'Identity & Contact', required: true, inputType: 'file', displayOrder: 2 },
      { title: 'Mobile number', category: 'Identity & Contact', required: true, inputType: 'text', displayOrder: 3 },
      { title: 'Email ID', category: 'Identity & Contact', required: true, inputType: 'text', displayOrder: 4 },
      // Business & Entity Proof
      { title: 'Business/proprietorship/company details', category: 'Business & Entity Proof', required: true, inputType: 'text', displayOrder: 5 },
      { title: 'Business address proof', category: 'Business & Entity Proof', required: true, inputType: 'file', displayOrder: 6 },
      { title: 'Bank account details', category: 'Business & Entity Proof', required: true, inputType: 'text', displayOrder: 7 },
      { title: 'Cancelled cheque / bank proof', category: 'Business & Entity Proof', required: false, inputType: 'file', condition: 'as applicable', displayOrder: 8 },
      { title: 'DSC (Digital Signature Certificate)', category: 'Business & Entity Proof', required: false, inputType: 'file', condition: 'where applicable for the entity type', displayOrder: 9 },
      { title: 'Company/LLP incorporation documents', category: 'Business & Entity Proof', required: false, inputType: 'file', condition: 'if applicable', displayOrder: 10 }
    ]
  },
  {
    title: 'Udyam Registration (MSME)',
    slug: 'msme',
    category: 'Government Certification',
    shortDescription: 'Official Ministry of MSME Udyam registration with lifetime valid certificate.',
    description: 'Paperless online registration for Micro, Small, and Medium Enterprises under the Government of India Udyam portal. Enjoy government subsidies, collateral-free credit access, and official business identity recognized worldwide.',
    icon: 'Briefcase',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=85',
    features: [
      'Instant Udyam Registration Number (URN)',
      'Official Government of India MSME Certificate',
      'Zero paper submission required',
      'Lifetime certificate validity with no renewal needed'
    ],
    processingTime: '24 Hours',
    governmentFee: 0,
    serviceFee: 999,
    currency: 'INR',
    displayOrder: 5,
    isActive: true,
    requirements: [
      { title: 'Aadhaar', category: 'For Proprietorship', required: true, inputType: 'file', displayOrder: 1 },
      { title: 'PAN', category: 'For Proprietorship', required: true, inputType: 'file', displayOrder: 2 },
      { title: 'Mobile number', category: 'For Proprietorship', required: true, inputType: 'text', displayOrder: 3 },
      { title: 'Business name', category: 'For Proprietorship', required: true, inputType: 'text', displayOrder: 4 },
      { title: 'Business address', category: 'For Proprietorship', required: true, inputType: 'text', displayOrder: 5 },
      { title: 'Business activity/nature of business', category: 'For Proprietorship', required: true, inputType: 'text', displayOrder: 6 },
      { title: 'Bank account details', category: 'For Proprietorship', required: true, inputType: 'text', displayOrder: 7 },
      { title: 'Number of employees', category: 'For Proprietorship', required: true, inputType: 'number', displayOrder: 8 },
      { title: 'Investment/turnover information', category: 'For Proprietorship', required: false, inputType: 'text', condition: 'where required', displayOrder: 9 }
    ]
  }
];

export const INITIAL_DUMMY_TICKETS = [
  {
    title: 'Verified Flight Reservation (Dummy Ticket)',
    slug: 'verified-flight-reservation',
    shortDescription: 'Verifiable round-trip flight booking with a genuine 6-character PNR code for embassy visa processing.',
    description: 'Genuine round-trip flight reservation issued by an IATA-licensed travel agent. Includes valid passenger name records (PNR) verifiable directly on the airline website (Emirates, Qatar, Lufthansa, Air India, etc.).',
    price: 499,
    currency: 'INR',
    type: 'Round Trip Flight',
    deliveryTime: '10–30 Minutes',
    validity: '14 Days (Live Verifiable PNR)',
    icon: 'Plane',
    features: [
      'Live PNR code verifiable on airline portal',
      'Official IATA agency header and barcode format',
      'Accepted by all global embassies and consulates',
      'Instant delivery via PDF and WhatsApp',
      'Unlimited date modifications before issuance'
    ],
    displayOrder: 1,
    isActive: true
  },
  {
    title: 'Multi-City Flight Itinerary (Dummy Ticket)',
    slug: 'multi-city-flight-itinerary',
    shortDescription: 'Complex multi-destination flight reservations with live PNRs for multi-country travel visas.',
    description: 'Custom multi-city airline flight reservations covering multiple transit layovers and country connections. Ideal for Schengen multi-state tours, Euro-trips, and round-the-world visa submissions requiring comprehensive proof of internal itineraries.',
    price: 899,
    currency: 'INR',
    type: 'Multi-City Itinerary',
    deliveryTime: '30–60 Minutes',
    validity: '2–3 Weeks (Live PNR Verifiable)',
    icon: 'Plane',
    features: [
      'Up to 5 destination sectors included',
      'All individual PNR codes verifiable on carrier portals',
      'Synchronized with actual travel schedules',
      'Compliant with Schengen Article 14 visa code',
      'Priority express consular formatting'
    ],
    displayOrder: 2,
    isActive: true
  }
];

export async function seedDocumentationAndDummyTickets() {
  logger.info('====================================================');
  logger.info('🌱 Seeding Documentation & Dummy Ticket Services into MongoDB...');
  logger.info('====================================================');

  await connectDatabase();

  // 1. Seed or Update Documentation Services
  for (const s of INITIAL_DOCUMENTATION_SERVICES) {
    const existing = await DocumentationService.findOne({ slug: s.slug });
    if (!existing) {
      const created = await DocumentationService.create(s);
      logger.info(`✓ Created Documentation Service: ${created.title} (${created.slug}) with ${created.requirements.length} requirements`);
    } else {
      existing.title = s.title;
      existing.category = s.category;
      existing.shortDescription = s.shortDescription;
      existing.description = s.description;
      existing.icon = s.icon;
      existing.image = s.image;
      existing.features = s.features;
      existing.processingTime = s.processingTime;
      existing.serviceFee = s.serviceFee;
      existing.governmentFee = s.governmentFee;
      existing.displayOrder = s.displayOrder;
      existing.isActive = true;
      existing.requirements = s.requirements;
      existing.conditionPrompt = s.conditionPrompt || '';
      existing.conditionOptions = s.conditionOptions || [];
      existing.deliverablesHeader = s.deliverablesHeader || 'What NimuFly prepares for you';
      existing.deliverables = s.deliverables || [];
      await existing.save();
      logger.info(`✓ Updated Documentation Service: ${existing.title} (${existing.slug}) with ${existing.requirements.length} requirements`);
    }
  }

  // Deactivate GST if it exists in DB so only the 5 specified services are active
  const gst = await DocumentationService.findOne({ slug: 'gst' });
  if (gst) {
    gst.isActive = false;
    await gst.save();
    logger.info(`✓ Set legacy GST service to inactive`);
  }

  // 2. Seed Dummy Tickets
  for (const t of INITIAL_DUMMY_TICKETS) {
    const existing = await DummyTicketService.findOne({ slug: t.slug });
    if (!existing) {
      const created = await DummyTicketService.create(t);
      logger.info(`✓ Created Dummy Ticket: ${created.title} (${created.slug})`);
    } else {
      logger.info(`✓ Dummy Ticket already exists: ${existing.title} (${existing.slug})`);
    }
  }

  logger.info('====================================================');
  logger.info('✨ Documentation & Dummy Ticket Seeding Completed!');
  logger.info('====================================================');
}

if (process.argv[1]?.endsWith('seedServices.js')) {
  seedDocumentationAndDummyTickets()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Seeding failed:', err);
      await disconnectDatabase();
      process.exit(1);
    });
}
