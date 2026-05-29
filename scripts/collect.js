/**
 * 전국 장기요양기관 수집 스크립트 v3
 * - API 시도코드 자동 매핑 (강원51, 전북52)
 * - API 시군구코드 자동 스캔 (누락 없음)
 * - 구 단위 자동 병합 (수원시 장안구→수원시)
 * - 3단계 주소 전략 (JUSO동+좌표API+카카오)
 * 
 * 사용법: node scripts/collect.js 41    (경기도)
 *         node scripts/collect.js all   (전국)
 * 환경변수: API_KEY(필수), JUSO_KEY, JUSO_COORD_KEY, KAKAO_KEY
 */
const fs=require('fs');
const path=require('path');

const API_KEY=process.env.API_KEY;
const JUSO_KEY=process.env.JUSO_KEY||'';
const JUSO_COORD_KEY=process.env.JUSO_COORD_KEY||'';
const KAKAO_KEY=process.env.KAKAO_KEY||'';
const DELAY=150;

if(!API_KEY){console.error('❌ API_KEY 필수: export API_KEY="키값"');process.exit(1);}

const BASE1='https://apis.data.go.kr/B550928/searchLtcInsttService02/getLtcInsttSeachList02';
const BASE2='https://apis.data.go.kr/B550928/searchLtcInsttService02/getBillGreentInsttSearchList02';
const DETAIL='https://apis.data.go.kr/B550928/getLtcInsttDetailInfoService02';

// ══════════════════════════════════════
// 시도코드 매핑: 프론트엔드코드 → API코드
// ══════════════════════════════════════
const SIDO_TO_API={
  '11':'11','26':'26','27':'27','28':'28','29':'29',
  '30':'30','31':'31','36':'36','41':'41',
  '42':'51',  // 강원도 → 강원특별자치도
  '43':'43','44':'44',
  '45':'52',  // 전북 → 전북특별자치도
  '46':'46','47':'47','48':'48','50':'50'
};

const SIDO_NM={
  '11':'서울특별시','26':'부산광역시','27':'대구광역시','28':'인천광역시',
  '29':'광주광역시','30':'대전광역시','31':'울산광역시','36':'세종특별자치시',
  '41':'경기도','42':'강원특별자치도','43':'충청북도','44':'충청남도',
  '45':'전북특별자치도','46':'전라남도','47':'경상북도','48':'경상남도',
  '50':'제주특별자치도'
};

// 구 단위 → 부모 시 코드 (API코드 기준)
// 같은 시의 구들은 부모 코드 파일에 병합
const GU_TO_PARENT={
  // 경기도 (41)
  '41':{'113':'111','115':'111','117':'111','133':'131','135':'131','173':'171','194':'192','196':'192','273':'271','285':'281','287':'281','463':'461','465':'461','591':'590','593':'590','595':'590','597':'590'},
  // 충북 (43) - 청주시
  '43':{'113':'111','115':'111'},
  // 충남 (44) - 천안시
  '44':{'133':'131'},
  // 전북 (52→45) - 전주시
  '45':{'113':'111'},
  // 경북 (47) - 포항시
  '47':{'113':'111'},
  // 경남 (48) - 창원시
  '48':{'123':'121','125':'121'}
};

// 코드 변경: API 시군구코드 → 저장 파일명
const SGG_RENAME={
  '41':{'550':'510','570':'521'}
};

// 시군구 이름 (표시용)
const SGG_NM={'111':'수원시/청주시/포항시/전주시','113':'장안구/흥덕구','115':'권선구/서원구','117':'영통구/팔달구','121':'창원시','123':'의창구','125':'성산구','131':'성남시/천안시','133':'수정구/동남구','135':'분당구','150':'의정부시','171':'안양시','173':'동안구','192':'부천시','194':'원미구','196':'오정구','210':'광명시','220':'평택시','250':'동두천시','271':'안산시','273':'상록구','281':'고양시','285':'덕양구','287':'일산동구','290':'과천시','310':'구리시','360':'남양주시','370':'오산시','390':'시흥시','410':'군포시','430':'의왕시','450':'하남시','461':'용인시','463':'수지구','465':'기흥구','480':'파주시','500':'이천시','510':'안성시','521':'김포시','550':'안성시','570':'김포시','590':'화성시','591':'동탄','593':'봉담','595':'향남','597':'남양','610':'광주시','630':'양주시','650':'포천시','670':'여주시','800':'연천군','820':'가평군','830':'양평군'};

var TYPE_MAP={'A01':'노인요양시설','A02':'노인요양공동생활가정','A03':'노인요양시설','A04':'노인요양공동생활가정','B01':'방문요양','B02':'방문목욕','B03':'주간보호','B04':'단기보호','B05':'방문간호','B06':'복지용구','C01':'방문요양','C02':'방문목욕','C03':'주간보호','C04':'단기보호','C05':'방문간호','C06':'복지용구','G01':'치매전담실가형','G02':'치매전담실나형','G03':'치매전담형주야간보호'};

// ── dongCodeMap 로드 ──
function loadDongCodeMap(){
  var paths=['api/dong_map.js','dong_map.js'];
  for(var p of paths){var fp=path.join(process.cwd(),p);if(!fs.existsSync(fp))continue;var src=fs.readFileSync(fp,'utf-8');var cleaned=src.replace(/export default dongCodeMap;/,'').replace(/const dongCodeMap\s*=/,'var _m=');try{var _m;eval(cleaned);return _m;}catch(e){}}
  return {};
}
var dongCodeMap=loadDongCodeMap();
function getDongName(g){if(!g||!g.siDoCd||!g.siGunGuCd||!g.BDongCd)return '';return dongCodeMap[(g.siDoCd||'')+(g.siGunGuCd||'')+(g.BDongCd||'')]||'';}

// ── 유틸 ──
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function parseItems(xml){var items=[];var m=xml.matchAll(/<item>([\s\S]*?)<\/item>/g);for(var i of m){var obj={};var t=i[1].matchAll(/<(\w+)>(.*?)<\/\1>/g);for(var x of t)obj[x[1]]=x[2];items.push(obj);}return items;}
function parseItem(xml){var m=xml.match(/<item>([\s\S]*?)<\/item>/);if(!m)return null;var obj={};var t=m[1].matchAll(/<(\w+)>(.*?)<\/\1>/g);for(var x of t)obj[x[1]]=x[2];return obj;}
async function fetchRetry(url,n){n=n||3;for(var i=0;i<n;i++){try{var r=await fetch(url);if(!r.ok)throw new Error(r.status);return await r.text();}catch(e){if(i===n-1)return '';await sleep(2000);}}return '';}

// ══════════════════════════════════════
// 1단계: API에서 실제 시군구코드 스캔
// ══════════════════════════════════════
async function scanApiCodes(apiSido){
  var codes=new Set();
  console.log('  🔍 API 시군구코드 스캔 중...');
  for(var p=1;p<=100;p++){
    await sleep(DELAY);
    var xml=await fetchRetry(BASE1+'?serviceKey='+API_KEY+'&siDoCd='+apiSido+'&pageNo='+p+'&numOfRows=100');
    var items=parseItems(xml);
    if(items.length===0)break;
    items.forEach(i=>{if(i.siGunGuCd)codes.add(i.siGunGuCd);});
    if(items.length<100)break;
  }
  var sorted=[...codes].sort();
  console.log('  📋 API 코드: '+sorted.join(', ')+' ('+sorted.length+'개)');
  return sorted;
}

// ══════════════════════════════════════
// 2단계: 기관 목록 수집
// ══════════════════════════════════════
async function searchFacilities(apiSido,sgCode){
  var merged={};
  // API1
  for(var p=1;p<=50;p++){
    await sleep(DELAY);
    var xml=await fetchRetry(BASE1+'?serviceKey='+API_KEY+'&siDoCd='+apiSido+'&siGunGuCd='+sgCode+'&pageNo='+p+'&numOfRows=100');
    var items=parseItems(xml);if(items.length===0)break;
    for(var it of items){var sym=it.longTermAdminSym;if(!sym)continue;if(!merged[sym])merged[sym]={sym,name:it.adminNm||'',types:[],typeCodes:[]};var tn=TYPE_MAP[it.adminPttnCd]||it.adminPttnCd;if(!merged[sym].types.includes(tn)){merged[sym].types.push(tn);merged[sym].typeCodes.push(it.adminPttnCd);}}
    if(items.length<100)break;
  }
  // API2
  for(var p=1;p<=50;p++){
    await sleep(DELAY);
    var xml=await fetchRetry(BASE2+'?serviceKey='+API_KEY+'&siDoCd='+apiSido+'&siGunGuCd='+sgCode+'&pageNo='+p+'&numOfRows=100');
    var items=parseItems(xml);if(items.length===0)break;
    for(var it of items){var sym=it.longTermAdminSym;if(!sym)continue;if(!merged[sym])merged[sym]={sym,name:it.adminNm||'',types:[],typeCodes:[]};var tn=TYPE_MAP[it.adminPttnCd]||it.adminPttnCd;if(!merged[sym].types.includes(tn)){merged[sym].types.push(tn);merged[sym].typeCodes.push(it.adminPttnCd);}}
    if(items.length<100)break;
  }
  return Object.values(merged);
}

// ══════════════════════════════════════
// 3단계: 상세 정보 수집
// ══════════════════════════════════════
async function fetchDetail(sym,pttnCd){
  var p='longTermAdminSym='+sym+'&adminPttnCd='+pttnCd+'&serviceKey='+API_KEY;
  var detail={};
  var eps=[['GeneralSttus','getGeneralSttusDetailInfoItem02'],['StaffSttus','getStaffSttusDetailInfoItem02'],['InsttSttus','getInsttSttusDetailInfoItem02'],['AceptncNmpr','getAceptncNmprDetailInfoItem02'],['InsttEtc','getInsttEtcDetailInfoItem02']];
  for(var[key,ep]of eps){await sleep(DELAY);var xml=await fetchRetry(DETAIL+'/'+ep+'?'+p);detail[key]=parseItem(xml);}
  await sleep(DELAY);var xml1=await fetchRetry(DETAIL+'/getNonBenefitSttusDetailInfoList02?'+p+'&pageNo=1&numOfRows=100');detail.NonBenefit=parseItems(xml1);
  await sleep(DELAY);var xml2=await fetchRetry(DETAIL+'/getWlfareToolDetailInfoList02?'+p+'&pageNo=1&numOfRows=100');detail.Welfare=parseItems(xml2);
  return detail;
}

// ══════════════════════════════════════
// 4단계: 주소 확보 (3단계 전략)
// ══════════════════════════════════════
function tmToWgs84(x,y){var a=6378137,f=1/298.257222101,b=a*(1-f),e2=(a*a-b*b)/(a*a),ep2=(a*a-b*b)/(b*b),x0=1e6,y0=2e6,k0=.9996,lon0=127.5*Math.PI/180,lat0=38*Math.PI/180,dx=x-x0,dy=y-y0,M0=a*((1-e2/4-3*e2*e2/64)*lat0-(3*e2/8+3*e2*e2/32)*Math.sin(2*lat0)+15*e2*e2/256*Math.sin(4*lat0)),M=M0+dy/k0,mu=M/(a*(1-e2/4-3*e2*e2/64-5*e2*e2*e2/256)),e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2)),phi=mu+(3*e1/2-27*e1*e1*e1/32)*Math.sin(2*mu)+(21*e1*e1/16-55*e1*e1*e1*e1/32)*Math.sin(4*mu)+151*e1*e1*e1/96*Math.sin(6*mu),sp=Math.sin(phi),cp=Math.cos(phi),tp=Math.tan(phi),C=ep2*cp*cp,T=tp*tp,N=a/Math.sqrt(1-e2*sp*sp),R=a*(1-e2)/Math.pow(1-e2*sp*sp,1.5),D=dx/(N*k0),lat=phi-N*tp/R*(D*D/2-(5+3*T+10*C-4*C*C-9*ep2)*D**4/24+(61+90*T+298*C+45*T*T-252*ep2-3*C*C)*D**6/720),lng=lon0+(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C*C+8*ep2+24*T*T)*D**5/120)/cp;return{lat:lat*180/Math.PI,lng:lng*180/Math.PI};}

async function fetchAddress(g,sidoName,sgName,instName){
  if(!g)return{address:'',lat:null,lng:null};
  var bm=g.gunmulMlno||'0',bs=(g.gunmulSlno&&g.gunmulSlno!=='0')?g.gunmulSlno:'0';
  var bldNo=bm+(bs!=='0'?'-'+bs:'');
  var dong=getDongName(g);
  var address='',lat=null,lng=null;

  // STEP1: JUSO 키워드
  if(JUSO_KEY&&bm!=='0'){
    var kws=[sidoName+' '+sgName+(dong?' '+dong:'')+' '+bldNo, sgName+(dong?' '+dong:'')+' '+bldNo];
    for(var kw of kws){await sleep(DELAY);try{var url='https://business.juso.go.kr/addrlink/addrLinkApi.do?currentPage=1&countPerPage=100&keyword='+encodeURIComponent(kw)+'&confmKey='+JUSO_KEY+'&resultType=json';var res=await fetch(url);var d=await res.json();if(d.results&&d.results.juso&&d.results.juso.length>0){var mt=d.results.juso.find(j=>j.rnMgtSn===g.roadNmCd&&String(j.buldMnnm)===String(bm));if(!mt)mt=d.results.juso.find(j=>String(j.buldMnnm)===String(bm)&&j.emdNm&&dong&&j.emdNm.includes(dong));if(mt){address=mt.roadAddr||'';break;}}}catch(e){}}
  }
  // STEP2: JUSO 좌표API
  if(!address&&JUSO_COORD_KEY&&g.roadNmCd&&bm!=='0'){
    var admCd=(g.siDoCd||'')+(g.siGunGuCd||'')+(g.BDongCd||'')+(g.riCd||'00');
    while(admCd.length<10)admCd+='0';
    await sleep(DELAY);try{var url='https://business.juso.go.kr/addrlink/addrCoordApi.do?admCd='+admCd+'&rnMgtSn='+g.roadNmCd+'&udrtYn=0&buldMnnm='+bm+'&buldSlno='+bs+'&confmKey='+JUSO_COORD_KEY+'&resultType=json';var res=await fetch(url);var d=await res.json();if(d.results&&d.results.juso&&d.results.juso.length>0){var j=d.results.juso[0],ex=parseFloat(j.entX),ey=parseFloat(j.entY);if(ex>1e5){var w=tmToWgs84(ex,ey);lat=w.lat;lng=w.lng;}else{lat=ey;lng=ex;}
    if(KAKAO_KEY&&lat){await sleep(DELAY);try{var r2=await fetch('https://dapi.kakao.com/v2/local/geo/coord2address.json?x='+lng+'&y='+lat,{headers:{'Authorization':'KakaoAK '+KAKAO_KEY}});var d2=await r2.json();if(d2.documents&&d2.documents[0]){var doc=d2.documents[0];address=doc.road_address?doc.road_address.address_name:(doc.address?doc.address.address_name:'');}}catch(e){}}
    if(!address)address=[sidoName,sgName,dong,bldNo].filter(Boolean).join(' ');}}catch(e){}
  }
  // STEP3: 카카오 장소검색
  if((!address||address.split(' ').length<=2)&&KAKAO_KEY){await sleep(DELAY);try{var r3=await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?query='+encodeURIComponent(instName+' '+sgName)+'&size=3',{headers:{'Authorization':'KakaoAK '+KAKAO_KEY}});var d3=await r3.json();if(d3.documents&&d3.documents[0]){var doc=d3.documents[0];var ka=doc.road_address_name||doc.address_name||'';if(ka.length>10){address=ka;lat=parseFloat(doc.y);lng=parseFloat(doc.x);}}}catch(e){}}
  // 좌표만 없으면 카카오 지오코딩
  if(!lat&&KAKAO_KEY&&address&&address.length>10){await sleep(DELAY);try{var r4=await fetch('https://dapi.kakao.com/v2/local/search/address.json?query='+encodeURIComponent(address),{headers:{'Authorization':'KakaoAK '+KAKAO_KEY}});var d4=await r4.json();if(d4.documents&&d4.documents[0]){lng=parseFloat(d4.documents[0].x);lat=parseFloat(d4.documents[0].y);}}catch(e){}}
  if(!address)address=[sidoName,sgName].filter(Boolean).join(' ');
  return{address,lat,lng};
}

// ══════════════════════════════════════
// 메인
// ══════════════════════════════════════
async function processSido(frontSido){
  var apiSido=SIDO_TO_API[frontSido]||frontSido;
  var sidoName=SIDO_NM[frontSido]||frontSido;
  var dataDir=path.join(process.cwd(),'data',frontSido);
  fs.mkdirSync(dataDir,{recursive:true});

  console.log('\n🏁 '+sidoName+' (프론트:'+frontSido+' → API:'+apiSido+')\n');

  // 1) API 코드 스캔
  var apiCodes=await scanApiCodes(apiSido);
  if(apiCodes.length===0){console.log('  ❌ API에서 시군구코드 없음');return;}

  // 2) 코드 정리: 구 → 부모시 병합 계획
  var guMap=GU_TO_PARENT[frontSido]||{};
  var renameMap=SGG_RENAME[frontSido]||{};
  var codeGroups={};// saveCode → [apiCode1, apiCode2, ...]
  
  for(var ac of apiCodes){
    var saveCode=ac;
    // 구 단위 → 부모 시
    if(guMap[ac])saveCode=guMap[ac];
    // 코드 변경 (550→510 등)
    if(renameMap[saveCode])saveCode=renameMap[saveCode];
    if(renameMap[ac])saveCode=renameMap[ac];
    if(!codeGroups[saveCode])codeGroups[saveCode]=[];
    codeGroups[saveCode].push(ac);
  }

  console.log('  📁 저장 그룹: '+Object.keys(codeGroups).length+'개\n');

  var totalAll=0,addrOk=0,coordOk=0;
  var keys=Object.keys(codeGroups).sort();

  for(var ki=0;ki<keys.length;ki++){
    var saveCode=keys[ki];
    var apiCodesForGroup=codeGroups[saveCode];
    var sgName=SGG_NM[saveCode]||saveCode;

    console.log('📍 ['+(ki+1)+'/'+keys.length+'] '+sidoName+' '+sgName+' (API:'+apiCodesForGroup.join(',')+' → '+saveCode+'.json)');

    // 모든 API코드에서 기관 수집
    var allFacilities={};
    for(var ac of apiCodesForGroup){
      var facs=await searchFacilities(apiSido,ac);
      facs.forEach(f=>{if(!allFacilities[f.sym]){allFacilities[f.sym]=f;}else{f.types.forEach(t=>{if(!allFacilities[f.sym].types.includes(t))allFacilities[f.sym].types.push(t);});f.typeCodes.forEach(c=>{if(!allFacilities[f.sym].typeCodes.includes(c))allFacilities[f.sym].typeCodes.push(c);});}});
    }
    var facilities=Object.values(allFacilities);
    console.log('  📋 '+facilities.length+'개 기관');

    // 상세 + 주소
    var results=[];
    for(var fi=0;fi<facilities.length;fi++){
      var fac=facilities[fi];
      var pttnCd=fac.typeCodes[0]||'A01';
      process.stdout.write('  📦 ['+(fi+1)+'/'+facilities.length+'] '+fac.name+' ...');
      
      var det=await fetchDetail(fac.sym,pttnCd);
      var g=det.GeneralSttus;
      var addr=await fetchAddress(g,sidoName,sgName,fac.name);
      
      var hasAddr=addr.address&&addr.address.split(' ').length>2;
      var hasCoord=!!addr.lat;
      if(hasAddr)addrOk++;
      if(hasCoord)coordOk++;
      totalAll++;

      results.push({
        sym:fac.sym,name:fac.name,types:fac.types,typeCodes:fac.typeCodes,
        emdNm:getDongName(g||{}),address:addr.address,lat:addr.lat,lng:addr.lng,
        general:det.GeneralSttus,staff:det.StaffSttus,facility:det.InsttSttus,
        capacity:det.AceptncNmpr,etc:det.InsttEtc,
        nonBenefit:det.NonBenefit||[],welfare:det.Welfare||[]
      });
      process.stdout.write(' '+(hasAddr?'✅':'❌')+' '+(hasCoord?'📍':'')+'\n');
    }

    // 저장
    var filePath=path.join(dataDir,saveCode+'.json');
    fs.writeFileSync(filePath,JSON.stringify(results,null,2),'utf-8');
    console.log('  💾 '+saveCode+'.json ('+results.length+'개)\n');
  }

  console.log('✅ '+sidoName+' 수집 완료!');
  console.log('   총 '+totalAll+'개 · 주소성공 '+addrOk+'개 ('+(totalAll?Math.round(addrOk/totalAll*100):0)+'%) · 좌표성공 '+coordOk+'개 ('+(totalAll?Math.round(coordOk/totalAll*100):0)+'%)');
}

async function main(){
  var arg=process.argv[2]||'41';
  var start=Date.now();

  if(arg==='all'){
    for(var sido of Object.keys(SIDO_NM)){
      await processSido(sido);
    }
  }else{
    await processSido(arg);
  }

  var min=((Date.now()-start)/60000).toFixed(1);
  console.log('\n⏱️ 소요: '+min+'분\n');
}

main().catch(e=>{console.error('❌',e);process.exit(1);});
