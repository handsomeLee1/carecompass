export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { sym, type } = req.query;
  const API_KEY = process.env.API_KEY;
  const JUSO_KEY = process.env.JUSO_KEY;
  const BASE = 'https://apis.data.go.kr/B550928/getLtcInsttDetailInfoService02';

  if (!sym || !type) {
    return res.status(400).json({ error: 'sym과 type 필요' });
  }

  // ── 시도 코드 → 이름 ──────────────────────────────
  const sidoNm = {
    '11':'서울특별시','26':'부산광역시','27':'대구광역시','28':'인천광역시',
    '29':'광주광역시','30':'대전광역시','31':'울산광역시','36':'세종특별자치시',
    '41':'경기도','42':'강원특별자치도','43':'충청북도','44':'충청남도',
    '45':'전북특별자치도','46':'전라남도','47':'경상북도','48':'경상남도',
    '50':'제주특별자치도'
  };

  // ── 시도+시군구 코드 → 이름 (완전한 매핑) ──────────
  const sigunguNm = {
    '11110':'종로구','11140':'중구','11170':'용산구','11200':'성동구','11215':'광진구',
    '11230':'동대문구','11260':'중랑구','11290':'성북구','11305':'강북구','11320':'도봉구',
    '11350':'노원구','11380':'은평구','11410':'서대문구','11440':'마포구','11470':'양천구',
    '11500':'강서구','11530':'구로구','11545':'금천구','11560':'영등포구','11590':'동작구',
    '11620':'관악구','11650':'서초구','11680':'강남구','11710':'송파구','11740':'강동구',
    '26110':'중구','26140':'서구','26170':'동구','26200':'영도구','26230':'부산진구',
    '26260':'동래구','26290':'남구','26320':'북구','26350':'해운대구','26380':'사하구',
    '26410':'금정구','26440':'강서구','26470':'연제구','26500':'수영구','26530':'사상구',
    '26710':'기장군',
    '27110':'중구','27140':'동구','27170':'서구','27200':'남구','27230':'북구',
    '27260':'수성구','27290':'달서구','27710':'달성군','27720':'군위군',
    '28110':'중구','28140':'동구','28177':'미추홀구','28185':'연수구','28200':'남동구',
    '28237':'부평구','28245':'계양구','28260':'서구','28710':'강화군','28720':'옹진군',
    '29110':'동구','29140':'서구','29170':'남구','29200':'북구','29230':'광산구',
    '30110':'동구','30140':'중구','30170':'서구','30200':'유성구','30230':'대덕구',
    '31110':'중구','31140':'남구','31170':'동구','31200':'북구','31710':'울주군',
    '36110':'세종시',
    '41111':'수원시','41131':'성남시','41150':'의정부시','41171':'안양시','41192':'부천시',
    '41210':'광명시','41220':'평택시','41250':'동두천시','41271':'안산시','41281':'고양시',
    '41290':'과천시','41310':'구리시','41360':'남양주시','41370':'오산시','41390':'시흥시',
    '41410':'군포시','41430':'의왕시','41450':'하남시','41461':'용인시','41480':'파주시',
    '41500':'이천시','41510':'안성시','41521':'김포시','41590':'화성시','41610':'광주시',
    '41630':'양주시','41650':'포천시','41670':'여주시','41800':'연천군','41820':'가평군',
    '41830':'양평군',
    '42110':'춘천시','42130':'원주시','42150':'강릉시','42170':'동해시','42190':'태백시',
    '42210':'속초시','42230':'삼척시','42720':'홍천군','42730':'횡성군','42750':'영월군',
    '42760':'평창군','42770':'정선군','42780':'철원군','42790':'화천군','42800':'양구군',
    '42810':'인제군','42820':'고성군','42830':'양양군',
    '43111':'청주시','43130':'충주시','43150':'제천시','43720':'보은군','43730':'옥천군',
    '43740':'영동군','43745':'증평군','43750':'진천군','43770':'괴산군','43800':'음성군',
    '43820':'단양군',
    '44131':'천안시','44150':'공주시','44180':'보령시','44200':'아산시','44210':'서산시',
    '44230':'논산시','44250':'계룡시','44270':'당진시','44710':'금산군','44760':'부여군',
    '44770':'서천군','44790':'청양군','44800':'홍성군','44810':'예산군','44825':'태안군',
    '45111':'전주시','45130':'군산시','45140':'익산시','45180':'정읍시','45190':'남원시',
    '45210':'김제시','45710':'완주군','45720':'진안군','45730':'무주군','45740':'장수군',
    '45750':'임실군','45770':'순창군','45790':'고창군','45800':'부안군',
    '46110':'목포시','46130':'여수시','46150':'순천시','46170':'나주시','46230':'광양시',
    '46710':'담양군','46720':'곡성군','46730':'구례군','46770':'고흥군','46780':'보성군',
    '46790':'화순군','46800':'장흥군','46810':'강진군','46820':'해남군','46830':'영암군',
    '46840':'무안군','46860':'함평군','46870':'영광군','46880':'장성군','46890':'완도군',
    '46900':'진도군','46910':'신안군',
    '47111':'포항시','47130':'경주시','47150':'김천시','47170':'안동시','47190':'구미시',
    '47210':'영주시','47230':'영천시','47250':'상주시','47280':'문경시','47290':'경산시',
    '47730':'의성군','47740':'청송군','47750':'영양군','47760':'영덕군','47770':'청도군',
    '47780':'고령군','47790':'성주군','47800':'칠곡군','47820':'예천군','47830':'봉화군',
    '47840':'울진군','47850':'울릉군',
    '48121':'창원시','48170':'진주시','48220':'통영시','48240':'사천시','48250':'김해시',
    '48270':'밀양시','48310':'거제시','48330':'양산시','48720':'의령군','48730':'함안군',
    '48740':'창녕군','48820':'고성군','48840':'남해군','48850':'하동군','48860':'산청군',
    '48870':'함양군','48880':'거창군','48890':'합천군',
    '50110':'제주시','50130':'서귀포시'
  };

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
    var coords = null;

    if (general && general.siDoCd && general.gunmulMlno) {
      try {
        // ── 시군구 이름 조회 ──────────────────────────
        var sigunguKey = general.siDoCd + general.siGunGuCd;
        var sigunguName = sigunguNm[sigunguKey] || '';
        var sidoName = sidoNm[general.siDoCd] || '';

        // ── 건물번호 구성 ─────────────────────────────
        var buldMnnm = general.gunmulMlno || '0';
        var buldSlno = (general.gunmulSlno && general.gunmulSlno !== '0') ? general.gunmulSlno : '0';
        var bldNo = buldMnnm + (buldSlno !== '0' ? '-' + buldSlno : '');

        // ── JUSO 주소 검색 ────────────────────────────
          var searchKeyword = general.hmPostNo
      ? `${sigunguName} ${general.hmPostNo} ${buldMnnm}`
      : `${sidoName} ${sigunguName} ${buldMnnm}`;
        var jusoUrl = `https://business.juso.go.kr/addrlink/addrLinkApi.do?currentPage=1&countPerPage=100&keyword=${encodeURIComponent(searchKeyword)}&confmKey=${JUSO_KEY}&resultType=json`;
        var jusoRes = await fetch(jusoUrl);
        var jusoData = await jusoRes.json();

        if (jusoData.results && jusoData.results.juso && jusoData.results.juso.length > 0) {
          var jusoList = jusoData.results.juso;

          // ── 매칭: 도로명코드 + 건물번호 이중 검증 ────
          var matched = jusoList.find(function(j) {
            var mnnmMatch = String(j.buldMnnm) === String(buldMnnm);
            var slnoMatch = String(j.buldSlno) === String(buldSlno);
            var rnMatch = j.rnMgtSn === general.roadNmCd;
            return rnMatch && mnnmMatch;
          });

          // 도로명코드 매칭 실패 시 건물번호만으로 재시도
          if (!matched) {
            matched = jusoList.find(function(j) {
              return String(j.buldMnnm) === String(buldMnnm) &&
                     String(j.buldSlno) === String(buldSlno);
            });
          }

          // 매칭 성공 시에만 사용 (오류 방지: jusoList[0] 폴백 제거)
          if (matched) {
            address = matched;

            // ── JUSO 좌표 API 호출 ────────────────────
            try {
              var coordParams = new URLSearchParams({
                confmKey: JUSO_KEY,
                admCd: matched.admCd,
                rnMgtSn: matched.rnMgtSn,
                udrtYn: matched.udrtYn,
                buldMnnm: matched.buldMnnm,
                buldSlno: matched.buldSlno || '0',
                resultType: 'json'
              });
              var coordUrl = `https://business.juso.go.kr/addrlink/addrCoordApi.do?${coordParams}`;
              var coordRes = await fetch(coordUrl);
              var coordData = await coordRes.json();

              if (
                coordData.results &&
                coordData.results.common.errorCode === '0' &&
                coordData.results.juso &&
                coordData.results.juso.length > 0
              ) {
                coords = {
                  entX: coordData.results.juso[0].entX,
                  entY: coordData.results.juso[0].entY
                };
              }
            } catch(e) {}
          }
        }
      } catch(e) {}
    }

    // ── 매칭 실패 시 NHIS detailAddr로 폴백 ──────────
    if (!address && general) {
      var sidoName = sidoNm[general.siDoCd] || '';
      address = {
        roadAddr: sidoName + ' ' + (general.detailAddr || ''),
        siNm: sidoName,
        emdNm: ''
      };
    }

    res.status(200).json({
      general, staff, facility, capacity, etc, nonBenefit, welfare,
      address, coords
    });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
