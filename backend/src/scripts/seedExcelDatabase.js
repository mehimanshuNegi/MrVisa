import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Country } from '../models/Country.js';
import { Visa } from '../models/Visa.js';
import { generateSlug } from '../services/country.service.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard ISO and metadata dictionary for countries
export const COUNTRY_META = {
  georgia: { code: 'GE', flagEmoji: '🇬🇪', name: 'Georgia', image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1000&q=85' },
  russia: { code: 'RU', flagEmoji: '🇷🇺', name: 'Russia', image: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=1000&q=85' },
  azerbaijan: { code: 'AZ', flagEmoji: '🇦🇿', name: 'Azerbaijan', image: 'https://images.unsplash.com/photo-1579294800821-69fc70181514?auto=format&fit=crop&w=1000&q=85' },
  thailand: { code: 'TH', flagEmoji: '🇹🇭', name: 'Thailand', image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1000&q=85' },
  malaysia: { code: 'MY', flagEmoji: '🇲🇾', name: 'Malaysia', image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1000&q=85' },
  vietnam: { code: 'VN', flagEmoji: '🇻🇳', name: 'Vietnam', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1000&q=85' },
  cambodia: { code: 'KH', flagEmoji: '🇰🇭', name: 'Cambodia', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85' },
  bahrain: { code: 'BH', flagEmoji: '🇧🇭', name: 'Bahrain', image: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?auto=format&fit=crop&w=1000&q=85' },
  indonesia: { code: 'ID', flagEmoji: '🇮🇩', name: 'Indonesia', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=85' },
  'sri-lanka': { code: 'LK', flagEmoji: '🇱🇰', name: 'Sri Lanka', image: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=1000&q=85' },
  uzbekistan: { code: 'UZ', flagEmoji: '🇺🇿', name: 'Uzbekistan', image: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c3f?auto=format&fit=crop&w=1000&q=85' },
  kenya: { code: 'KE', flagEmoji: '🇰🇪', name: 'Kenya', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1000&q=85' },
  egypt: { code: 'EG', flagEmoji: '🇪🇬', name: 'Egypt', image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1000&q=85' },
  oman: { code: 'OM', flagEmoji: '🇴🇲', name: 'Oman', image: 'https://images.unsplash.com/photo-1578895101403-82a1740954b0?auto=format&fit=crop&w=1000&q=85' },
  maldives: { code: 'MV', flagEmoji: '🇲🇻', name: 'Maldives', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1000&q=85' },
  mauritius: { code: 'MU', flagEmoji: '🇲🇺', name: 'Mauritius', image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1000&q=85' },
  qatar: { code: 'QA', flagEmoji: '🇶🇦', name: 'Qatar', image: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=1000&q=85' },
  jordan: { code: 'JO', flagEmoji: '🇯🇴', name: 'Jordan', image: 'https://images.unsplash.com/photo-1579606032834-4d872740a187?auto=format&fit=crop&w=1000&q=85' },
  philippines: { code: 'PH', flagEmoji: '🇵🇭', name: 'Philippines', image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1000&q=85' },
  'saudi-arabia': { code: 'SA', flagEmoji: '🇸🇦', name: 'Saudi Arabia', image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=1000&q=85' },
  kyrgyzstan: { code: 'KG', flagEmoji: '🇰🇬', name: 'Kyrgyzstan', image: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&w=1000&q=85' },
  laos: { code: 'LA', flagEmoji: '🇱🇦', name: 'Laos', image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1000&q=85' },
  mongolia: { code: 'MN', flagEmoji: '🇲🇳', name: 'Mongolia', image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=1000&q=85' },
  ethiopia: { code: 'ET', flagEmoji: '🇪🇹', name: 'Ethiopia', image: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1000&q=85' },
  tajikistan: { code: 'TJ', flagEmoji: '🇹🇯', name: 'Tajikistan', image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1000&q=85' },
  madagascar: { code: 'MG', flagEmoji: '🇲🇬', name: 'Madagascar', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85' },
  'united-arab-emirates': { code: 'AE', flagEmoji: '🇦🇪', name: 'United Arab Emirates', displayName: 'Dubai / United Arab Emirates', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1000&q=85' }
};

/**
 * Maps raw Excel visa type text to backend model enum value:
 * ['E-Visa', 'Tourist Visa', 'Sticker Visa', 'Business Visa', 'Transit Visa', 'Arrival Card']
 */
export function mapVisaTypeToEnum(rawVisaType) {
  const str = String(rawVisaType || '').trim().toLowerCase();
  if (
    str.includes('arrival card') ||
    str.includes('declaration') ||
    str.includes('digital form') ||
    str.includes('tdac') ||
    str.includes('mdac')
  ) {
    return 'Arrival Card';
  }
  if (str.includes('tourist') || str.includes('tourism')) {
    return 'Tourist Visa';
  }
  if (str.includes('sticker')) {
    return 'Sticker Visa';
  }
  if (str.includes('business')) {
    return 'Business Visa';
  }
  if (str.includes('transit')) {
    return 'Transit Visa';
  }
  // Standard electronic visas, ETAs, paperless
  return 'E-Visa';
}

/**
 * Normalize Country string from Excel
 */
export function normalizeCountryInput(rawCountry) {
  const trimmed = String(rawCountry || '').trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes('dubai') || lower.includes('united arab emirates')) {
    return {
      name: 'United Arab Emirates',
      displayName: 'Dubai / United Arab Emirates',
      slug: 'united-arab-emirates'
    };
  }
  return {
    name: trimmed,
    displayName: trimmed,
    slug: generateSlug(trimmed)
  };
}

/**
 * Find Excel file across likely project locations
 */
export function findExcelFilePath(customPath = null) {
  const candidates = [
    ...(customPath ? [path.resolve(customPath)] : []),
    path.resolve(process.cwd(), 'NimuFly_Visa_Database_Government_Fees_Matched.xlsx'),
    path.resolve(process.cwd(), 'NimuFly_Visa_Database.xlsx'),
    path.resolve(__dirname, '../../../NimuFly_Visa_Database_Government_Fees_Matched.xlsx'),
    path.resolve(__dirname, '../../../NimuFly_Visa_Database.xlsx'),
    path.resolve(__dirname, '../../NimuFly_Visa_Database_Government_Fees_Matched.xlsx'),
    path.resolve(__dirname, '../../NimuFly_Visa_Database.xlsx'),
    'C:\\Users\\Acer\\Desktop\\MRVisa\\NimuFly_Visa_Database_Government_Fees_Matched.xlsx',
    'C:\\Users\\Acer\\Desktop\\MRVisa\\NimuFly_Visa_Database.xlsx',
    'C:\\Users\\Acer\\Desktop\\NimuFly_Visa_Database.xlsx'
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Excel file not found. Checked candidate paths:\n  - ${candidates.join('\n  - ')}`);
}

/**
 * Primary seed & import function
 */
export async function seedExcelDatabase(filePath = null) {
  console.log('================================================================');
  console.log('🚀 NIMUFLY DATABASE SEED & IMPORT: EXCEL → MONGODB ATLAS');
  console.log('================================================================');

  // 1. Locate and validate Excel file
  const excelPath = findExcelFilePath(filePath);
  console.log(`✓ Located Excel data source: ${excelPath}`);

  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet);

  console.log(`✓ Loaded sheet "${sheetName}" with ${rawRows.length} total rows`);

  if (!rawRows || rawRows.length === 0) {
    throw new Error('Excel sheet contains no data rows.');
  }

  // 2. Validate expected columns
  const firstRow = rawRows[0];
  const requiredColumns = ['Country', 'Visa Type', 'Government Fee (INR)'];
  const missingColumns = requiredColumns.filter((col) => !(col in firstRow));
  if (missingColumns.length > 0) {
    throw new Error(`Required columns missing from Excel: ${missingColumns.join(', ')}`);
  }

  // 3. Connect to existing MongoDB Atlas database
  const conn = await connectDatabase();
  const dbHost = conn.host || conn.connection?.host || 'MongoDB Atlas';
  const dbName = conn.name || conn.connection?.name || 'test';
  console.log(`✓ Connected to MongoDB Atlas host: ${dbHost}`);
  console.log(`✓ Target database: ${dbName}`);

  // Ensure collection indexes exist
  await Country.syncIndexes();
  await Visa.syncIndexes();
  console.log('✓ Model indexes synchronized safely');

  // Tracking counters and anomaly records
  let rowsProcessed = 0;
  let rowsSkipped = 0;
  let countriesCreated = 0;
  let countriesUpdated = 0;
  let visasCreated = 0;
  let visasUpdated = 0;
  const anomalies = [];
  const manualReview = [];
  const processedCountrySlugs = new Set();
  const processedVisaSlugs = new Set();

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const rowNum = idx + 2; // Excel 1-based index (Header is row 1)
    rowsProcessed++;

    const rawCountry = row['Country'];
    if (!rawCountry || !String(rawCountry).trim()) {
      rowsSkipped++;
      anomalies.push({ row: rowNum, issue: 'Row missing Country name. Skipped.' });
      continue;
    }

    const { name: countryName, displayName: countryDisplayName, slug: countrySlug } = normalizeCountryInput(rawCountry);
    const meta = COUNTRY_META[countrySlug] || {
      code: countryName.substring(0, 2).toUpperCase(),
      flagEmoji: '🌍',
      name: countryName,
      displayName: countryDisplayName,
      image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=85'
    };

    // 4. Upsert Country document
    let country = await Country.findOne({
      $or: [
        { slug: countrySlug },
        { name: countryName },
        { code: meta.code }
      ]
    });

    if (!country) {
      country = await Country.create({
        name: countryName,
        displayName: countryDisplayName || meta.displayName || countryName,
        slug: countrySlug,
        code: meta.code,
        flagEmoji: meta.flagEmoji,
        flagUrl: meta.code.length === 2 ? `https://flagcdn.com/w80/${meta.code.toLowerCase()}.png` : '',
        image: meta.image,
        description: `Explore travel requirements and visa offerings for ${countryName}.`,
        isActive: true,
        isDeleted: false
      });
      countriesCreated++;
    } else {
      // Update existing country record without overwriting unrelated admin flags
      let updated = false;
      if (!country.displayName && countryDisplayName) {
        country.displayName = countryDisplayName;
        updated = true;
      }
      if (!country.flagUrl && meta.code) {
        country.flagUrl = `https://flagcdn.com/w80/${meta.code.toLowerCase()}.png`;
        updated = true;
      }
      if (!country.image && meta.image) {
        country.image = meta.image;
        updated = true;
      }
      if (updated) {
        await country.save();
      }
      countriesUpdated++;
    }
    processedCountrySlugs.add(countrySlug);

    // 5. Parse Visa Fields
    const rawVisaType = String(row['Visa Type'] || 'E-Visa').trim();
    const visaTypeEnum = mapVisaTypeToEnum(rawVisaType);

    const lengthOfStay = String(row['Length of Stay'] || '30 days').trim();
    const visaValidity = String(row['Visa Validity'] || '90 days').trim();

    // Entry Type handling
    let entryType = 'Single Entry';
    const rawEntry = row['Entry Type'];
    if (rawEntry) {
      const lowerEntry = String(rawEntry).trim().toLowerCase();
      if (lowerEntry === 'single' || lowerEntry === 'single entry') {
        entryType = 'Single Entry';
      } else if (lowerEntry === 'multiple' || lowerEntry === 'multiple entry') {
        entryType = 'Multiple Entry';
      } else if (lowerEntry === 'double' || lowerEntry === 'double entry') {
        entryType = 'Double Entry';
      }
    } else {
      // Arrival cards default to Single Entry per schema
      entryType = 'Single Entry';
    }

    const processingTime = String(row['Processing Time'] || '3–5 Days').trim();

    // Exact Government Fee handling
    const rawGovFee = row['Government Fee (INR)'];
    let governmentFee = 0;
    if (rawGovFee !== undefined && rawGovFee !== null && !isNaN(Number(rawGovFee))) {
      governmentFee = Number(rawGovFee);
    } else {
      manualReview.push({
        row: rowNum,
        country: countryName,
        field: 'Government Fee (INR)',
        issue: `Government fee is undefined or invalid ("${rawGovFee}"). Recorded as 0 for manual review.`
      });
      governmentFee = 0;
    }

    // Required documents parsing - strict adherence to source of truth
    const rawDocs = row['Required Documents'];
    let requiredDocuments = [];
    if (rawDocs && typeof rawDocs === 'string' && rawDocs.trim()) {
      requiredDocuments = rawDocs
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean);
    } else {
      // Preserve missing state per strict instructions: do NOT invent documents
      requiredDocuments = [];
      anomalies.push({
        row: rowNum,
        country: countryName,
        issue: 'Required Documents omitted in Excel row. Preserved as empty list [] without inventing documents.'
      });
    }

    // Document category & summary
    let documentCategory = 'Standard';
    let documentsSummary = '';
    if (requiredDocuments.length === 0) {
      documentCategory = 'None Specified';
      documentsSummary = 'No specific documents specified';
    } else {
      const isOnlyPassport = requiredDocuments.every((d) => {
        const lower = d.toLowerCase();
        return lower.includes('passport') || lower.includes('photo') || lower.includes('photograph');
      });
      documentCategory = isOnlyPassport ? 'Only Passport' : 'Passport & Supporting Documents';
      documentsSummary = requiredDocuments.slice(0, 2).join(', ');
    }

    // Additional info & descriptions
    const additionalInfo = String(row['Additional Information'] || '').trim();

    // Title construction
    let title = '';
    if (rawVisaType.toLowerCase().includes(countryName.toLowerCase())) {
      title = rawVisaType;
    } else if (rawVisaType.toLowerCase() === 'tourism' || rawVisaType.toLowerCase() === 'visa (tourism)') {
      title = `${countryName} Tourist Visa`;
    } else {
      title = `${countryName} ${rawVisaType}`;
    }

    // Stable deterministic slug for idempotency
    const visaSlug = generateSlug(`${countrySlug}-${rawVisaType}-${lengthOfStay}`);

    if (processedVisaSlugs.has(visaSlug)) {
      anomalies.push({
        row: rowNum,
        country: countryName,
        issue: `Duplicate visa offering detected in sheet with slug "${visaSlug}". Will upsert into existing record.`
      });
    }
    processedVisaSlugs.add(visaSlug);

    // 6. Upsert Visa document
    let existingVisa = await Visa.findOne({
      $or: [
        { slug: visaSlug },
        { country: country._id, title }
      ]
    });

    if (existingVisa) {
      // Update values from Excel, preserving admin-managed fields such as custom serviceFee or FAQs
      existingVisa.governmentFee = governmentFee;
      existingVisa.stayPeriod = lengthOfStay;
      existingVisa.validity = visaValidity;
      existingVisa.entryType = entryType;
      existingVisa.processingTime = processingTime;
      existingVisa.requiredDocuments = requiredDocuments;
      existingVisa.documentCategory = documentCategory;
      existingVisa.documentsSummary = documentsSummary;
      if (additionalInfo) {
        existingVisa.description = additionalInfo;
        existingVisa.shortDescription = additionalInfo;
      }
      await existingVisa.save();
      visasUpdated++;
    } else {
      // Initial creation with standard default service fee
      const initialServiceFee = governmentFee === 0 && visaTypeEnum === 'Arrival Card' ? 500 : 1200;

      await Visa.create({
        country: country._id,
        slug: visaSlug,
        title,
        displayName: countryDisplayName || countryName,
        visaType: visaTypeEnum,
        description: additionalInfo || `Fast, guaranteed ${countryName} ${rawVisaType} processing with NimuFly.`,
        shortDescription: additionalInfo || `${countryName} ${rawVisaType} - stay up to ${lengthOfStay}.`,
        stayPeriod: lengthOfStay,
        validity: visaValidity,
        entryType,
        processingTime,
        governmentFee,
        serviceFee: initialServiceFee,
        currency: 'INR',
        documentCategory,
        documentsSummary,
        requiredDocuments,
        image: country.image,
        isActive: true,
        isDeleted: false
      });
      visasCreated++;
    }
  }

  // 7. Verify counts in MongoDB Atlas
  const finalCountryCount = await Country.countDocuments({ isDeleted: false });
  const finalVisaCount = await Visa.countDocuments({ isDeleted: false });

  console.log('================================================================');
  console.log('🎉 SEEDING & IMPORT REPORT (MONGODB ATLAS)');
  console.log('================================================================');
  console.log(`Database Name:            ${dbName}`);
  console.log(`Excel Rows Processed:     ${rowsProcessed}`);
  console.log(`Rows Skipped:             ${rowsSkipped}`);
  console.log(`Countries in Sheet:       ${processedCountrySlugs.size}`);
  console.log(`Countries Created:        ${countriesCreated}`);
  console.log(`Countries Updated:        ${countriesUpdated}`);
  console.log(`Total Countries in DB:    ${finalCountryCount}`);
  console.log(`Visas Created:            ${visasCreated}`);
  console.log(`Visas Updated:            ${visasUpdated}`);
  console.log(`Total Visas in DB:        ${finalVisaCount}`);
  console.log(`Rows Flagged / Notes:     ${anomalies.length}`);
  console.log(`Manual Review Required:   ${manualReview.length}`);
  console.log('================================================================');

  if (anomalies.length > 0) {
    console.log('⚠️ Flagged Field Details:');
    anomalies.forEach((a) => console.log(`   - [Row ${a.row}] ${a.country || ''}: ${a.issue}`));
  }

  if (manualReview.length > 0) {
    console.log('⚠️ Manual Review Items:');
    manualReview.forEach((m) => console.log(`   - [Row ${m.row}] ${m.country} (${m.field}): ${m.issue}`));
  }

  return {
    database: dbName,
    rowsProcessed,
    rowsSkipped,
    countriesFound: processedCountrySlugs.size,
    countriesCreated,
    countriesUpdated,
    totalCountriesInDb: finalCountryCount,
    visasCreated,
    visasUpdated,
    totalVisasInDb: finalVisaCount,
    anomalies,
    manualReview
  };
}

// Standalone execution support
if (process.argv[1] && process.argv[1].endsWith('seedExcelDatabase.js')) {
  (async () => {
    try {
      const customFile = process.argv[2] || null;
      await seedExcelDatabase(customFile);
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      logger.error('Excel database seed failed:', { error: err.message, stack: err.stack });
      console.error('Fatal error during seed execution:', err);
      process.exit(1);
    }
  })();
}

export default seedExcelDatabase;
