export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sido, sigungu, type } = req.query;
  const API_KEY = '3097212a7319caf4dd8b9b52b3eb53ee88768616811b57cb7d870a418af57d99';

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    pageNo: '1',
    numOfRows: '50',
    addrSido: sido || '',
    addrSigungu: sigungu || '',
    _type: 'json'
  });

  if (type) params.append('longTermCareInstGbCd', type);

  const apiUrl = `https://apis.data.go.kr/B550928/searchLtcInsService/getLtcInsInfo?${params.toString()}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    res.status(200).json(data);
  } catch(e) {
    console.error('API Error:', e);
    res.status(500).json({ error: e.message });
  }
}
