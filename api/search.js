export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sidoCd, sigunguCd, name } = req.query;
  const API_KEY = process.env.API_KEY;
  const BASE = 'https://apis.data.go.kr/B550928/searchLtcInsttService02';

  const typeNames = {
    'A01':'노인요양시설','A02':'노인전문요양시설','A03':'노인요양시설','A04':'노인요양공동생활가정','A05':'노인요양시설','AAA':'입소시설',
    'B01':'방문요양','B02':'방문목욕','B03':'주간보호','B04':'단기보호','B05':'방문간호','B06':'복지용구',
    'C01':'방문요양','C02':'방문목욕','C03':'주간보호','C04':'단기보호','C05':'방문간호','C06':'복지용구',
    'Z01':'기타','S41':'치매전담형',
    '001':'방문요양','002':'방문목욕','003':'주간보호','004':'단기보호','005':'방문간호','006':'복지용구'
  };

  function getTypeName(cd) {
    if (typeNames[cd]) return typeNames[cd];
    if (cd && (cd[0]==='G' || cd[0]==='M')) return '치매전담실';
    if (cd && (cd[0]==='H' || cd[0]==='I')) return '주간보호 치매전담';
    return cd || '기관';
  }

  function parseItems(xmlText) {
    var items = [];
    var itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (var match of itemMatches) {
      var item = match[1];
      var get = function(tag) {
        var m = item.match(new RegExp('<' + tag + '>(.*?)</' + tag + '>'));
        return m ? m[1] : '';
      };
      items.push({
        longTermCareInstNm: get('adminNm'),
        longTermAdminSym: get('longTermAdminSym'),
        adminPttnCd: get('adminPttnCd') || get('serviceKind'),
        siDoCd: get('siDoCd'),
        siGunGuCd: get('siGunGuCd'),
        BDongCd: get('BDongCd'),
      });
    }
    return items;
  }

  function getTotalCount(xmlText) {
    var m = xmlText.match(/<totalCount>(\d+)<\/totalCount>/);
    return m ? parseInt(m[1]) : 0;
  }

  // ── 여러 페이지 병렬 호출 ──────────────────────────
  async function fetchAllPages(endpoint, params) {
    // 1페이지 먼저 호출해서 totalCount 확인
    var url1 = BASE + '/' + endpoint + '?' + params.toString() + '&pageNo=1&numOfRows=100';
    var r1 = await fetch(url1);
    var xml1 = await r1.text();
    var totalCount = getTotalCount(xml1);
    var items = parseItems(xml1);

    if (totalCount <= 100) return items;

    // 나머지 페이지 병렬 호출 (최대 5페이지 = 500개)
    var pages = Math.min(Math.ceil(totalCount / 100), 5);
    var promises = [];
    for (var p = 2; p <= pages; p++) {
      var url = BASE + '/' + endpoint + '?' + params.toString() + '&pageNo=' + p + '&numOfRows=100';
      promises.push(fetch(url).then(function(r) { return r.text(); }));
    }
    var results = await Promise.all(promises);
    results.forEach(function(xml) {
      items = items.concat(parseItems(xml));
    });

    return items;
  }

  try {
    var commonParams = new URLSearchParams({
      serviceKey: API_KEY,
    });
    if (sidoCd) commonParams.append('siDoCd', sidoCd);
    if (sigunguCd) commonParams.append('siGunGuCd', sigunguCd);
    if (name) commonParams.append('adminNm', name);

    var [items1, items2] = await Promise.all([
      fetchAllPages('getLtcInsttSeachList02', commonParams),
      fetchAllPages('getBillGreentInsttSearchList02', commonParams),
    ]);

    // ── 시/군/구 클라이언트 필터링 (API2가 필터링 안 하는 문제 해결) ──
    if (sigunguCd) {
      items1 = items1.filter(function(i) { return i.siGunGuCd === sigunguCd; });
      items2 = items2.filter(function(i) { return i.siGunGuCd === sigunguCd; });
    }

    // ── BDongCd 매핑 (API2에서 BDongCd 수집) ──
    var bdongMap = {};
    items2.forEach(function(item) {
      if (item.BDongCd && item.longTermAdminSym) {
        bdongMap[item.longTermAdminSym] = item.BDongCd;
      }
    });

    // ── 병합 + 중복 제거 (API2 우선, BDongCd 보충) ──
    var allSeen = new Set();
    var allItems = [];

    var combined = items2.concat(items1);
    combined.forEach(function(item) {
      var key = item.longTermAdminSym + '_' + item.adminPttnCd;
      if (!allSeen.has(key)) {
        allSeen.add(key);
        // BDongCd 보충: API1 아이템에 BDongCd 없으면 API2에서 가져오기
        if (!item.BDongCd && bdongMap[item.longTermAdminSym]) {
          item.BDongCd = bdongMap[item.longTermAdminSym];
        }
        item.adminPttnNm = getTypeName(item.adminPttnCd);
        allItems.push(item);
      }
    });

    // ── 같은 기관(sym) 합치기 ──────────────────────────
    var mergeMap = {};
    allItems.forEach(function(item) {
      var sym = item.longTermAdminSym;
      if (!mergeMap[sym]) {
        mergeMap[sym] = {
          longTermCareInstNm: item.longTermCareInstNm,
          longTermAdminSym: sym,
          adminPttnCd: item.adminPttnCd,
          adminPttnNm: item.adminPttnNm,
          types: [{ cd: item.adminPttnCd, nm: item.adminPttnNm }],
          siDoCd: item.siDoCd,
          siGunGuCd: item.siGunGuCd,
          BDongCd: item.BDongCd || '',
        };
      } else {
        var exists = mergeMap[sym].types.some(function(t) { return t.cd === item.adminPttnCd; });
        if (!exists) {
          mergeMap[sym].types.push({ cd: item.adminPttnCd, nm: item.adminPttnNm });
        }
        if (!mergeMap[sym].BDongCd && item.BDongCd) {
          mergeMap[sym].BDongCd = item.BDongCd;
        }
      }
    });
    var mergedItems = Object.values(mergeMap);

    res.status(200).json({ items: mergedItems, total: mergedItems.length });
  } catch(e) {
    console.error('Error:', e);
    res.status(500).json({ error: e.message });
  }
}
