/**
 * 주소 불완전 기관 수정 스크립트
 * 사용법: KAKAO_KEY=xxx node scripts/fix-address.js 41
 * (특정 시군구만: KAKAO_KEY=xxx node scripts/fix-address.js 41 480)
 */

const fs = require('fs');
const path = require('path');

const KAKAO_KEY = process.env.KAKAO_KEY;
const SIDO = process.argv[2] || '41';
const SIGUNGU = process.argv[3] || ''; // 비어있으면 전체
const DELAY = 250;

if (!KAKAO_KEY) {
  console.error('❌ KAKAO_KEY 필요: KAKAO_KEY=xxx node scripts/fix-address.js 41');
  process.exit(1);
}

const SIDO_NM = {'11':'서울','26':'부산','27':'대구','28':'인천','29':'광주','30':'대전','31':'울산','36':'세종','41':'경기','42':'강원','43':'충북','44':'충남','45':'전북','46':'전남','47':'경북','48':'경남','50':'제주'};
const SIGUNGU_NM = {'11110':'종로구','11140':'중구','11170':'용산구','11200':'성동구','11215':'광진구','11230':'동대문구','11260':'중랑구','11290':'성북구','11305':'강북구','11320':'도봉구','11350':'노원구','11380':'은평구','11410':'서대문구','11440':'마포구','11470':'양천구','11500':'강서구','11530':'구로구','11545':'금천구','11560':'영등포구','11590':'동작구','11620':'관악구','11650':'서초구','11680':'강남구','11710':'송파구','11740':'강동구','26110':'중구','26140':'서구','26170':'동구','26200':'영도구','26230':'부산진구','26260':'동래구','26290':'남구','26320':'북구','26350':'해운대구','26380':'사하구','26410':'금정구','26440':'강서구','26470':'연제구','26500':'수영구','26530':'사상구','26710':'기장군','27110':'중구','27140':'동구','27170':'서구','27200':'남구','27230':'북구','27260':'수성구','27290':'달서구','27710':'달성군','27720':'군위군','28110':'중구','28140':'동구','28177':'미추홀구','28185':'연수구','28200':'남동구','28237':'부평구','28245':'계양구','28260':'서구','28710':'강화군','28720':'옹진군','29110':'동구','29140':'서구','29170':'남구','29200':'북구','29230':'광산구','30110':'동구','30140':'중구','30170':'서구','30200':'유성구','30230':'대덕구','31110':'중구','31140':'남구','31170':'동구','31200':'북구','31710':'울주군','36110':'세종시','41111':'수원시','41131':'성남시','41150':'의정부시','41171':'안양시','41192':'부천시','41210':'광명시','41220':'평택시','41250':'동두천시','41271':'안산시','41281':'고양시','41290':'과천시','41310':'구리시','41360':'남양주시','41370':'오산시','41390':'시흥시','41410':'군포시','41430':'의왕시','41450':'하남시','41461':'용인시','41480':'파주시','41500':'이천시','41510':'안성시','41521':'김포시','41590':'화성시','41610':'광주시','41630':'양주시','41650':'포천시','41670':'여주시','41800':'연천군','41820':'가평군','41830':'양평군','42110':'춘천시','42130':'원주시','42150':'강릉시','42170':'동해시','42190':'태백시','42210':'속초시','42230':'삼척시','42720':'홍천군','42730':'횡성군','42750':'영월군','42760':'평창군','42770':'정선군','42780':'철원군','42790':'화천군','42800':'양구군','42810':'인제군','42820':'고성군','42830':'양양군','43111':'청주시','43130':'충주시','43150':'제천시','43720':'보은군','43730':'옥천군','43740':'영동군','43745':'증평군','43750':'진천군','43770':'괴산군','43800':'음성군','43820':'단양군','44131':'천안시','44150':'공주시','44180':'보령시','44200':'아산시','44210':'서산시','44230':'논산시','44250':'계룡시','44270':'당진시','44710':'금산군','44760':'부여군','44770':'서천군','44790':'청양군','44800':'홍성군','44810':'예산군','44825':'태안군','45111':'전주시','45130':'군산시','45140':'익산시','45180':'정읍시','45190':'남원시','45210':'김제시','45710':'완주군','45720':'진안군','45730':'무주군','45740':'장수군','45750':'임실군','45770':'순창군','45790':'고창군','45800':'부안군','46110':'목포시','46130':'여수시','46150':'순천시','46170':'나주시','46230':'광양시','46710':'담양군','46720':'곡성군','46730':'구례군','46770':'고흥군','46780':'보성군','46790':'화순군','46800':'장흥군','46810':'강진군','46820':'해남군','46830':'영암군','46840':'무안군','46860':'함평군','46870':'영광군','46880':'장성군','46890':'완도군','46900':'진도군','46910':'신안군','47111':'포항시','47130':'경주시','47150':'김천시','47170':'안동시','47190':'구미시','47210':'영주시','47230':'영천시','47250':'상주시','47280':'문경시','47290':'경산시','47730':'의성군','47740':'청송군','47750':'영양군','47760':'영덕군','47770':'청도군','47780':'고령군','47790':'성주군','47800':'칠곡군','47820':'예천군','47830':'봉화군','47840':'울진군','47850':'울릉군','48121':'창원시','48170':'진주시','48220':'통영시','48240':'사천시','48250':'김해시','48270':'밀양시','48310':'거제시','48330':'양산시','48720':'의령군','48730':'함안군','48740':'창녕군','48820':'고성군','48840':'남해군','48850':'하동군','48860':'산청군','48870':'함양군','48880':'거창군','48890':'합천군','50110':'제주시','50130':'서귀포시'};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fixAddress(inst, sigunguName) {
  var name = inst.name;
  var keyword = name + ' ' + sigunguName;

  // 카카오 키워드(장소) 검색으로 기관 찾기
  await sleep(DELAY);
  try {
    var res = await fetch(
      'https://dapi.kakao.com/v2/local/search/keyword.json?query=' + encodeURIComponent(keyword) + '&size=3',
      { headers: { 'Authorization': 'KakaoAK ' + KAKAO_KEY } }
    );
    var data = await res.json();

    if (data.documents && data.documents.length > 0) {
      // 첫 번째 결과 사용
      var doc = data.documents[0];
      var newAddr = doc.road_address_name || doc.address_name || '';
      var newLat = parseFloat(doc.y);
      var newLng = parseFloat(doc.x);

      if (newAddr && newAddr.length > 15) {
        return { address: newAddr, lat: newLat, lng: newLng, method: 'kakao_keyword' };
      }
    }
  } catch (e) {}

  // 카카오 주소 검색 (건물번호 + 시군구)
  var g = inst.general || {};
  if (g.gunmulMlno) {
    var bldNo = g.gunmulMlno + (g.gunmulSlno && g.gunmulSlno !== '0' ? '-' + g.gunmulSlno : '');
    var keyword2 = sigunguName + ' ' + bldNo;
    await sleep(DELAY);
    try {
      var res2 = await fetch(
        'https://dapi.kakao.com/v2/local/search/address.json?query=' + encodeURIComponent(keyword2),
        { headers: { 'Authorization': 'KakaoAK ' + KAKAO_KEY } }
      );
      var data2 = await res2.json();
      if (data2.documents && data2.documents.length > 0) {
        var doc2 = data2.documents[0];
        var addr2 = doc2.road_address ? doc2.road_address.address_name : (doc2.address ? doc2.address.address_name : '');
        if (addr2 && addr2.length > 15) {
          return { address: addr2, lat: parseFloat(doc2.y), lng: parseFloat(doc2.x), method: 'kakao_address' };
        }
      }
    } catch (e) {}
  }

  return null; // 수정 실패
}

async function main() {
  var dataDir = path.join(process.cwd(), 'data', SIDO);
  if (!fs.existsSync(dataDir)) {
    console.error('❌ 데이터 폴더 없음:', dataDir);
    process.exit(1);
  }

  var files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  if (SIGUNGU) files = files.filter(f => f === SIGUNGU + '.json');

  console.log('\n🔧 주소 수정 시작: ' + (SIDO_NM[SIDO] || SIDO) + ' (' + files.length + '개 파일)\n');

  var totalFixed = 0, totalFailed = 0, totalSkipped = 0;

  for (var fi = 0; fi < files.length; fi++) {
    var file = files[fi];
    var filePath = path.join(dataDir, file);
    var sgCode = file.replace('.json', '');
    var sgKey = SIDO + sgCode;
    var sgName = SIGUNGU_NM[sgKey] || sgCode;

    var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    var shorts = data.filter(i => !i.address || i.address.split(' ').length <= 2 || i.address.length < 15);

    if (shorts.length === 0) {
      totalSkipped += data.length;
      continue;
    }

    console.log('📍 ' + (SIDO_NM[SIDO] || '') + ' ' + sgName + ': ' + shorts.length + '개 수정 필요 (전체 ' + data.length + '개)');

    var fixed = 0, failed = 0;
    for (var si = 0; si < shorts.length; si++) {
      var inst = shorts[si];
      process.stdout.write('  🔍 [' + (si + 1) + '/' + shorts.length + '] ' + inst.name + ' ...');

      var result = await fixAddress(inst, sgName);
      if (result) {
        inst.address = result.address;
        inst.lat = result.lat;
        inst.lng = result.lng;
        fixed++;
        process.stdout.write(' ✅ ' + result.address + ' (' + result.method + ')\n');
      } else {
        failed++;
        process.stdout.write(' ❌ 수정 실패\n');
      }
    }

    // JSON 저장
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('  💾 저장 완료: 수정 ' + fixed + '개, 실패 ' + failed + '개\n');

    totalFixed += fixed;
    totalFailed += failed;
  }

  console.log('✅ 완료! 수정: ' + totalFixed + '개, 실패: ' + totalFailed + '개\n');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
