import sharp from 'sharp';

async function test(url, origin, fieldName) {
  const svg = `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#F8FAFC"/>
      <rect x="40" y="40" width="1120" height="720" rx="20" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="4"/>
      <text x="80" y="100" font-family="Arial" font-size="28" font-weight="bold" fill="#0B2A63">PASSPORT / PASSEPORT</text>
      <text x="80" y="150" font-family="Arial" font-size="16" fill="#64748B">Type / Code / Passport No.</text>
      <text x="80" y="180" font-family="Arial" font-size="22" font-weight="bold" fill="#0B2A63">P  IND  Z9876543</text>
      <text x="80" y="230" font-family="Arial" font-size="16" fill="#64748B">Given Names / Prénoms</text>
      <text x="80" y="260" font-family="Arial" font-size="22" font-weight="bold" fill="#0B2A63">ROHIT</text>
      <text x="80" y="310" font-family="Arial" font-size="16" fill="#64748B">Surname / Nom</text>
      <text x="80" y="340" font-family="Arial" font-size="22" font-weight="bold" fill="#0B2A63">SHARMA</text>
      <text x="80" y="390" font-family="Arial" font-size="16" fill="#64748B">Date of Issue / Date de délivrance</text>
      <text x="80" y="420" font-family="Arial" font-size="20" font-weight="bold" fill="#0B2A63">15/01/2022</text>
      <rect x="60" y="600" width="1080" height="130" fill="#F1F5F9" rx="8"/>
      <text x="80" y="650" font-family="monospace" font-size="26" font-weight="bold" letter-spacing="2" fill="#0F172A">P&lt;INDSHARMA&lt;&lt;ROHIT&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
      <text x="80" y="700" font-family="monospace" font-size="26" font-weight="bold" letter-spacing="2" fill="#0F172A">Z9876543&lt;0IND8704305M3101142&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;8</text>
    </svg>
  `;
  const imgBuf = await sharp(Buffer.from(svg)).jpeg().toBuffer();
  const form = new FormData();
  form.append(fieldName, new Blob([imgBuf], { type: 'image/jpeg' }), 'front.jpg');
  form.append('pageType', 'front');
  form.append('fullName', 'ROHIT SHARMA');

  const headers = {};
  if (origin) headers['Origin'] = origin;

  const t0 = Date.now();
  console.log(`\nTesting ${url} (Origin: ${origin}, Field: ${fieldName})...`);
  const res = await fetch(url, {
    method: 'POST',
    body: form,
    headers
  });
  console.log('Status:', res.status, 'Time:', Date.now() - t0, 'ms');
  const json = await res.json();
  console.log('Result:', JSON.stringify({
    success: json.success,
    dataSuccess: json.data?.success,
    wrongPage: json.data?.wrongPage,
    passportNumber: json.data?.extractedData?.passportNumber,
    fullName: json.data?.extractedData?.fullName,
    storageKey: json.data?.uploadedDocument?.storageKey,
    message: json.message
  }, null, 2));
}

async function run() {
  // 1. Test Localhost with Vercel origin and field 'passportFile'
  await test('http://localhost:5000/api/v1/applications/passport-ocr', 'https://mr-visa.vercel.app', 'passportFile');

  // 2. Test Live Render with Vercel origin and field 'passportFile'
  await test('https://mrvisa.onrender.com/api/v1/applications/passport-ocr', 'https://mr-visa.vercel.app', 'passportFile');
}

run();
