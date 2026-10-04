/**
 * Central Destination & Visa Filter Pipeline
 * Architecture:
 * UI (Header, Visa Listing, Mobile Search)
 *   ↓
 * filterDestinations / searchCountryDestinations (Pipeline)
 *   ↓
 * countryService / visaService
 *   ↓
 * Mock Data (now) / Spring Boot REST API (future)
 */

/**
 * Normalizes visa type strings for exact, data-driven comparisons.
 * Eliminates substring collisions (e.g., prevents Tourist Visa from matching E-Visa).
 */
export function normalizeVisaType(rawType) {
  if (!rawType) return 'all';
  const str = String(rawType).trim().toLowerCase();
  if (
    str === 'all' ||
    str === 'all visa types' ||
    str === 'all types' ||
    str === 'any' ||
    str === ''
  ) {
    return 'all';
  }
  if (str === 'e-visa' || str === 'evisa' || str === 'e visa') {
    return 'e-visa';
  }
  if (str === 'tourist visa' || str === 'tourist') {
    return 'tourist visa';
  }
  if (str === 'sticker visa' || str === 'sticker') {
    return 'sticker visa';
  }
  if (str === 'business visa' || str === 'business') {
    return 'business visa';
  }
  if (str === 'transit visa' || str === 'transit') {
    return 'transit visa';
  }
  return str;
}

/**
 * Normalizes country strings for filter comparisons.
 */
export function normalizeCountryName(rawCountry) {
  if (!rawCountry) return 'all';
  const str = String(rawCountry).trim().toLowerCase();
  if (
    str === 'all' ||
    str === 'all countries' ||
    str === 'any country' ||
    str === 'all destinations' ||
    str === 'anywhere' ||
    str === ''
  ) {
    return 'all';
  }
  return str;
}

/**
 * Filters visa cards for page views (Homepage DestinationSection, Visa Listing Page)
 */
export function filterDestinations({
  visas = [],
  countries = [],
  searchQuery = '',
  selectedCountry = 'All Countries',
  selectedVisaType = 'All Visa Types',
  statusFilter = 'ACTIVE'
}) {
  if (!Array.isArray(visas)) return [];

  // 1. Build Country lookup map by id, aliasId, name, displayName, and ISO code
  const countryMap = new Map();
  if (Array.isArray(countries)) {
    countries.forEach((c) => {
      if (!c) return;
      if (c.id) countryMap.set(String(c.id).toLowerCase(), c);
      if (c.aliasId) countryMap.set(String(c.aliasId).toLowerCase(), c);
      if (c.name) countryMap.set(String(c.name).toLowerCase(), c);
      if (c.displayName) countryMap.set(String(c.displayName).toLowerCase(), c);
      if (c.code) countryMap.set(String(c.code).toLowerCase(), c);
    });
  }

  // 2. Link visas with their resolved country details safely
  const linkedItems = visas.map((v) => {
    const rawCountryId = String(v.countryId || '').toLowerCase();
    const rawCountryName = String(v.displayName || v.countryName || v.country || '').toLowerCase();

    const matchedCountry =
      countryMap.get(rawCountryId) ||
      countryMap.get(rawCountryName) ||
      null;

    const displayName = String(
      v.displayName ||
      v.countryName ||
      matchedCountry?.displayName ||
      matchedCountry?.name ||
      v.country ||
      ''
    ).trim();

    const countryName = String(matchedCountry?.name || v.countryName || displayName).trim();
    const countryCode = String(matchedCountry?.code || v.code || '').trim();
    const countryAliases = String(matchedCountry?.aliasId || v.aliasId || '').trim();
    const countryStatus = String(matchedCountry?.status || 'ACTIVE').trim().toUpperCase();
    const visaStatus = String(v.status || 'ACTIVE').trim().toUpperCase();
    const countryId = String(matchedCountry?.id || v.countryId || rawCountryId).trim();
    const routeId = String(v.id || countryId || displayName.toLowerCase().replace(/\s+/g, '-')).trim();

    return {
      ...v,
      countryId,
      countryName,
      displayName,
      countryCode,
      countryAliases,
      countryStatus,
      visaStatus,
      routeId,
      flagUrl: v.flagUrl || matchedCountry?.flagUrl || '',
      flagEmoji: v.flagEmoji || matchedCountry?.flagEmoji || '🌍'
    };
  });

  // 3. Prepare normalized filter parameters
  const rawCountryFilter = normalizeCountryName(selectedCountry);
  const isAllCountries = rawCountryFilter === 'all';

  // Resolve target country ID from the countries map if a country name/alias was selected
  const matchedFilterCountry = !isAllCountries ? countryMap.get(rawCountryFilter) : null;
  const targetCountryId =
    matchedFilterCountry?.id?.toLowerCase() ||
    (!isAllCountries ? rawCountryFilter : null);

  const cleanQuery = String(searchQuery || '').trim().toLowerCase();
  const normalizedTargetVisaType = normalizeVisaType(selectedVisaType);

  // 4. PIPELINE FILTERING (Explicitly calculated, scope-safe conditions)
  return linkedItems.filter((item) => {
    // Stage 1: Active / Available Status Filter
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && item.countryStatus === 'ACTIVE' && item.visaStatus === 'ACTIVE') ||
      (statusFilter === 'INACTIVE' && (item.countryStatus !== 'ACTIVE' || item.visaStatus !== 'ACTIVE'));

    // Stage 2: Destination / Country Filter (Filters the cards on the page)
    const matchesCountry =
      isAllCountries ||
      !targetCountryId ||
      String(item.countryId || '').trim().toLowerCase() === targetCountryId ||
      String(item.countryName || '').trim().toLowerCase() === rawCountryFilter ||
      String(item.displayName || '').trim().toLowerCase() === rawCountryFilter ||
      String(item.countryCode || '').trim().toLowerCase() === rawCountryFilter ||
      String(item.countryAliases || '').trim().toLowerCase() === rawCountryFilter ||
      String(item.countryAliases || '').trim().toLowerCase() === targetCountryId ||
      String(item.routeId || '').trim().toLowerCase() === targetCountryId;

    // Stage 3: Exact Visa Type Filter (Data-Driven, No loose substring or unrelated field checks)
    const normalizedItemVisaType = normalizeVisaType(item.visaType);
    const matchesVisaType =
      normalizedTargetVisaType === 'all' ||
      normalizedItemVisaType === normalizedTargetVisaType;

    // Stage 4: Page Search Filter (Keyword matching on destination/country)
    const matchesSearch =
      !cleanQuery ||
      String(item.displayName || '').toLowerCase().includes(cleanQuery) ||
      String(item.countryName || '').toLowerCase().includes(cleanQuery) ||
      String(item.countryCode || '').toLowerCase().includes(cleanQuery) ||
      String(item.countryId || '').toLowerCase().includes(cleanQuery);

    return matchesStatus && matchesCountry && matchesVisaType && matchesSearch;
  });
}

/**
 * Header Country Search / Autocomplete Suggestions Pipeline
 * Strictly for country/destination discovery & navigation.
 * Independent of page-level visa filters.
 */
export function searchCountryDestinations({
  query = '',
  countries = [],
  visas = []
}) {
  const cleanQuery = String(query || '').trim().toLowerCase();
  if (!cleanQuery) return [];

  // Build lookup map for associated visa offerings to enrich country cards
  const visaMap = new Map();
  if (Array.isArray(visas)) {
    visas.forEach((v) => {
      if (!v) return;
      const vId = String(v.id || '').toLowerCase();
      const vCountryId = String(v.countryId || '').toLowerCase();
      const vCountryName = String(v.displayName || v.countryName || v.country || '').toLowerCase();
      if (vId && !visaMap.has(vId)) visaMap.set(vId, v);
      if (vCountryId && !visaMap.has(vCountryId)) visaMap.set(vCountryId, v);
      if (vCountryName && !visaMap.has(vCountryName)) visaMap.set(vCountryName, v);
    });
  }

  if (!Array.isArray(countries) || countries.length === 0) {
    return [];
  }

  const results = [];

  for (const country of countries) {
    if (!country) continue;

    const countryName = String(country.name || country.displayName || '').trim();
    const countryNameLower = countryName.toLowerCase();
    const countryCodeLower = String(country.code || '').trim().toLowerCase();
    const countryIdLower = String(country.id || '').trim().toLowerCase();
    const aliasIdLower = String(country.aliasId || '').trim().toLowerCase();

    // Match against country name, ISO code, alias, or id
    const matchesName = countryNameLower.includes(cleanQuery);
    const matchesCode = countryCodeLower === cleanQuery || countryCodeLower.startsWith(cleanQuery);
    const matchesAlias = aliasIdLower === cleanQuery || aliasIdLower.includes(cleanQuery);
    const matchesId = countryIdLower === cleanQuery || countryIdLower.includes(cleanQuery);

    if (matchesName || matchesCode || matchesAlias || matchesId) {
      const associatedVisa =
        visaMap.get(countryIdLower) ||
        visaMap.get(aliasIdLower) ||
        visaMap.get(countryNameLower) ||
        null;

      const routeId = country.aliasId || country.id || countryNameLower.replace(/\s+/g, '-');

      results.push({
        id: country.id || routeId,
        routeId,
        countryId: country.id,
        countryName,
        displayName: country.displayName || countryName,
        countryCode: country.code || '',
        flagEmoji: country.flagEmoji || associatedVisa?.flagEmoji || '🌍',
        flagUrl: country.flagUrl || associatedVisa?.flagUrl || '',
        visaType: associatedVisa?.visaType || 'Visa Available',
        price: associatedVisa?.price || '',
        processingTime: associatedVisa?.processingTime || 'Fast Processing',
        stayPeriod: associatedVisa?.stayPeriod || '',
        image: country.image || associatedVisa?.image || ''
      });
    }
  }

  return results;
}
