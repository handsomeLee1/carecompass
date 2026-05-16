export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sym, type } = req.query;
  const API_KEY = process.env.API_KEY;
  const JUSO_KEY = process.env.JUSO_KEY;
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
    var sidoNm = {'11':'서울특별시','26':'부산광역시','27':'대구광역시','28':'인천광역시','29':'광주광역시','30':'대전광역시','31':'울산광역시','36':'세종특별자치시','41':'경기도','42':'강원특별자치도','43':'충청북도','44':'충청남도','45':'전라북도','46':'전라남도','47':'경상북도','48':'경상남도','50':'제주특별자치도'};

    if (general && general.siDoCd && general.gunmulMlno) {
      try {
        var sigunguNm = {'110':'종로구','140':'중구','170':'용산구','480':'파주시','281':'고양시','271':'안산시','461':'용인시','521':'김포시','131':'성남시','150':'의정부시','220':'평택시','192':'부천시','360':'남양주시','590':'화성시','111':'수원시','610':'광주시','310':'구리시','630':'양주시','650':'포천시','210':'광명시','370':'오산시','390':'시흥시','410':'군포시','430':'의왕시','450':'하남시','171':'안양시','250':'동두천시','290':'과천시','500':'이천시','510':'안성시','670':'여주시','800':'연천군','820':'가평군','830':'양평군'};
        var bldNo = general.gunmulMlno + (general.gunmulSlno && general.gunmulSlno !== '0' ? '-' + general.gunmulSlno : '');
        var searchKeyword = (sidoNm[general.siDoCd] || '') + ' ' + (sigunguNm[general.siGunGuCd] || '') + ' ' + bldNo;
        var jusoUrl = `https://business.juso.go.kr/addrlink/addrLinkApi.do?currentPage=1&countPerPage=10&keyword=${encodeURIComponent(searchKeyword)}&confmKey=${JUSO_KEY}&resultType=json`;
        var jusoRes = await fetch(jusoUrl);
        var jusoData = await jusoRes.json();
        if (jusoData.results && jusoData.results.juso && jusoData.results.juso.length > 0) {
          var jusoList = jusoData.results.juso;
          var matched = jusoList.find(function(j) { return j.rnMgtSn === general.roadNmCd; });
          address = matched || jusoList[0];
        }
      } catch(e) {}
    }

    if (!address && general) {
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