/**
 * 케어컴퍼스 데이터 수집 스크립트 v2
 * 3단계 주소 확보: JUSO(동이름포함) → JUSO좌표API → 카카오장소검색
 * 
 * 사용법: API_KEY=xxx JUSO_KEY=xxx JUSO_COORD_KEY=xxx KAKAO_KEY=xxx node scripts/collect.js 41
 * 필수: API_KEY  선택: JUSO_KEY, JUSO_COORD_KEY, KAKAO_KEY
 */
const fs=require('fs');
const path=require('path');

const API_KEY=process.env.API_KEY;
const JUSO_KEY=process.env.JUSO_KEY||'';
const JUSO_COORD_KEY=process.env.JUSO_COORD_KEY||'';
const KAKAO_KEY=process.env.KAKAO_KEY||'';
const SIDO=process.argv[2]||'41';
const DELAY=200;

if(!API_KEY){console.error('❌ API_KEY 필수');process.exit(1);}

// ── dongCodeMap 로드 ──
function loadDongCodeMap(){
  var paths=['api/dong_map.js','dong_map.js'];
  for(var p of paths){
    var fp=path.join(process.cwd(),p);
    if(!fs.existsSync(fp))continue;
    var src=fs.readFileSync(fp,'utf-8');
    var cleaned=src.replace(/export default dongCodeMap;/,'').replace(/const dongCodeMap\s*=/,'var _m=');
    try{var _m;eval(cleaned);return _m;}catch(e){}
    var m=src.match(/\{[\s\S]*\}/);
    if(m)try{return JSON.parse(m[0].replace(/'/g,'"').replace(/,\s*\}/g,'}'));}catch(e){}
  }
  console.log('⚠️ dongCodeMap 없음 - 동 이름 없이 진행');
  return {};
}
var dongCodeMap=loadDongCodeMap();
console.log('📂 dongCodeMap: '+Object.keys(dongCodeMap).length+'개 항목\n');

// ── 시/도, 시/군/구 데이터 ──
const SIDO_NM={'11':'서울특별시','26':'부산광역시','27':'대구광역시','28':'인천광역시','29':'광주광역시','30':'대전광역시','31':'울산광역시','36':'세종특별자치시','41':'경기도','42':'강원특별자치도','43':'충청북도','44':'충청남도','45':'전북특별자치도','46':'전라남도','47':'경상북도','48':'경상남도','50':'제주특별자치도'};

const SIGUNGU={
'11':[{code:'110',name:'종로구'},{code:'140',name:'중구'},{code:'170',name:'용산구'},{code:'200',name:'성동구'},{code:'215',name:'광진구'},{code:'230',name:'동대문구'},{code:'260',name:'중랑구'},{code:'290',name:'성북구'},{code:'305',name:'강북구'},{code:'320',name:'도봉구'},{code:'350',name:'노원구'},{code:'380',name:'은평구'},{code:'410',name:'서대문구'},{code:'440',name:'마포구'},{code:'470',name:'양천구'},{code:'500',name:'강서구'},{code:'530',name:'구로구'},{code:'545',name:'금천구'},{code:'560',name:'영등포구'},{code:'590',name:'동작구'},{code:'620',name:'관악구'},{code:'650',name:'서초구'},{code:'680',name:'강남구'},{code:'710',name:'송파구'},{code:'740',name:'강동구'}],
'26':[{code:'110',name:'중구'},{code:'140',name:'서구'},{code:'170',name:'동구'},{code:'200',name:'영도구'},{code:'230',name:'부산진구'},{code:'260',name:'동래구'},{code:'290',name:'남구'},{code:'320',name:'북구'},{code:'350',name:'해운대구'},{code:'380',name:'사하구'},{code:'410',name:'금정구'},{code:'440',name:'강서구'},{code:'470',name:'연제구'},{code:'500',name:'수영구'},{code:'530',name:'사상구'},{code:'710',name:'기장군'}],
'27':[{code:'110',name:'중구'},{code:'140',name:'동구'},{code:'170',name:'서구'},{code:'200',name:'남구'},{code:'230',name:'북구'},{code:'260',name:'수성구'},{code:'290',name:'달서구'},{code:'710',name:'달성군'},{code:'720',name:'군위군'}],
'28':[{code:'110',name:'중구'},{code:'140',name:'동구'},{code:'177',name:'미추홀구'},{code:'185',name:'연수구'},{code:'200',name:'남동구'},{code:'237',name:'부평구'},{code:'245',name:'계양구'},{code:'260',name:'서구'},{code:'710',name:'강화군'},{code:'720',name:'옹진군'}],
'29':[{code:'110',name:'동구'},{code:'140',name:'서구'},{code:'170',name:'남구'},{code:'200',name:'북구'},{code:'230',name:'광산구'}],
'30':[{code:'110',name:'동구'},{code:'140',name:'중구'},{code:'170',name:'서구'},{code:'200',name:'유성구'},{code:'230',name:'대덕구'}],
'31':[{code:'110',name:'중구'},{code:'140',name:'남구'},{code:'170',name:'동구'},{code:'200',name:'북구'},{code:'710',name:'울주군'}],
'36':[{code:'110',name:'세종시'}],
'41':[{code:'111',name:'수원시'},{code:'131',name:'성남시'},{code:'150',name:'의정부시'},{code:'171',name:'안양시'},{code:'192',name:'부천시'},{code:'210',name:'광명시'},{code:'220',name:'평택시'},{code:'250',name:'동두천시'},{code:'271',name:'안산시'},{code:'281',name:'고양시'},{code:'290',name:'과천시'},{code:'310',name:'구리시'},{code:'360',name:'남양주시'},{code:'370',name:'오산시'},{code:'390',name:'시흥시'},{code:'410',name:'군포시'},{code:'430',name:'의왕시'},{code:'450',name:'하남시'},{code:'461',name:'용인시'},{code:'480',name:'파주시'},{code:'500',name:'이천시'},{code:'510',name:'안성시'},{code:'521',name:'김포시'},{code:'590',name:'화성시'},{code:'610',name:'광주시'},{code:'630',name:'양주시'},{code:'650',name:'포천시'},{code:'670',name:'여주시'},{code:'800',name:'연천군'},{code:'820',name:'가평군'},{code:'830',name:'양평군'}],
'42':[{code:'110',name:'춘천시'},{code:'130',name:'원주시'},{code:'150',name:'강릉시'},{code:'170',name:'동해시'},{code:'190',name:'태백시'},{code:'210',name:'속초시'},{code:'230',name:'삼척시'},{code:'720',name:'홍천군'},{code:'730',name:'횡성군'},{code:'750',name:'영월군'},{code:'760',name:'평창군'},{code:'770',name:'정선군'},{code:'780',name:'철원군'},{code:'790',name:'화천군'},{code:'800',name:'양구군'},{code:'810',name:'인제군'},{code:'820',name:'고성군'},{code:'830',name:'양양군'}],
'43':[{code:'111',name:'청주시'},{code:'130',name:'충주시'},{code:'150',name:'제천시'},{code:'720',name:'보은군'},{code:'730',name:'옥천군'},{code:'740',name:'영동군'},{code:'745',name:'증평군'},{code:'750',name:'진천군'},{code:'770',name:'괴산군'},{code:'800',name:'음성군'},{code:'820',name:'단양군'}],
'44':[{code:'131',name:'천안시'},{code:'150',name:'공주시'},{code:'180',name:'보령시'},{code:'200',name:'아산시'},{code:'210',name:'서산시'},{code:'230',name:'논산시'},{code:'250',name:'계룡시'},{code:'270',name:'당진시'},{code:'710',name:'금산군'},{code:'760',name:'부여군'},{code:'770',name:'서천군'},{code:'790',name:'청양군'},{code:'800',name:'홍성군'},{code:'810',name:'예산군'},{code:'825',name:'태안군'}],
'45':[{code:'111',name:'전주시'},{code:'130',name:'군산시'},{code:'140',name:'익산시'},{code:'180',name:'정읍시'},{code:'190',name:'남원시'},{code:'210',name:'김제시'},{code:'710',name:'완주군'},{code:'720',name:'진안군'},{code:'730',name:'무주군'},{code:'740',name:'장수군'},{code:'750',name:'임실군'},{code:'770',name:'순창군'},{code:'790',name:'고창군'},{code:'800',name:'부안군'}],
'46':[{code:'110',name:'목포시'},{code:'130',name:'여수시'},{code:'150',name:'순천시'},{code:'170',name:'나주시'},{code:'230',name:'광양시'},{code:'710',name:'담양군'},{code:'720',name:'곡성군'},{code:'730',name:'구례군'},{code:'770',name:'고흥군'},{code:'780',name:'보성군'},{code:'790',name:'화순군'},{code:'800',name:'장흥군'},{code:'810',name:'강진군'},{code:'820',name:'해남군'},{code:'830',name:'영암군'},{code:'840',name:'무안군'},{code:'860',name:'함평군'},{code:'870',name:'영광군'},{code:'880',name:'장성군'},{code:'890',name:'완도군'},{code:'900',name:'진도군'},{code:'910',name:'신안군'}],
'47':[{code:'111',name:'포항시'},{code:'130',name:'경주시'},{code:'150',name:'김천시'},{code:'170',name:'안동시'},{code:'190',name:'구미시'},{code:'210',name:'영주시'},{code:'230',name:'영천시'},{code:'250',name:'상주시'},{code:'280',name:'문경시'},{code:'290',name:'경산시'},{code:'730',name:'의성군'},{code:'740',name:'청송군'},{code:'750',name:'영양군'},{code:'760',name:'영덕군'},{code:'770',name:'청도군'},{code:'780',name:'고령군'},{code:'790',name:'성주군'},{code:'800',name:'칠곡군'},{code:'820',name:'예천군'},{code:'830',name:'봉화군'},{code:'840',name:'울진군'},{code:'850',name:'울릉군'}],
'48':[{code:'121',name:'창원시'},{code:'170',name:'진주시'},{code:'220',name:'통영시'},{code:'240',name:'사천시'},{code:'250',name:'김해시'},{code:'270',name:'밀양시'},{code:'310',name:'거제시'},{code:'330',name:'양산시'},{code:'720',name:'의령군'},{code:'730',name:'함안군'},{code:'740',name:'창녕군'},{code:'820',name:'고성군'},{code:'840',name:'남해군'},{code:'850',name:'하동군'},{code:'860',name:'산청군'},{code:'870',name:'함양군'},{code:'880',name:'거창군'},{code:'890',name:'합천군'}],
'50':[{code:'110',name:'제주시'},{code:'130',name:'서귀포시'}]
};

const BASE1='https://apis.data.go.kr/B550928/searchLtcInsttService02/getLtcInsttSeachList02';
const BASE2='https://apis.data.go.kr/B550928/searchLtcInsttService02/getBillGreentInsttSearchList02';
const DETAIL_BASE='https://apis.data.go.kr/B550928/getLtcInsttDetailInfoService02';

// ── TM좌표(EPSG:5179) → WGS84 변환 ──
function tmToWgs84(x,y){
  var a=6378137,f=1/298.257222101,b=a*(1-f);
  var e2=(a*a-b*b)/(a*a),ep2=(a*a-b*b)/(b*b);
  var x0=1000000,y0=2000000,k0=0.9996,lon0=127.5*Math.PI/180,lat0=38*Math.PI/180;
  var dx=x-x0,dy=y-y0;
  var M0=a*((1-e2/4-3*e2*e2/64)*lat0-(3*e2/8+3*e2*e2/32)*Math.sin(2*lat0)+(15*e2*e2/256)*Math.sin(4*lat0));
  var M=M0+dy/k0;
  var mu=M/(a*(1-e2/4-3*e2*e2/64-5*e2*e2*e2/256));
  var e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  var phi=mu+(3*e1/2-27*e1*e1*e1/32)*Math.sin(2*mu)+(21*e1*e1/16-55*e1*e1*e1*e1/32)*Math.sin(4*mu)+(151*e1*e1*e1/96)*Math.sin(6*mu);
  var sp=Math.sin(phi),cp=Math.cos(phi),tp=Math.tan(phi);
  var C=ep2*cp*cp,T=tp*tp;
  var N=a/Math.sqrt(1-e2*sp*sp);
  var R=a*(1-e2)/Math.pow(1-e2*sp*sp,1.5);
  var D=dx/(N*k0);
  var lat=phi-(N*tp/R)*(D*D/2-(5+3*T+10*C-4*C*C-9*ep2)*D*D*D*D/24+(61+90*T+298*C+45*T*T-252*ep2-3*C*C)*D*D*D*D*D*D/720);
  var lon=lon0+(D-(1+2*T+C)*D*D*D/6+(5-2*C+28*T-3*C*C+8*ep2+24*T*T)*D*D*D*D*D/120)/cp;
  return {lat:lat*180/Math.PI, lng:lon*180/Math.PI};
}

// ── 유틸 ──
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function parseItems(xml){var items=[];var matches=xml.matchAll(/<item>([\s\S]*?)<\/item>/g);for(var m of matches){var obj={};var tags=m[1].matchAll(/<(\w+)>(.*?)<\/\1>/g);for(var t of tags)obj[t[1]]=t[2];items.push(obj);}return items;}
function parseItem(xml){var m=xml.match(/<item>([\s\S]*?)<\/item>/);if(!m)return null;var obj={};var tags=m[1].matchAll(/<(\w+)>(.*?)<\/\1>/g);for(var t of tags)obj[t[1]]=t[2];return obj;}
async function fetchRetry(url,opts,retries){retries=retries||3;for(var i=0;i<retries;i++){try{var r=await fetch(url,opts||{});if(!r.ok)throw new Error('HTTP '+r.status);return await r.text();}catch(e){if(i===retries-1)throw e;await sleep(1000*(i+1));}}};

function getDongName(g){
  if(!g||!g.siDoCd||!g.siGunGuCd||!g.BDongCd)return '';
  return dongCodeMap[g.siDoCd+g.siGunGuCd+g.BDongCd]||'';
}

var TYPE_MAP1={'A01':'노인요양시설','A02':'노인요양공동생활가정','B01':'방문요양','B02':'방문목욕','B03':'주간보호','B04':'단기보호','B05':'방문간호','B06':'복지용구','C01':'방문요양','C02':'방문목욕','C03':'주간보호','C04':'단기보호','C05':'방문간호','C06':'복지용구','G01':'치매전담실가형','G02':'치매전담실나형','G03':'치매전담형주야간보호'};
var TYPE_MAP2={'001':'방문요양','002':'방문목욕','003':'주간보호','004':'단기보호','005':'방문간호','006':'복지용구'};

// ── 1단계: 기관 목록 검색 ──
async function searchFacilities(sidoCd,sigunguCd){
  var merged={};
  for(var page=1;page<=10;page++){
    var url=BASE1+'?serviceKey='+API_KEY+'&siDoCd='+sidoCd+'&siGunGuCd='+sigunguCd+'&pageNo='+page+'&numOfRows=100';
    await sleep(DELAY);
    try{var xml=await fetchRetry(url);var items=parseItems(xml);if(items.length===0)break;
    for(var it of items){var sym=it.longTermAdminSym;if(!sym)continue;if(!merged[sym])merged[sym]={sym,name:it.adminNm||'',types:[],typeCodes:[],adminPttnCd:it.adminPttnCd||'',siDoCd:sidoCd,siGunGuCd:sigunguCd,BDongCd:it.BDongCd||''};
    var tn=TYPE_MAP1[it.adminPttnCd]||it.adminPttnCd;if(!merged[sym].types.includes(tn)){merged[sym].types.push(tn);merged[sym].typeCodes.push(it.adminPttnCd);}}
    if(items.length<100)break;}catch(e){}
  }
  for(var page=1;page<=10;page++){
    var url=BASE2+'?serviceKey='+API_KEY+'&siDoCd='+sidoCd+'&pageNo='+page+'&numOfRows=100';
    await sleep(DELAY);
    try{var xml=await fetchRetry(url);var items=parseItems(xml);if(items.length===0)break;
    for(var it of items){if(it.siGunGuCd!==sigunguCd)continue;var sym=it.longTermAdminSym;if(!sym)continue;
    if(!merged[sym])merged[sym]={sym,name:it.adminNm||'',types:[],typeCodes:[],adminPttnCd:it.adminPttnCd||'',siDoCd:sidoCd,siGunGuCd:sigunguCd,BDongCd:it.BDongCd||''};
    if(it.BDongCd&&!merged[sym].BDongCd)merged[sym].BDongCd=it.BDongCd;
    var tn=TYPE_MAP2[it.serviceKind]||it.serviceKind;if(!merged[sym].types.includes(tn)){merged[sym].types.push(tn);if(it.adminPttnCd&&!merged[sym].typeCodes.includes(it.adminPttnCd))merged[sym].typeCodes.push(it.adminPttnCd);}}
    if(items.length<100)break;}catch(e){}
  }
  return Object.values(merged);
}

// ── 2단계: 상세 정보 ──
async function fetchDetail(sym,adminPttnCd){
  var params='longTermAdminSym='+sym+'&adminPttnCd='+adminPttnCd+'&serviceKey='+API_KEY;
  var eps=['getGeneralSttusDetailInfoItem02','getStaffSttusDetailInfoItem02','getInsttSttusDetailInfoItem02','getAceptncNmprDetailInfoItem02','getInsttEtcDetailInfoItem02'];
  var lists=[{p:'getNonBenefitSttusDetailInfoList02',e:'&pageNo=1&numOfRows=100'},{p:'getWlfareToolDetailInfoList02',e:'&pageNo=1&numOfRows=100'}];
  var detail={};
  for(var ep of eps){await sleep(DELAY);try{var xml=await fetchRetry(DETAIL_BASE+'/'+ep+'?'+params);detail[ep.replace(/^get|DetailInfoItem02$/g,'')]=parseItem(xml);}catch(e){detail[ep]=null;}}
  for(var{p,e}of lists){await sleep(DELAY);try{var xml=await fetchRetry(DETAIL_BASE+'/'+p+'?'+params+e);detail[p.replace(/^get|DetailInfoList02$/g,'')]=parseItems(xml);}catch(e){detail[p]=[];}}
  return detail;
}

// ── 3단계: 주소/좌표 확보 (3단계 전략) ──
async function fetchAddress(general,sidoName,sigunguName,instName){
  if(!general)return {address:'',lat:null,lng:null};

  var buldMnnm=general.gunmulMlno||'0';
  var buldSlno=(general.gunmulSlno&&general.gunmulSlno!=='0')?general.gunmulSlno:'0';
  var bldNo=buldMnnm+(buldSlno!=='0'?'-'+buldSlno:'');
  var dongName=getDongName(general);
  var address='',lat=null,lng=null;

  // ═══ STEP 1: JUSO 키워드 검색 (동 이름 포함) ═══
  if(JUSO_KEY&&buldMnnm!=='0'){
    var keywords=[
      sidoName+' '+sigunguName+(dongName?' '+dongName:'')+' '+bldNo,
      sigunguName+(dongName?' '+dongName:'')+' '+bldNo,
    ];
    for(var kw of keywords){
      await sleep(DELAY);
      try{
        var url='https://business.juso.go.kr/addrlink/addrLinkApi.do?currentPage=1&countPerPage=100&keyword='+encodeURIComponent(kw)+'&confmKey='+JUSO_KEY+'&resultType=json';
        var res=await fetch(url);var data=await res.json();
        if(data.results&&data.results.juso&&data.results.juso.length>0){
          var matched=data.results.juso.find(function(j){return j.rnMgtSn===general.roadNmCd&&String(j.buldMnnm)===String(buldMnnm);});
          if(!matched)matched=data.results.juso.find(function(j){return String(j.buldMnnm)===String(buldMnnm)&&j.emdNm&&dongName&&j.emdNm.includes(dongName);});
          if(matched){address=matched.roadAddr||'';break;}
        }
      }catch(e){}
    }
  }

  // ═══ STEP 2: JUSO 좌표 API (roadNmCd 직접 조회) ═══
  if(!address&&JUSO_COORD_KEY&&general.roadNmCd&&buldMnnm!=='0'){
    var admCd=general.siDoCd+general.siGunGuCd+(general.BDongCd||'')+(general.riCd||'00');
    // admCd가 10자리가 되도록
    while(admCd.length<10)admCd+='0';
    await sleep(DELAY);
    try{
      var cUrl='https://business.juso.go.kr/addrlink/addrCoordApi.do?admCd='+admCd+'&rnMgtSn='+general.roadNmCd+'&udrtYn=0&buldMnnm='+buldMnnm+'&buldSlno='+buldSlno+'&confmKey='+JUSO_COORD_KEY+'&resultType=json';
      var cRes=await fetch(cUrl);var cData=await cRes.json();
      if(cData.results&&cData.results.juso&&cData.results.juso.length>0){
        var j=cData.results.juso[0];
        var entX=parseFloat(j.entX);var entY=parseFloat(j.entY);
        if(entX>100000){
          // TM좌표 → WGS84 변환
          var wgs=tmToWgs84(entX,entY);
          lat=wgs.lat;lng=wgs.lng;
        }else{
          lat=entY;lng=entX;
        }
        // 주소 텍스트 조립
        address=[sidoName,sigunguName,dongName,bldNo].filter(Boolean).join(' ');
      }
    }catch(e){}
  }

  // ═══ STEP 3: 카카오 장소 검색 (기관명으로) ═══
  if((!address||address.split(' ').length<=2)&&KAKAO_KEY&&instName){
    await sleep(DELAY);
    try{
      var kRes=await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?query='+encodeURIComponent(instName+' '+sigunguName)+'&size=3',{headers:{'Authorization':'KakaoAK '+KAKAO_KEY}});
      var kData=await kRes.json();
      if(kData.documents&&kData.documents.length>0){
        var doc=kData.documents[0];
        var kAddr=doc.road_address_name||doc.address_name||'';
        if(kAddr&&kAddr.length>10){address=kAddr;lat=parseFloat(doc.y);lng=parseFloat(doc.x);}
      }
    }catch(e){}
  }

  // ═══ 좌표 확보: 카카오 지오코딩 ═══
  if(!lat&&KAKAO_KEY&&address&&address.length>10){
    await sleep(DELAY);
    try{
      var gRes=await fetch('https://dapi.kakao.com/v2/local/search/address.json?query='+encodeURIComponent(address),{headers:{'Authorization':'KakaoAK '+KAKAO_KEY}});
      var gData=await gRes.json();
      if(gData.documents&&gData.documents.length>0){lng=parseFloat(gData.documents[0].x);lat=parseFloat(gData.documents[0].y);}
    }catch(e){}
  }

  // 폴백 주소
  if(!address)address=[sidoName,sigunguName].filter(Boolean).join(' ');

  return {address,lat,lng};
}

// ── 메인 ──
async function main(){
  var regions=SIGUNGU[SIDO];
  if(!regions){console.error('❌ 시도코드 '+SIDO+' 없음');process.exit(1);}
  var sidoName=SIDO_NM[SIDO]||'';
  var dataDir=path.join(process.cwd(),'data',SIDO);
  fs.mkdirSync(dataDir,{recursive:true});

  console.log('🚀 '+sidoName+' 데이터 수집 v2 ('+regions.length+'개 시/군/구)\n');
  console.log('   API_KEY: ✅  JUSO_KEY: '+(JUSO_KEY?'✅':'❌')+'  JUSO_COORD_KEY: '+(JUSO_COORD_KEY?'✅':'❌')+'  KAKAO_KEY: '+(KAKAO_KEY?'✅':'❌')+'\n');

  var totalFacilities=0,totalAddr=0,totalCoord=0;
  var startTime=Date.now();

  for(var ri=0;ri<regions.length;ri++){
    var region=regions[ri];
    var regionStart=Date.now();
    console.log('\n📍 ['+(ri+1)+'/'+regions.length+'] '+sidoName+' '+region.name);

    console.log('  🔍 기관 목록 수집...');
    var facilities=await searchFacilities(SIDO,region.code);
    console.log('  📋 '+facilities.length+'개 기관');

    var results=[];
    for(var fi=0;fi<facilities.length;fi++){
      var fac=facilities[fi];
      process.stdout.write('  📦 ['+(fi+1)+'/'+facilities.length+'] '+fac.name+' ...');

      var detail=await fetchDetail(fac.sym,fac.adminPttnCd||fac.typeCodes[0]||'A01');
      var general=detail.GeneralSttus||null;
      var addr=await fetchAddress(general,sidoName,region.name,fac.name);

      if(addr.address&&addr.address.length>10)totalAddr++;
      if(addr.lat)totalCoord++;

      results.push({
        sym:fac.sym,name:fac.name,types:fac.types,typeCodes:fac.typeCodes,
        emdNm:getDongName(general||{}),
        address:addr.address,lat:addr.lat,lng:addr.lng,
        general:detail.GeneralSttus,staff:detail.StaffSttus,facility:detail.InsttSttus,
        capacity:detail.AceptncNmpr,etc:detail.InsttEtc,
        nonBenefit:detail.NonBenefitSttus||[],welfare:detail.WlfareTool||[]
      });
      process.stdout.write(' ✅ ('+(addr.address.length>10?'주소O':'주소X')+', '+(addr.lat?'좌표O':'좌표X')+')\n');
    }

    var filePath=path.join(dataDir,region.code+'.json');
    fs.writeFileSync(filePath,JSON.stringify(results,null,2),'utf-8');
    var elapsed=((Date.now()-regionStart)/1000).toFixed(1);
    console.log('  💾 '+filePath+' ('+results.length+'개, '+elapsed+'초)');
    totalFacilities+=results.length;
  }

  var totalElapsed=((Date.now()-startTime)/1000/60).toFixed(1);
  console.log('\n✅ '+sidoName+' 수집 완료!');
  console.log('   총 '+totalFacilities+'개 · 주소성공 '+totalAddr+'개 ('+Math.round(totalAddr/totalFacilities*100)+'%) · 좌표성공 '+totalCoord+'개 ('+Math.round(totalCoord/totalFacilities*100)+'%)');
  console.log('   소요: '+totalElapsed+'분\n');
}

main().catch(e=>{console.error('❌',e);process.exit(1);});
