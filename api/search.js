export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sidoCd, sigunguCd, name, page } = req.query;
  const API_KEY = '3097212a7319caf4dd8b9b52b3eb53ee88768616811b57cb7d870a418af57d99';
  const BASE = 'https://apis.data.go.kr/B550928';

  const typeNames = {
    'A01':'노인요양시설','A02':'노인전문요양시설','A03':'노인요양시설','A04':'노인요양공동생활가정','A05':'노인요양시설','AAA':'입소시설',
    'B01':'방문요양','B02':'방문목욕','B03':'주간보호','B04':'단기보호','B05':'방문간호','B06':'복지용구',
    'C01':'방문요양','C02':'방문목욕','C03':'주간보호','C04':'단기보호','C05':'방문간호','C06':'복지용구',
    'Z01':'기타','S41':'치매전담형'
  };

  function getTypeName(cd) {
    if (typeNames[cd]) return typeNames[cd];
    if (cd && (cd[0]==='G' || cd[0]==='M')) return '치매전담실';
    if (cd && (cd[0]==='H' || cd[0]==='I')) return '주간보호 치매전담';
    return cd || '기관';
  }

  function parseItems(xmlText) {
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
      items.push({
        longTermCareInstNm: get('adminNm'),
        longTermAdminSym: sym,
        adminPttnCd: pttnCd,
        adminPttnNm: getTypeName(pttnCd),
      });
    }
    return items;
  }

  try {
    const commonParams = new URLSearchParams({
      serviceKey: API_KEY,
      pageNo: page || '1',
      numOfRows: '100',
    });
    if (sidoCd) commonParams.append('siDoCd', sidoCd);
    if (sigunguCd) commonParams.append('siGunGuCd', sigunguCd);
    if (name) commonParams.append('adminNm', name);

    const [res1, res2] = await Promise.all([
      fetch(`${BASE}/searchLtcInsttService02/getLtcInsttSeachList02?${commonParams.toString()}`),
      fetch(`${BASE}/searchLtcInsttService02/getBillGreentInsttSearchList02?${commonParams.toString()}`)
    ]);

    const [xml1, xml2] = await Promise.all([res1.text(), res2.text()]);

    const firstItem2 = xml2.match(/<item>([\s\S]*?)<\/item>/);
    console.log('XML2 first item:', firstItem2 ? firstItem2[0] : 'no item');
    const items1 = parseItems(xml1);
    const items2 = parseItems(xml2);

    const allSeen = new Set();
    const allItems = [];
    [...items1, ...items2].forEach(item => {
      const key = item.longTermAdminSym + '_' + item.adminPttnCd;
      if (!allSeen.has(key)) {
        allSeen.add(key);
        allItems.push(item);
      }
    });

    const totalMatch1 = xml1.match(/<totalCount>(\d+)<\/totalCount>/);
    const totalCount = totalMatch1 ? parseInt(totalMatch1[1]) : 0;

    res.status(200).json({ items: allItems, total: allItems.length, totalCount });
  } catch(e) {
    console.error('Error:', e);
    res.status(500).json({ error: e.message });
  }
}