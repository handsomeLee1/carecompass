export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sido, sigungu, type } = req.query;
  const API_KEY = '3097212a7319caf4dd8b9b52b3eb53ee88768616811b57cb7d870a418af57d99';

  const apiUrl = `https://apis.data.go.kr/B550928/searchLtcInsttService02/getLtcInsttSeachList02?serviceKey=${API_KEY}&pageNo=1&numOfRows=50&addrSido=${encodeURIComponent(sido||'')}&addrSigungu=${encodeURIComponent(sigungu||'')}${type ? '&longTermCareInstGbCd='+type : ''}`;

  try {
    const response = await fetch(apiUrl);
    const xmlText = await response.text();
    console.log('XML:', xmlText.substring(0, 300));

    const items = [];
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const item = match[1];
      const get = (tag) => {
        const m = item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
        return m ? m[1] : '';
      };
      items.push({
        longTermCareInstNm: get('longTermCareInstNm'),
        addr: get('addr'),
        telno: get('telno'),
        longTermCareInstGbCd: get('longTermCareInstGbCd'),
        longTermCareInstGbNm: get('longTermCareInstGbNm'),
      });
    }

    res.status(200).json({ items, total: items.length });
  } catch(e) {
    console.error('Error:', e);
    res.status(500).json({ error: e.message });
  }
}
