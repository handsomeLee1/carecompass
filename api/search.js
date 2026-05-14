export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sidoCd, sigunguCd, type, name, page } = req.query;
  const API_KEY = '3097212a7319caf4dd8b9b52b3eb53ee88768616811b57cb7d870a418af57d99';

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    pageNo: page || '1',
    numOfRows: '100',
  });

  if (sidoCd) params.append('siDoCd', sidoCd);
  if (sigunguCd) params.append('siGunGuCd', sigunguCd);
  // type이 여러개인 경우 첫번째만 사용 (API 제한)
  // 클라이언트에서 필터링하므로 type 없이 전체 검색
  // if (type) params.append('adminPttnCd', type);  if (name) params.append('adminNm', name);

  const apiUrl = `https://apis.data.go.kr/B550928/searchLtcInsttService02/getLtcInsttSeachList02?${params.toString()}`;

  const typeNames = {
    'A01':'노인요양시설','A02':'노인전문요양시설','A03':'노인요양시설','A04':'노인요양공동생활가정','A05':'노인요양시설(단기보호전환)',
    'AAA':'입소시설',
    'B01':'방문요양','B02':'방문목욕','B03':'주간보호','B04':'단기보호','B05':'방문간호',
    'C01':'방문요양','C02':'방문목욕','C03':'주간보호','C04':'단기보호','C05':'방문간호','C06':'복지용구',
    'Z01':'기타','S41':'치매전담형'
  };

  try {
    const response = await fetch(apiUrl);
    const xmlText = await response.text();

    var totalMatch = xmlText.match(/<totalCount>(\d+)<\/totalCount>/);
    var totalCount = totalMatch ? parseInt(totalMatch[1]) : 0;

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
      const pttnCd = get('adminPttnCd');
      const key = sym + '_' + pttnCd;
      if (seen.has(key)) continue;
      seen.add(key);

      var pttnNm = typeNames[pttnCd];
      if (!pttnNm) {
        if (pttnCd.startsWith('G') || pttnCd.startsWith('M')) pttnNm = '치매전담실';
        else if (pttnCd.startsWith('H') || pttnCd.startsWith('I')) pttnNm = '주간보호 치매전담';
        else pttnNm = pttnCd;
      }

      items.push({
        longTermCareInstNm: get('adminNm'),
        longTermAdminSym: sym,
        adminPttnCd: pttnCd,
        adminPttnNm: pttnNm,
      });
    }

    res.status(200).json({ items, total: items.length, totalCount });
  } catch(e) {
    console.error('Error:', e);
    res.status(500).json({ error: e.message });
  }
}