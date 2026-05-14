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

  const typeNames = {
    'C01': '방문요양', 'C02': '방문목욕', 'C03': '방문간호',
    'C04': '주간보호', 'C05': '단기보호', 'C06': '복지용구',
    'A01': '노인요양시설', 'A02': '노인요양공동생활가정'
  };

  try {
    const response = await fetch(apiUrl);
    const xmlText = await response.text();

    const seen = new Set();
    const items = [];
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const item = match[1];
      const get = (tag) => {
        const m = item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
        return m ? m[1] : '';
      };
      const sym = get('longTermAdminSym');
      if (seen.has(sym)) continue;
      seen.add(sym);
      
      const pttnCd = get('adminPttnCd');
      items.push({
        longTermCareInstNm: get('adminNm'),
        longTermAdminSym: sym,
        adminPttnCd: pttnCd,
        adminPttnNm: typeNames[pttnCd] || pttnCd,
      });
    }

    res.status(200).json({ items, total: items.length });
  } catch(e) {
    console.error('Error:', e);
    res.status(500).json({ error: e.message });
  }
}