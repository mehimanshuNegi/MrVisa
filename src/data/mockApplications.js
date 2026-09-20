/**
 * Centralized Mock Applications Data
 * Data-driven applications referencing mockVisas, with status enums,
 * dynamic admin messages, and required actions.
 */

import { APPLICATION_STATUS, REQUIRED_ACTION } from '../models/status';

export const mockApplications = [
  {
    id: 'MV-10284',
    userId: 'usr_guest_01',
    visaId: 'uae',
    countryId: 'united-arab-emirates',
    countryName: 'United Arab Emirates',
    destination: 'United Arab Emirates',
    flagEmoji: '🇦🇪',
    visaType: 'E-Visa',
    travellerCount: 2,
    travellers: [
      {
        id: 'trav_101',
        name: 'Rahul Sharma',
        firstName: 'Rahul',
        lastName: 'Sharma',
        passportNumber: 'M8921456',
        nationality: 'Indian',
        dob: '15 May 1992',
        gender: 'Male'
      },
      {
        id: 'trav_102',
        name: 'Priya Sharma',
        firstName: 'Priya',
        lastName: 'Sharma',
        passportNumber: 'P7421983',
        nationality: 'Indian',
        dob: '20 Aug 1994',
        gender: 'Female'
      }
    ],
    documents: [
      { id: 'doc_1', name: 'Passport Color Scans (Front & Back)', status: 'Verified' },
      { id: 'doc_2', name: 'Passport-Size Photographs', status: 'Verified' }
    ],
    submittedDate: '20 Sep 2026',
    submittedAt: '2026-09-20T10:30:00Z',
    status: APPLICATION_STATUS.APPLICATION_RECEIVED,
    expectedDate: '24 Sep 2026, 4:00 PM',
    amountPaid: '₹5,980',
    amount: '₹5,980',
    adminMessage: 'Application received and securely registered with consulate queue.',
    requiredAction: REQUIRED_ACTION.NONE,
    timeline: [
      { stage: 'Application Submitted', completed: true, timestamp: '20 Sep 2026, 10:30 AM' },
      { stage: 'Documents Verified', completed: false, current: false },
      { stage: 'Application Processing', completed: false, current: false },
      { stage: 'Visa Issued', completed: false, current: false }
    ]
  },
  {
    id: 'MV-20491',
    userId: 'usr_guest_01',
    visaId: 'thailand',
    countryId: 'thailand',
    countryName: 'Thailand',
    destination: 'Thailand',
    flagEmoji: '🇹🇭',
    visaType: 'E-Visa',
    travellerCount: 1,
    travellers: [
      {
        id: 'trav_201',
        name: 'Rahul Sharma',
        firstName: 'Rahul',
        lastName: 'Sharma',
        passportNumber: 'M8921456',
        nationality: 'Indian',
        dob: '15 May 1992',
        gender: 'Male'
      }
    ],
    documents: [
      { id: 'doc_3', name: 'Passport Bio Page', status: 'Verified' },
      { id: 'doc_4', name: 'Digital Photo', status: 'Verified' },
      { id: 'doc_5', name: 'Confirmed Flight Ticket', status: 'Verified' }
    ],
    submittedDate: '18 Sep 2026',
    submittedAt: '2026-09-18T14:15:00Z',
    status: APPLICATION_STATUS.PROCESSING,
    expectedDate: '22 Sep 2026, 12:00 PM',
    amountPaid: '₹2,990',
    amount: '₹2,990',
    adminMessage: 'Under active review with immigration authorities in Bangkok.',
    requiredAction: REQUIRED_ACTION.NONE,
    timeline: [
      { stage: 'Application Submitted', completed: true, timestamp: '18 Sep 2026, 2:15 PM' },
      { stage: 'Documents Verified', completed: true, timestamp: '19 Sep 2026, 11:00 AM' },
      { stage: 'Application Processing', completed: false, current: true },
      { stage: 'Visa Issued', completed: false, current: false }
    ]
  },
  {
    id: 'MV-39120',
    userId: 'usr_guest_01',
    visaId: 'singapore',
    countryId: 'singapore',
    countryName: 'Singapore',
    destination: 'Singapore',
    flagEmoji: '🇸🇬',
    visaType: 'E-Visa',
    travellerCount: 1,
    travellers: [
      {
        id: 'trav_301',
        name: 'Rahul Sharma',
        firstName: 'Rahul',
        lastName: 'Sharma',
        passportNumber: 'M8921456',
        nationality: 'Indian',
        dob: '15 May 1992',
        gender: 'Male'
      }
    ],
    documents: [
      { id: 'doc_6', name: 'Passport Scan', status: 'Verified' },
      { id: 'doc_7', name: 'Photograph', status: 'Verified' },
      { id: 'doc_8', name: 'Bank Statement', status: 'Verified' }
    ],
    submittedDate: '10 Sep 2026',
    submittedAt: '2026-09-10T09:00:00Z',
    status: APPLICATION_STATUS.VISA_ISSUED,
    expectedDate: '14 Sep 2026',
    amountPaid: '₹3,450',
    amount: '₹3,450',
    adminMessage: 'Visa approved and official electronic travel permit generated.',
    requiredAction: REQUIRED_ACTION.VIEW_VISA,
    visaDocNumber: 'SG-EV-2026-99214',
    validUntil: '10 Dec 2026',
    entryType: 'Multiple Entries • Tourist',
    timeline: [
      { stage: 'Application Submitted', completed: true, timestamp: '10 Sep 2026, 9:00 AM' },
      { stage: 'Documents Verified', completed: true, timestamp: '11 Sep 2026, 2:00 PM' },
      { stage: 'Application Processing', completed: true, timestamp: '13 Sep 2026, 11:30 AM' },
      { stage: 'Visa Issued', completed: true, timestamp: '14 Sep 2026, 10:45 AM' }
    ]
  },
  {
    id: 'MV-48902',
    userId: 'usr_guest_01',
    visaId: 'vietnam',
    countryId: 'vietnam',
    countryName: 'Vietnam',
    destination: 'Vietnam',
    flagEmoji: '🇻🇳',
    visaType: 'E-Visa',
    travellerCount: 1,
    travellers: [
      {
        id: 'trav_401',
        name: 'Rahul Sharma',
        firstName: 'Rahul',
        lastName: 'Sharma',
        passportNumber: 'M8921456',
        nationality: 'Indian',
        dob: '15 May 1992',
        gender: 'Male'
      }
    ],
    documents: [
      { id: 'doc_9', name: 'Passport Bio Page', status: 'Verified' },
      {
        id: 'doc_10',
        name: 'Photograph',
        status: 'Needs Re-upload',
        note: 'Photograph must have a plain white background.'
      }
    ],
    submittedDate: '19 Sep 2026',
    submittedAt: '2026-09-19T16:40:00Z',
    status: APPLICATION_STATUS.ADDITIONAL_INFORMATION_REQUIRED,
    expectedDate: '23 Sep 2026',
    amountPaid: '₹2,190',
    amount: '₹2,190',
    adminMessage: 'Embassy requested an updated photograph.',
    requiredAction: REQUIRED_ACTION.UPDATE_PHOTO,
    timeline: [
      { stage: 'Application Submitted', completed: true, timestamp: '19 Sep 2026, 4:40 PM' },
      { stage: 'Documents Verified', completed: false, current: true, actionRequired: true },
      { stage: 'Application Processing', completed: false, current: false },
      { stage: 'Visa Issued', completed: false, current: false }
    ]
  }
];
