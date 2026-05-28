/**
 * 누락 시군구 코드 수집 + 기존 데이터 병합
 * 사용법: node scripts/collect-missing.js
 * 
 * 1) API에서 실제 사용하는 코드 vs 우리 코드 비교
 * 2) 누락 코드 수집
 * 3) 부모 시 파일에 병합 (구 단위 → 시 파일)
 */
const fs=require('fs');
const path=require('path');

const API_KEY=process.env.API_KEY;
const JUSO_KEY=process.env.JUSO_KEY||'';
const JUSO_COORD_KEY=process.env.JUSO_COORD_KEY||'';
const KAKAO_KEY=process.env.KAKAO_KEY||'';
const DELAY=200;

if(!API_KEY){console.error('❌ API_KEY 필수');process.exit(1);}

const BASE1='https://apis.data.go.kr/B550928/searchLtcInsttService02/getLtcInsttSeachList02';
const DETAIL_BASE='https://apis.data.go.kr/B550928/getLtcInsttDetailInfoService02';
const SIDO_NM={'11':'서울특별시','26':'부산광역시','27':'대구광역시','28':'인천광역시','29':'광주광역시','30':'대전광역시','31':'울산광역시','36':'세종특별자치시','41':'경기도','42':'강원특별자치도','43':'충청북도','44':'충청남도','45':'전북특별자치도','46':'전라남도','47':'경상북도','48':'경상남도','50':'제주특별자치도'};

// 구 단위 코드 → 부모 시 코드 매핑
const SUB_TO_PARENT={
  // 경기도
  '113':'111','115':'111','117':'111', // 수원시 구
  '133':'131','135':'131',             // 성남시 구  
  '173':'171',                         // 안양시 구
  '194':'192','196':'192',             // 부천시 구
  '273':'271',                         // 안산시 구
  '285':'281','287':'281',             // 고양시 구
  '463':'461','465':'461',             // 용인시 구
  '591':'590','593':'590','595':'590','597':'590', // 화성시 구
  // 코드 변경
  '550':'550', // 안성시 (별도 파일로 저장)
  '570':'570', // 김포시 (별도 파일로 저장)
};

// 코드 변경 매핑 (API코드 → 저장할 파일명)
const CODE_RENAME={
  '550':'510', // 안성시: API는 550, 파일은 510.json
  '570':'521', // 김포시: API는 570, 파일은 521.json
};

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function parseItems(xml){var items=[];var matches=xml.matchAll(/<item>([\s\S]*?)<\/item>/g);for(var m of matches){var obj={};var tags=m[1].matchAll(/<(\w+)>(.*?)<\/\1>/g);for(var t of tags)obj[t[1]]=t[2];items.push(obj);}return items;}
function parseItem(xml){var m=xml.match(/<item>([\s\S]*?)<\/item>/);if(!m)return null;var obj={};var tags=m[1].matchAll(/<(\w+)>(.*?)<\/\1>/g);for(var t of tags)obj[t[1]]=t[2];return obj;}
async function fetchRetry(url,retries){retries=retries||3;for(var i=0;i<retries;i++){try{var r=await fetch(url);if(!r.ok)throw new Error('HTTP '+r.status);return await r.text();}catch(e){if(i===retries-1)throw e;await sleep(1000*(i+1));}}};

var TYPE_MAP={'A01':'노인요양시설','A02':'노인요양공동생활가정','B01':'방문요양','B02':'방문목욕','B03':'주간보호','B04':'단기보호','B05':'방문간호','B06':'복지용구','C01':'방문요양','C02':'방문목욕','C03':'주간보호','C04':'단기보호','C05':'방문간호','C06':'복지용구','G01':'치매전담실가형','G02':'치매전담실나형','G03':'치매전담형주야간보호'};

// dongCodeMap 로드
function loadDongCodeMap(){
  var paths=['api/dong_map.js','dong_map.js'];
  for(var p of paths){var fp=path.join(process.cwd(),p);if(!fs.existsSync(fp))continue;var src=fs.readFileSync(fp,'utf-8');var cleaned=src.replace(/export default dongCodeMap;/,'').replace(/const dongCodeMap\s*=/,'var _m=');try{var _m;eval(cleaned);return _m;}catch(e){};}
  return {};
}
var dongCodeMap=loadDongCodeMap();
function getDongName(g){if(!g||!g.siDoCd||!g.siGunGuCd||!g.BDongCd)return '';return dongCodeMap[g.siDoCd+g.siGunGuCd+g.BDongCd]||'';}

// 1단계: API에서 실제 코드 목록 가져오기
async function getApiCodes(sidoCd){
  var codes=new Set();
  for(var page=1;page<=50;page++){
    await sleep(DELAY);
    try{
      var xml=await fetchRetry(BASE1+'?serviceKey='+API_KEY+'&siDoCd='+sidoCd+'&pageNo='+page+'&numOfRows=100');
      var items=parseItems(xml);
      if(items.length===0)break;
      items.forEach(i=>{if(i.siGunGuCd)codes.add(i.siGunGuCd);});
      if(items.length<100)break;
    }catch(e){break;}
  }
  return [...codes].sort();
}

// 2단계: 특정 코드의 기관 수집
async function collectCode(sidoCd,sgCode){
  var merged={};
  for(var page=1;page<=10;page++){
    var url=BASE1+'?serviceKey='+API_KEY+'&siDoCd='+sidoCd+'&siGunGuCd='+sgCode+'&pageNo='+page+'&numOfRows=100';
    await sleep(DELAY);
    try{var xml=await fetchRetry(url);var items=parseItems(xml);if(items.length===0)break;
    for(var it of items){var sym=it.longTermAdminSym;if(!sym)continue;if(!merged[sym])merged[sym]={sym,name:it.adminNm||'',types:[],typeCodes:[],adminPttnCd:it.adminPttnCd||'',siDoCd:sidoCd,siGunGuCd:sgCode,BDongCd:it.BDongCd||''};
    var tn=TYPE_MAP[it.adminPttnCd]||it.adminPttnCd;if(!merged[sym].types.includes(tn)){merged[sym].types.push(tn);merged[sym].typeCodes.push(it.adminPttnCd);}}
    if(items.length<100)break;}catch(e){}
  }
  return Object.values(merged);
}

// 3단계: 상세 + 주소
async function fetchDetail(sym,adminPttnCd){
  var params='longTermAdminSym='+sym+'&adminPttnCd='+adminPttnCd+'&serviceKey='+API_KEY;
  var eps=['getGeneralSttusDetailInfoItem02','getStaffSttusDetailInfoItem02','getInsttSttusDetailInfoItem02','getAceptncNmprDetailInfoItem02','getInsttEtcDetailInfoItem02'];
  var lists=[{p:'getNonBenefitSttusDetailInfoList02',e:'&pageNo=1&numOfRows=100'},{p:'getWlfareToolDetailInfoList02',e:'&pageNo=1&numOfRows=100'}];
  var detail={};
  for(var ep of eps){await sleep(DELAY);try{var xml=await fetchRetry(DETAIL_BASE+'/'+ep+'?'+params);detail[ep.replace(/^get|DetailInfoItem02$/g,'')]=parseItem(xml);}catch(e){}}
  for(var{p,e}of lists){await sleep(DELAY);try{var xml=await fetchRetry(DETAIL_BASE+'/'+p+'?'+params+e);detail[p.replace(/^get|DetailInfoList02$/g,'')]=parseItems(xml);}catch(e){detail[p]=[];}}
  return detail;
}

async function fetchAddress(general,sidoName,sgName,instName){
  if(!general)return{address:'',lat:null,lng:null};
  var buldMnnm=general.gunmulMlno||'0';
  var buldSlno=(general.gunmulSlno&&general.gunmulSlno!=='0')?general.gunmulSlno:'0';
  var bldNo=buldMnnm+(buldSlno!=='0'?'-'+buldSlno:'');
  var dongName=getDongName(general);
  var address='',lat=null,lng=null;

  // STEP1: JUSO
  if(JUSO_KEY&&buldMnnm!=='0'){
    var keywords=[sidoName+' '+sgName+(dongName?' '+dongName:'')+' '+bldNo, sgName+(dongName?' '+dongName:'')+' '+bldNo];
    for(var kw of keywords){await sleep(DELAY);try{var url='https://business.juso.go.kr/addrlink/addrLinkApi.do?currentPage=1&countPerPage=100&keyword='+encodeURIComponent(kw)+'&confmKey='+JUSO_KEY+'&resultType=json';var res=await fetch(url);var data=await res.json();if(data.results&&data.results.juso&&data.results.juso.length>0){var matched=data.results.juso.find(j=>j.rnMgtSn===general.roadNmCd&&String(j.buldMnnm)===String(buldMnnm));if(!matched)matched=data.results.juso.find(j=>String(j.buldMnnm)===String(buldMnnm)&&j.emdNm&&dongName&&j.emdNm.includes(dongName));if(matched){address=matched.roadAddr||'';break;}}}catch(e){}}
  }
  // STEP2: JUSO coord
  if(!address&&JUSO_COORD_KEY&&general.roadNmCd&&buldMnnm!=='0'){
    var admCd=(general.siDoCd||'')+(general.siGunGuCd||'')+(general.BDongCd||'')+(general.riCd||'00');
    while(admCd.length<10)admCd+='0';
    await sleep(DELAY);try{var cUrl='https://business.juso.go.kr/addrlink/addrCoordApi.do?admCd='+admCd+'&rnMgtSn='+general.roadNmCd+'&udrtYn=0&buldMnnm='+buldMnnm+'&buldSlno='+buldSlno+'&confmKey='+JUSO_COORD_KEY+'&resultType=json';var cRes=await fetch(cUrl);var cData=await cRes.json();if(cData.results&&cData.results.juso&&cData.results.juso.length>0){var j=cData.results.juso[0];var entX=parseFloat(j.entX);var entY=parseFloat(j.entY);if(entX>100000){var a=6378137,f=1/298.257222101,b=a*(1-f);var e2=(a*a-b*b)/(a*a),ep2=(a*a-b*b)/(b*b);var x0=1000000,y0=2000000,k0=0.9996,lon0=127.5*Math.PI/180,lat0=38*Math.PI/180;var dx=entX-x0,dy=entY-y0;var M0=a*((1-e2/4-3*e2*e2/64)*lat0-(3*e2/8+3*e2*e2/32)*Math.sin(2*lat0)+(15*e2*e2/256)*Math.sin(4*lat0));var M=M0+dy/k0;var mu=M/(a*(1-e2/4-3*e2*e2/64-5*e2*e2*e2/256));var e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));var phi=mu+(3*e1/2-27*e1*e1*e1/32)*Math.sin(2*mu)+(21*e1*e1/16-55*e1*e1*e1*e1/32)*Math.sin(4*mu)+(151*e1*e1*e1/96)*Math.sin(6*mu);var sp=Math.sin(phi),cp=Math.cos(phi),tp=Math.tan(phi);var C=ep2*cp*cp,T=tp*tp;var N=a/Math.sqrt(1-e2*sp*sp);var R=a*(1-e2)/Math.pow(1-e2*sp*sp,1.5);var D=dx/(N*k0);lat=phi-(N*tp/R)*(D*D/2-(5+3*T+10*C-4*C*C-9*ep2)*D*D*D*D/24+(61+90*T+298*C+45*T*T-252*ep2-3*C*C)*D*D*D*D*D*D/720);lng=lon0+(D-(1+2*T+C)*D*D*D/6+(5-2*C+28*T-3*C*C+8*ep2+24*T*T)*D*D*D*D*D/120)/cp;lat=lat*180/Math.PI;lng=lng*180/Math.PI;}else{lat=entY;lng=entX;}if(KAKAO_KEY&&lat&&lng){await sleep(DELAY);try{var rUrl='https://dapi.kakao.com/v2/local/geo/coord2address.json?x='+lng+'&y='+lat;var rRes=await fetch(rUrl,{headers:{'Authorization':'KakaoAK '+KAKAO_KEY}});var rData=await rRes.json();if(rData.documents&&rData.documents.length>0){var doc=rData.documents[0];address=doc.road_address?doc.road_address.address_name:(doc.address?doc.address.address_name:'');}}catch(e){}}if(!address)address=[sidoName,sgName,dongName,bldNo].filter(Boolean).join(' ');}}catch(e){}
  }
  // STEP3: Kakao keyword
  if((!address||address.split(' ').length<=2)&&KAKAO_KEY){await sleep(DELAY);try{var kRes=await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?query='+encodeURIComponent(instName+' '+sgName)+'&size=3',{headers:{'Authorization':'KakaoAK '+KAKAO_KEY}});var kData=await kRes.json();if(kData.documents&&kData.documents.length>0){var doc=kData.documents[0];var kAddr=doc.road_address_name||doc.address_name||'';if(kAddr&&kAddr.length>10){address=kAddr;lat=parseFloat(doc.y);lng=parseFloat(doc.x);}}}catch(e){}}
  // Kakao geocoding for coords
  if(!lat&&KAKAO_KEY&&address&&address.length>10){await sleep(DELAY);try{var gRes=await fetch('https://dapi.kakao.com/v2/local/search/address.json?query='+encodeURIComponent(address),{headers:{'Authorization':'KakaoAK '+KAKAO_KEY}});var gData=await gRes.json();if(gData.documents&&gData.documents.length>0){lng=parseFloat(gData.documents[0].x);lat=parseFloat(gData.documents[0].y);}}catch(e){}}
  if(!address)address=[sidoName,sgName].filter(Boolean).join(' ');
  return{address,lat,lng};
}

// 시군구 이름 매핑
const SGG_NAMES={
  '41':{'111':'수원시','113':'수원시','115':'수원시','117':'수원시','131':'성남시','133':'성남시','135':'성남시','150':'의정부시','171':'안양시','173':'안양시','192':'부천시','194':'부천시','196':'부천시','210':'광명시','220':'평택시','250':'동두천시','271':'안산시','273':'안산시','281':'고양시','285':'고양시','287':'고양시','290':'과천시','310':'구리시','360':'남양주시','370':'오산시','390':'시흥시','410':'군포시','430':'의왕시','450':'하남시','461':'용인시','463':'용인시','465':'용인시','480':'파주시','500':'이천시','550':'안성시','570':'김포시','590':'화성시','591':'화성시','593':'화성시','595':'화성시','597':'화성시','610':'광주시','630':'양주시','650':'포천시','670':'여주시','800':'연천군','820':'가평군','830':'양평군'}
};

async function main(){
  var targetSido=process.argv[2]||'41';
  var sidoName=SIDO_NM[targetSido]||targetSido;
  var dataDir=path.join(process.cwd(),'data',targetSido);
  fs.mkdirSync(dataDir,{recursive:true});

  console.log('\n🔍 '+sidoName+' API 코드 스캔...\n');
  var apiCodes=await getApiCodes(targetSido);
  console.log('API 코드: '+apiCodes.join(', '));

  // 기존 파일 코드
  var existingCodes=fs.readdirSync(dataDir).filter(f=>f.endsWith('.json')).map(f=>f.replace('.json',''));
  
  // 누락 코드 찾기
  var missingCodes=apiCodes.filter(c=>!existingCodes.includes(c)&&!existingCodes.includes(CODE_RENAME[c]||c));
  // 0개 파일도 재수집 대상
  existingCodes.forEach(c=>{
    try{var d=JSON.parse(fs.readFileSync(path.join(dataDir,c+'.json'),'utf-8'));if(d.length===0&&!missingCodes.includes(c))missingCodes.push(c);}catch(e){}
  });
  // 코드 변경 대상 추가 (550, 570 등)
  Object.keys(CODE_RENAME).forEach(apiCode=>{
    if(apiCodes.includes(apiCode)&&!missingCodes.includes(apiCode))missingCodes.push(apiCode);
  });

  console.log('기존 코드: '+existingCodes.join(', '));
  console.log('누락/빈 코드: '+missingCodes.join(', ')+'\n');

  if(missingCodes.length===0){console.log('✅ 누락 없음!');return;}

  var names=SGG_NAMES[targetSido]||{};

  for(var mc of missingCodes){
    var sgName=names[mc]||mc;
    var parentCode=SUB_TO_PARENT[mc];
    var saveCode=CODE_RENAME[mc]||mc;
    
    // 부모 코드가 있으면 병합, 없으면 새 파일
    if(parentCode&&parentCode!==mc&&parentCode!==saveCode){
      saveCode=parentCode;
    }

    console.log('📍 '+sgName+' (API코드:'+mc+' → 저장:'+saveCode+'.json)');
    
    var facilities=await collectCode(targetSido,mc);
    console.log('  📋 '+facilities.length+'개 기관');

    var results=[];
    for(var fi=0;fi<facilities.length;fi++){
      var fac=facilities[fi];
      process.stdout.write('  📦 ['+(fi+1)+'/'+facilities.length+'] '+fac.name+' ...');
      var detail=await fetchDetail(fac.sym,fac.adminPttnCd||fac.typeCodes[0]||'A01');
      var general=detail.GeneralSttus||null;
      var addr=await fetchAddress(general,sidoName,sgName,fac.name);
      results.push({sym:fac.sym,name:fac.name,types:fac.types,typeCodes:fac.typeCodes,emdNm:getDongName(general||{}),address:addr.address,lat:addr.lat,lng:addr.lng,general:detail.GeneralSttus,staff:detail.StaffSttus,facility:detail.InsttSttus,capacity:detail.AceptncNmpr,etc:detail.InsttEtc,nonBenefit:detail.NonBenefitSttus||[],welfare:detail.WlfareTool||[]});
      process.stdout.write(' ✅\n');
    }

    // 기존 파일에 병합
    var filePath=path.join(dataDir,saveCode+'.json');
    var existing=[];
    if(fs.existsSync(filePath)){
      try{existing=JSON.parse(fs.readFileSync(filePath,'utf-8'));}catch(e){}
    }
    
    // sym 기준 중복 제거 후 병합
    var existingSyms=new Set(existing.map(i=>i.sym));
    var newItems=results.filter(i=>!existingSyms.has(i.sym));
    var merged=[...existing,...newItems];
    
    fs.writeFileSync(filePath,JSON.stringify(merged,null,2),'utf-8');
    console.log('  💾 '+saveCode+'.json: 기존 '+existing.length+'개 + 신규 '+newItems.length+'개 = '+merged.length+'개\n');
  }

  console.log('✅ 완료!\n');
}

main().catch(e=>{console.error('❌',e);process.exit(1);});
