/**
 * Centralized Frequently Asked Questions
 * Reusable across destinations and support pages
 */

export const GENERAL_FAQS = [
  {
    q: 'How does NimuFly process my visa online?',
    a: 'Simply select your destination, fill in minimal traveller details, upload clear document scans, and pay securely. Our verified immigration experts inspect your application before final submission to foreign consulates.'
  },
  {
    q: 'Can I track my application in real-time?',
    a: 'Yes. Once submitted, your application appears inside your My Account portal with live status updates, direct consulate messaging, and instant notification when your e-visa is issued.'
  },
  {
    q: 'What happens if the consulate asks for additional documents?',
    a: 'If any embassy or consulate requires updated information, your application status updates to "Additional Information Required" with an explicit message and a 1-click re-upload action.'
  },
  {
    q: 'How will I receive my approved visa?',
    a: 'Approved e-visas are sent directly to your registered email address and are also downloadable as official PDF travel documents inside your My Account dashboard.'
  }
];

export const DESTINATION_FAQS = {
  thailand: [
    { q: 'Can Indian passport holders get Thailand e-Visa?', a: 'Yes, Thailand e-Visa is fully available for Indian citizens with expedited processing.' },
    { q: 'What is the stay duration for a single entry?', a: 'The standard tourist e-visa grants up to 60 days stay per entry.' }
  ],
  uae: [
    { q: 'How fast is UAE visa approval?', a: 'Standard approvals take 24 to 48 hours; express turnaround takes 6 to 12 hours.' },
    { q: 'Is a hotel booking mandatory for Dubai E-Visa?', a: 'A confirmed hotel reservation or resident sponsor address is required prior to departure.' }
  ],
  'sri-lanka': [
    { q: 'Is Sri Lanka ETA processed online?', a: 'Yes, 100% online with direct electronic passport authorization.' },
    { q: 'Can I enter Sri Lanka multiple times with an ETA?', a: 'The tourist ETA allows double entry within 30 days of first arrival.' }
  ],
  malaysia: [
    { q: 'Who is eligible for Malaysia MDAC / E-Visa?', a: 'Most international tourists can apply online. Ensure your passport has at least 6 months validity.' }
  ],
  singapore: [
    { q: 'Is Singapore e-Visa a sticker or electronic paper?', a: 'Singapore issues an official Electronic Visa (e-Visa) PDF that you print and carry with your passport.' },
    { q: 'What is the standard validity for Singapore Tourist Visa?', a: 'Tourist visas are typically granted with multiple entries valid from 30 days up to 2 years.' }
  ],
  vietnam: [
    { q: 'How long does Vietnam e-visa processing take?', a: 'Standard processing takes 3 to 5 business days from successful document verification.' }
  ]
};
