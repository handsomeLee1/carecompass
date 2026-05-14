export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sido, sigungu, type } = req.query;
  const API_KEY = decodeURIComponent('3097212a7319caf4dd8b9b52b3eb53ee88768616811b57cb7d870a418af57d99');

  const apiUrl = `https://apis.data.go.kr/B550928/searchLtcInsService/getLtcInsInfo?serviceKey=${API_KEY}&pageNo=1&numOfRows=50&addrSido=${encodeURIComponent(sido||'')}&addrSigungu=${encodeURIComponent(sigungu||'')}${type ? '&longTermCareInstGbCd='+type : ''}&_type=json`;

  try {
    const response = await fetch(apiUrl);
    const text = await response.text();
    console.log('API Response:', text.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      return res.status(500).json({ error: 'API 응답 오류', raw: text.substring(0, 500) });
    }
    
    res.status(200).json(data);
  } catch(e) {
    console.error('Fetch Error:', e);
    res.status(500).json({ error: e.message });
  }
}
