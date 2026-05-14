export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sym, type } = req.query;
  const API_KEY = '3097212a7319caf4dd8b9b52b3eb53ee88768616811b57cb7d870a418af57d99';
  const JUSO_KEY = 'U01TX0FVVEgyMDI2MDUxNDE2MDEzNDExODE2NTU=';
  const BASE = 'https://apis.data.go.kr/B550928/getLtcInsttDetailInfoService02';

  if (!sym || !type) {
    return res.status(400).json({ error: 'sym과 type 필요' });
  }

  function parseItem(xml) {
    var m = xml.match(/<item>([\s\S]*?)<\/item>/);
    if (!m) return null;
    var obj = {};
    var tags = m[1].matchAll(/<(\w+)>(.*?)<\/\1>/g);
    for (var t of tags) obj[t[1]] = t[2];
    return obj;
  }

  function parseList(xml) {
    var items = [];
    var matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (var m of matches) {
      var obj = {};
      var tags = m[1].matchAll(/<(\w+)>(.*?)<\/\1>/g);
      for (var t of tags) obj[t[1]] = t[2];
      items.push(obj);
    }
    return items;
  }

  async function fetchXml(path, extra) {
    var params = `longTermAdminSym=${sym}&adminPttnCd=${type}&serviceKey=${API_KEY}`;
    if (extra) params += '&' + extra;
    var r = await fetch(`${BASE}/${path}?${params}`);
    return await r.text();
  }

  try {
    var [genXml, staffXml, facXml, capXml, etcXml, nbXml, wfXml] = await Promise.all([
      fetchXml('getGeneralSttusDetailInfoItem02'),
      fetchXml('getStaffSttusDetailInfoItem02'),
      fetchXml('getInsttSttusDetailInfoItem02'),
      fetchXml('getAceptncNmprDetailInfoItem02'),
      fetchXml('getInsttEtcDetailInfoItem02'),
      fetchXml('getNonBenefitSttusDetailInfoList02', 'pageNo=1&numOfRows=100'),
      fetchXml('getWlfareToolDetailInfoList02', 'pageNo=1&numOfRows=100'),
    ]);

    var general = parseItem(genXml);
    var staff = parseItem(staffXml);
    var facility = parseItem(facXml);
    var capacity = parseItem(capXml);
    var etc = parseItem(etcXml);
    var nonBenefit = parseList(nbXml);
    var welfare = parseList(wfXml);

    var address = null;
    if (general && general.roadNmCd && general.gunmulMlno) {
      var sidoNames = {'11':'서울','21':'부산','22':'대구','23':'인천','24':'광주','25':'대전','26':'울산','29':'세종','31':'경기','32':'강원','33':'충북','34':'충남','35':'전북','36':'전남','37':'경북','38':'경남','39':'제주','41':'경기'};
      var rn = general.roadNmCd;
      var bldNo = general.gunmulMlno + (general.gunmulSlno && general.gunmulSlno !== '0' ? '-' + general.gunmulSlno : '');

      try {
        var jusoUrl = `https://business.juso.go.kr/addrlink/addrLinkApi.do?currentPage=1&countPerPage=1&keyword=${encodeURIComponent(rn + ' ' + bldNo)}&confmKey=${JUSO_KEY}&resultType=json`;
        var jusoRes = await fetch(jusoUrl);
        var jusoData = await jusoRes.json();
        if (jusoData.results && jusoData.results.juso && jusoData.results.juso.length > 0) {
          address = jusoData.results.juso[0];
        }
      } catch(e) {}
    }

    if (!address && general) {
      var sidoNm = {'11':'서울특별시','26':'부산광역시','27':'대구광역시','28':'인천광역시','29':'광주광역시','30':'대전광역시','31':'울산광역시','36':'세종특별자치시','41':'경기도','42':'강원특별자치도','43':'충청북도','44':'충청남도','45':'전라북도','46':'전라남도','47':'경상북도','48':'경상남도','50':'제주특별자치도'};
      address = {
        roadAddr: (sidoNm[general.siDoCd] || '') + ' ' + (general.detailAddr || ''),
        siNm: sidoNm[general.siDoCd] || '',
        emdNm: ''
      };
    }

    res.status(200).json({
      general, staff, facility, capacity, etc, nonBenefit, welfare, address
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}