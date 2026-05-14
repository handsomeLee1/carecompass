export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sym, type } = req.query;
  const API_KEY = '3097212a7319caf4dd8b9b52b3eb53ee88768616811b57cb7d870a418af57d99';
  const BASE = 'https://apis.data.go.kr/B550928/getLtcInsttDetailInfoService02';

  if (!sym || !type) {
    return res.status(400).json({ error: 'sym과 type 파라미터 필요' });
  }

  const endpoints = [
    { key: 'general', path: 'getGeneralSttusDetailInfoItem02' },
    { key: 'staff', path: 'getStaffSttusDetailInfoItem02' },
    { key: 'facility', path: 'getInsttSttusDetailInfoItem02' },
    { key: 'capacity', path: 'getAceptncNmprDetailInfoItem02' },
    { key: 'etc', path: 'getInsttEtcDetailInfoItem02' },
    { key: 'nonBenefit', path: 'getNonBenefitSttusDetailInfoList02', list: true },
    { key: 'welfare', path: 'getWlfareToolDetailInfoList02', list: true },
  ];

  var result = {};

  for (var ep of endpoints) {
    var params = `longTermAdminSym=${sym}&adminPttnCd=${type}&serviceKey=${API_KEY}`;
    if (ep.list) params += '&pageNo=1&numOfRows=100';
    var url = `${BASE}/${ep.path}?${params}`;

    try {
      var response = await fetch(url);
      var xmlText = await response.text();

      if (ep.list) {
        var items = [];
        var matches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
        for (var m of matches) {
          var obj = {};
          var tags = m[1].matchAll(/<(\w+)>(.*?)<\/\1>/g);
          for (var t of tags) { obj[t[1]] = t[2]; }
          items.push(obj);
        }
        result[ep.key] = items;
      } else {
        var itemMatch = xmlText.match(/<item>([\s\S]*?)<\/item>/);
        if (itemMatch) {
          var obj = {};
          var tags = itemMatch[1].matchAll(/<(\w+)>(.*?)<\/\1>/g);
          for (var t of tags) { obj[t[1]] = t[2]; }
          result[ep.key] = obj;
        } else {
          result[ep.key] = null;
        }
      }
    } catch(e) {
      result[ep.key] = null;
    }
  }

  res.status(200).json(result);
}