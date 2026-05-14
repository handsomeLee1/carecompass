export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sidoCd, sigunguCd, type } = req.query;
  const API_KEY = '3097212a7319caf4dd8b9b52b3eb53ee88768616811b57cb7d870a418af57d99';

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    pageNo: '1',
    numOfRows: '50',
  });

  if (sidoCd) params.append('siDoCd', sidoCd);
  if (sigunguCd) params.append('siGunGuCd', sigunguCd);
  if (type) params.append('adminPttnCd', type);

  const apiUrl = `https://apis.data.go.kr/B550928/searchLtcInsttService02/getLtcInsttSeachList02?${params.toString()}`;

  try {
    const response = await fetch(apiUrl);
    const xmlText = await response.text();
    
    const firstItem = xmlText.match(/<item>([\s\S]*?)<\/item>/);
    if (firstItem) {
      console.log('ITEM:', firstItem[0]);
    }

    const items = [];
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const item = match[1];
      const get = (tag) => {
        const m = item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
        return m ? m[1] : '';
      };
      items.push({
        longTermCareInstNm: get('adminNm'),
        addr: get('addr'),
        telno: get('telno'),
        adminPttnCd: get('adminPttnCd'),
        adminPttnNm: get('adminPttnNm'),
      });
    }

    res.status(200).json({ items, total: items.length });
  } catch(e) {
    console.error('Error:', e);
    res.status(500).json({ error: e.message });
  }
}
