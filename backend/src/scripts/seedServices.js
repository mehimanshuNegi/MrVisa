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
      { title: 'Passport copy', category: 'Basic Information', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 1 },
      { title: 'Visa application form / visa type', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. Tourist E-Visa, Business Visa, Schengen C-Type', displayOrder: 2 },
      { title: 'Travel dates', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. 15 Nov 2026 – 28 Nov 2026', displayOrder: 3 },
      { title: 'Purpose of travel', category: 'Basic Information', required: true, inputType: 'select', options: ['Tourism', 'Business Travel', 'Family / Friend Visit', 'Conference / Event', 'Other'], displayOrder: 4 },
      { title: 'Destination and cities', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. France (Paris, Nice, Lyon)', displayOrder: 5 },
      { title: 'Employment/business details', category: 'Basic Information', required: true, inputType: 'textarea', placeholder: 'Company name, designation, nature of work, years of experience', displayOrder: 6 },
      // Optional / If Available
      { title: 'Hotel booking', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if available', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 7 },
      { title: 'Flight reservation', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if available', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 8 },
      { title: 'Bank/financial details', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if relevant', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 9 },
      { title: 'Previous travel/visa history', category: 'Optional / If Available', required: false, inputType: 'textarea', condition: 'if relevant', placeholder: 'Past visits in last 5–10 years, valid US/UK/Schengen visas', displayOrder: 10 },
      { title: 'Specific information you want included', category: 'Optional / If Available', required: false, inputType: 'textarea', placeholder: 'Ties to home country, leave approval, sponsors or special circumstances', displayOrder: 11 },
      // Conditional Business Traveller Section
      { title: 'Invitation letter', category: 'Business Travel Details', required: false, inputType: 'file', condition: 'for business travellers', conditionField: 'purpose', conditionValue: 'Business Travel', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 12 },
      { title: 'Company details', category: 'Business Travel Details', required: false, inputType: 'text', condition: 'for business travellers', conditionField: 'purpose', conditionValue: 'Business Travel', placeholder: 'Inviting company name, address & contact person', displayOrder: 13 },
      { title: 'Meeting/event details', category: 'Business Travel Details', required: false, inputType: 'textarea', condition: 'for business travellers', conditionField: 'purpose', conditionValue: 'Business Travel', placeholder: 'Agenda of meeting, conference title, project discussions', displayOrder: 14 },
      { title: 'Meeting/event dates and location', category: 'Business Travel Details', required: false, inputType: 'text', condition: 'for business travellers', conditionField: 'purpose', conditionValue: 'Business Travel', placeholder: 'Venue and scheduled dates', displayOrder: 15 }
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
      { title: 'Passport copy', category: 'Basic Information', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 1 },
      { title: 'Destination country', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. Switzerland & Italy', displayOrder: 2 },
      { title: 'Travel dates', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. 10 Dec 2026 – 24 Dec 2026', displayOrder: 3 },
      { title: 'Cities to be visited', category: 'Basic Information', required: true, inputType: 'text', placeholder: 'e.g. Zurich, Lucerne, Interlaken, Milan, Rome', displayOrder: 4 },
      { title: 'Purpose of travel', category: 'Basic Information', required: true, inputType: 'select', options: ['Tourism & Leisure', 'Honeymoon', 'Business & Sightseeing', 'Cultural / Heritage Tour', 'Family Vacation'], displayOrder: 5 },
      { title: 'Number of travellers', category: 'Basic Information', required: true, inputType: 'number', placeholder: 'e.g. 2', displayOrder: 6 },
      // Optional / If Available
      { title: 'Preferred hotels or existing bookings', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if already booked or preferred', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 7 },
      { title: 'Existing flight details or reservations', category: 'Optional / If Available', required: false, inputType: 'file', condition: 'if already booked', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 8 },
      { title: 'Preferred places and activities', category: 'Optional / If Available', required: false, inputType: 'textarea', placeholder: 'Must-visit attractions (e.g. Eiffel Tower, Jungfraujoch, Colosseum, city tours)', displayOrder: 9 },
      { title: 'Fixed appointments or events', category: 'Optional / If Available', required: false, inputType: 'textarea', placeholder: 'Any scheduled concerts, train journeys, conferences, or specific appointment dates', displayOrder: 10 }
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
      'Salaried individual',
      'Business / professional or self-employed',
      'Other income',
      'Multiple income sources'
    ],
    requirements: [
      { title: 'Income Category', category: 'Income Classification', required: true, inputType: 'select', options: ['Salaried individual', 'Business / professional or self-employed', 'Other income', 'Multiple income sources'], displayOrder: 1 },
      { title: 'PAN card', category: 'Identity & Tax Credentials', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 2 },
      { title: 'Aadhaar card', category: 'Identity & Tax Credentials', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 3 },
      { title: 'Mobile number', category: 'Identity & Tax Credentials', required: true, inputType: 'text', placeholder: '10-digit Aadhaar/PAN linked mobile', displayOrder: 4 },
      { title: 'Assessment Year / Financial Year', category: 'Tax Period', required: true, inputType: 'select', options: ['AY 2025-26 (FY 2024-25)', 'AY 2024-25 (FY 2023-24)', 'AY 2023-24 (FY 2022-23)', 'Multiple Years (2-3 Years for Visa)'], displayOrder: 5 },
      // Conditional Salaried
      { title: 'Employer details', category: 'Employment Details', required: false, inputType: 'text', condition: 'for salaried individual', conditionField: 'incomeType', conditionValue: 'Salaried individual', placeholder: 'Employer name, designation, city', displayOrder: 6 },
      { title: 'Form 16 / Salary slips', category: 'Income Documents', required: false, inputType: 'file', condition: 'Form 16 or last 3 months salary slips', conditionField: 'incomeType', conditionValue: 'Salaried individual', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 7 },
      // Conditional Business
      { title: 'Business/firm details', category: 'Business Details', required: false, inputType: 'text', condition: 'for business / self-employed', conditionField: 'incomeType', conditionValue: 'Business / professional or self-employed', placeholder: 'Trade/firm name, nature of business/profession', displayOrder: 8 },
      { title: 'Business bank statements / financials', category: 'Business Documents', required: false, inputType: 'file', condition: 'business account statement or financials', conditionField: 'incomeType', conditionValue: 'Business / professional or self-employed', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 9 },
      // Conditional Other / Multiple
      { title: 'Details of income sources', category: 'Other Income', required: false, inputType: 'textarea', condition: 'for other or multiple income sources', conditionField: 'incomeType', conditionValue: 'Other income,Multiple income sources', placeholder: 'Rental income, capital gains, consultancy, interest, etc.', displayOrder: 10 },
      // Configurable optional financial documents
      { title: 'Bank statement / financial proof', category: 'Optional Documents', required: false, inputType: 'file', condition: 'as relevant for visa', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 11 }
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
      { title: 'Entity Type', category: 'Entity Selection', required: true, inputType: 'select', options: ['Proprietorship', 'Partnership', 'Company', 'LLP'], displayOrder: 1 },
      { title: 'PAN card', category: 'Identity & Contact', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], description: 'Individual PAN for Proprietorship, Entity PAN for Firm/Company', displayOrder: 2 },
      { title: 'Aadhaar/identity proof', category: 'Identity & Contact', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], description: 'Proprietor / Partner / Director identity proof', displayOrder: 3 },
      { title: 'Mobile number', category: 'Identity & Contact', required: true, inputType: 'text', placeholder: '10-digit mobile number', displayOrder: 4 },
      { title: 'Email ID', category: 'Identity & Contact', required: true, inputType: 'text', placeholder: 'official@company.com', displayOrder: 5 },
      // Business & Entity Proof
      { title: 'Business/proprietorship/company details', category: 'Business Details', required: true, inputType: 'text', placeholder: 'Trade name, date of inception', displayOrder: 6 },
      { title: 'Business address proof', category: 'Business Proof', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], description: 'Electricity bill / Rent agreement / Property deed', displayOrder: 7 },
      { title: 'Bank account details', category: 'Banking Information', required: true, inputType: 'text', placeholder: 'Bank Account Number, Bank Name, IFSC code', displayOrder: 8 },
      { title: 'Cancelled cheque / bank proof', category: 'Banking Information', required: false, inputType: 'file', condition: 'as applicable', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 9 },
      // Conditional for Company/LLP
      { title: 'Company/LLP incorporation documents', category: 'Corporate Documents', required: false, inputType: 'file', condition: 'if Company, LLP or Partnership', conditionField: 'entityType', conditionValue: 'Company,LLP,Partnership', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 10 },
      { title: 'DSC (Digital Signature Certificate)', category: 'Corporate Documents', required: false, inputType: 'file', condition: 'where applicable for entity type', conditionField: 'entityType', conditionValue: 'Company,LLP', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 11 }
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
      { title: 'Aadhaar', category: 'Identity & Authentication', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], description: 'Aadhaar of Proprietor / Director / Partner', displayOrder: 1 },
      { title: 'PAN', category: 'Identity & Authentication', required: true, inputType: 'file', acceptedFormats: ['PDF', 'JPG', 'PNG'], description: 'PAN of Proprietor or Business Enterprise', displayOrder: 2 },
      { title: 'Mobile number', category: 'Identity & Authentication', required: true, inputType: 'text', placeholder: '10-digit mobile number linked with Aadhaar', displayOrder: 3 },
      { title: 'Business name', category: 'Enterprise Details', required: true, inputType: 'text', placeholder: 'Official legal trade name of the enterprise', displayOrder: 4 },
      { title: 'Business address', category: 'Enterprise Details', required: true, inputType: 'textarea', placeholder: 'Complete plant / office address including pincode', displayOrder: 5 },
      { title: 'Business activity/nature of business', category: 'Enterprise Details', required: true, inputType: 'select', options: ['Manufacturing', 'Services', 'Trading'], displayOrder: 6 },
      { title: 'Bank account details', category: 'Banking Information', required: true, inputType: 'text', placeholder: 'Bank Account Number & IFSC code', displayOrder: 7 },
      { title: 'Number of employees', category: 'Operations & Scale', required: true, inputType: 'number', placeholder: 'Total employees (male + female)', displayOrder: 8 },
      { title: 'Investment/turnover information', category: 'Operations & Scale', required: false, inputType: 'text', condition: 'where required', placeholder: 'Approximate investment in plant & machinery and turnover', displayOrder: 9 },
      { title: 'Additional business document / electricity bill', category: 'Optional Documents', required: false, inputType: 'file', condition: 'optional / if available', acceptedFormats: ['PDF', 'JPG', 'PNG'], displayOrder: 10 }
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
