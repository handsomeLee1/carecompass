/**
 * 주소 수정 스크립트 v2.1 - 3단계 전략
 * STEP1: JUSO 키워드(동이름) → STEP2: JUSO 좌표API+역지오코딩 → STEP3: 카카오 장소검색
 * 
 * 사용법: JUSO_KEY=x JUSO_COORD_KEY=x KAKAO_KEY=x node scripts/fix-address-v2.js 41 480
 */
const fs=require('fs');
const path=require('path');

const JUSO_KEY=process.env.JUSO_KEY||'';
const JUSO_COORD_KEY=process.env.JUSO_COORD_KEY||'';
const KAKAO_KEY=process.env.KAKAO_KEY||'';
const SIDO=process.argv[2]||'41';
const SIGUNGU=process.argv[3]||'';
const DELAY=250;

if(!JUSO_KEY&&!KAKAO_KEY){console.error('❌ JUSO_KEY 또는 KAKAO_KEY 필요');process.exit(1);}

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
  return {lat:lat*180/Math.PI,lng:lon*180/Math.PI};
}

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
  return {};
}
var dongCodeMap=loadDongCodeMap();
console.log('✅ dongCodeMap: '+Object.keys(dongCodeMap).length+'개\n');

const SIDO_NM={'11':'서울특별시','26':'부산광역시','27':'대구광역시','28':'인천광역시','29':'광주광역시','30':'대전광역시','31':'울산광역시','36':'세종특별자치시','41':'경기도','42':'강원특별자치도','43':'충청북도','44':'충청남도','45':'전북특별자치도','46':'전라남도','47':'경상북도','48':'경상남도','50':'제주특별자치도'};
const SGG_NM={'41111':'수원시','41131':'성남시','41150':'의정부시','41171':'안양시','41192':'부천시','41210':'광명시','41220':'평택시','41250':'동두천시','41271':'안산시','41281':'고양시','41290':'과천시','41310':'구리시','41360':'남양주시','41370':'오산시','41390':'시흥시','41410':'군포시','41430':'의왕시','41450':'하남시','41461':'용인시','41480':'파주시','41500':'이천시','41510':'안성시','41521':'김포시','41590':'화성시','41610':'광주시','41630':'양주시','41650':'포천시','41670':'여주시','41800':'연천군','41820':'가평군','41830':'양평군','11110':'종로구','11140':'중구','11170':'용산구','11200':'성동구','11215':'광진구','11230':'동대문구','11260':'중랑구','11290':'성북구','11305':'강북구','11320':'도봉구','11350':'노원구','11380':'은평구','11410':'서대문구','11440':'마포구','11470':'양천구','11500':'강서구','11530':'구로구','11545':'금천구','11560':'영등포구','11590':'동작구','11620':'관악구','11650':'서초구','11680':'강남구','11710':'송파구','11740':'강동구','26110':'중구','26140':'서구','26170':'동구','26200':'영도구','26230':'부산진구','26260':'동래구','26290':'남구','26320':'북구','26350':'해운대구','26380':'사하구','26410':'금정구','26440':'강서구','26470':'연제구','26500':'수영구','26530':'사상구','26710':'기장군','50110':'제주시','50130':'서귀포시'};

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function getDongName(g){
  if(!g||!g.siDoCd||!g.siGunGuCd||!g.BDongCd)return '';
  return dongCodeMap[g.siDoCd+g.siGunGuCd+g.BDongCd]||'';
}

async function fixOne(inst,sidoName,sgName){
  var g=inst.general||{};
  var buldMnnm=g.gunmulMlno||'0';
  var buldSlno=(g.gunmulSlno&&g.gunmulSlno!=='0')?g.gunmulSlno:'0';
  var bldNo=buldMnnm+(buldSlno!=='0'?'-'+buldSlno:'');
  var dongName=getDongName(g);

  // ═══ STEP 1: JUSO 키워드 검색 (동 이름 포함) ═══
  if(JUSO_KEY&&buldMnnm!=='0'){
    var keywords=[
      sidoName+' '+sgName+(dongName?' '+dongName:'')+' '+bldNo,
      sgName+(dongName?' '+dongName:'')+' '+bldNo,
    ];
    for(var kw of keywords){
      await sleep(DELAY);
      try{
        var url='https://business.juso.go.kr/addrlink/addrLinkApi.do?currentPage=1&countPerPage=100&keyword='+encodeURIComponent(kw)+'&confmKey='+JUSO_KEY+'&resultType=json';
        var res=await fetch(url);var data=await res.json();
        if(data.results&&data.results.juso&&data.results.juso.length>0){
          var matched=data.results.juso.find(j=>j.rnMgtSn===g.roadNmCd&&String(j.buldMnnm)===String(buldMnnm));
          if(!matched)matched=data.results.juso.find(j=>String(j.buldMnnm)===String(buldMnnm)&&j.emdNm&&dongName&&j.emdNm.includes(dongName));
          if(matched){
            var addr=matched.roadAddr||'';
            var lat=null,lng=null;
            if(KAKAO_KEY&&addr){
              await sleep(DELAY);
              try{var gR=await fetch('https://dapi.kakao.com/v2/local/search/address.json?query='+encodeURIComponent(addr),{headers:{'Authorization':'KakaoAK '+KAKAO_KEY}});var gD=await gR.json();if(gD.documents&&gD.documents.length>0){lng=parseFloat(gD.documents[0].x);lat=parseFloat(gD.documents[0].y);}}catch(e){}
            }
            return {address:addr,lat,lng,method:'juso_dong'};
          }
        }
      }catch(e){}
    }
  }

  // ═══ STEP 2: JUSO 좌표 API → TM→WGS84 → 카카오 역지오코딩 ═══
  if(JUSO_COORD_KEY&&g.roadNmCd&&buldMnnm!=='0'){
    var admCd=(g.siDoCd||'')+(g.siGunGuCd||'')+(g.BDongCd||'')+(g.riCd||'00');
    while(admCd.length<10)admCd+='0';
    await sleep(DELAY);
    try{
      var cUrl='https://business.juso.go.kr/addrlink/addrCoordApi.do?admCd='+admCd+'&rnMgtSn='+g.roadNmCd+'&udrtYn=0&buldMnnm='+buldMnnm+'&buldSlno='+buldSlno+'&confmKey='+JUSO_COORD_KEY+'&resultType=json';
      var cRes=await fetch(cUrl);var cData=await cRes.json();
      if(cData.results&&cData.results.juso&&cData.results.juso.length>0){
        var j=cData.results.juso[0];
        var entX=parseFloat(j.entX);var entY=parseFloat(j.entY);
        var lat=null,lng=null;

        // TM좌표 → WGS84 변환
        if(entX>100000){
          var wgs=tmToWgs84(entX,entY);
          lat=wgs.lat;lng=wgs.lng;
        }else{
          lat=entY;lng=entX;
        }

        // 카카오 역지오코딩 (좌표 → 주소 텍스트)
        var address='';
        if(KAKAO_KEY&&lat&&lng){
          await sleep(DELAY);
          try{
            var rUrl='https://dapi.kakao.com/v2/local/geo/coord2address.json?x='+lng+'&y='+lat;
            var rRes=await fetch(rUrl,{headers:{'Authorization':'KakaoAK '+KAKAO_KEY}});
            var rData=await rRes.json();
            if(rData.documents&&rData.documents.length>0){
              var doc=rData.documents[0];
              address=doc.road_address?doc.road_address.address_name:(doc.address?doc.address.address_name:'');
            }
          }catch(e){}
        }

        // 역지오코딩 실패 시 조합
        if(!address)address=[sidoName,sgName,dongName,bldNo].filter(Boolean).join(' ');

        if(lat&&lng)return {address,lat,lng,method:'juso_coord'};
      }
    }catch(e){}
  }

  // ═══ STEP 3: 카카오 장소 검색 (기관명) ═══
  if(KAKAO_KEY){
    await sleep(DELAY);
    try{
      var kRes=await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?query='+encodeURIComponent(inst.name+' '+sgName)+'&size=3',{headers:{'Authorization':'KakaoAK '+KAKAO_KEY}});
      var kData=await kRes.json();
      if(kData.documents&&kData.documents.length>0){
        var doc=kData.documents[0];
        var kAddr=doc.road_address_name||doc.address_name||'';
        if(kAddr&&kAddr.length>15)return {address:kAddr,lat:parseFloat(doc.y),lng:parseFloat(doc.x),method:'kakao_keyword'};
      }
    }catch(e){}
  }

  return null;
}

async function main(){
  var dataDir=path.join(process.cwd(),'data',SIDO);
  if(!fs.existsSync(dataDir)){console.error('❌ 폴더 없음');process.exit(1);}

  var files=fs.readdirSync(dataDir).filter(f=>f.endsWith('.json'));
  if(SIGUNGU)files=files.filter(f=>f===SIGUNGU+'.json');

  var sidoName=SIDO_NM[SIDO]||'';
  console.log('🔧 주소 수정 v2.1 (3단계): '+sidoName+' ('+files.length+'개 파일)');
  console.log('   JUSO_KEY: '+(JUSO_KEY?'✅':'❌')+'  JUSO_COORD_KEY: '+(JUSO_COORD_KEY?'✅':'❌')+'  KAKAO_KEY: '+(KAKAO_KEY?'✅':'❌')+'\n');

  var totalFixed=0,totalFailed=0;
  var methods={juso_dong:0,juso_coord:0,kakao_keyword:0};

  for(var file of files){
    var sgCode=file.replace('.json','');
    var sgName=SGG_NM[SIDO+sgCode]||sgCode;
    var filePath=path.join(dataDir,file);
    var data=JSON.parse(fs.readFileSync(filePath,'utf-8'));
    var shorts=data.filter(i=>!i.address||i.address.split(' ').length<=2||i.address.length<15);
    if(shorts.length===0)continue;

    console.log('📍 '+sidoName+' '+sgName+': '+shorts.length+'개 수정 필요');

    var fixed=0,failed=0;
    for(var si=0;si<shorts.length;si++){
      var inst=shorts[si];
      var dongName=getDongName(inst.general||{});
      process.stdout.write('  🔍 ['+(si+1)+'/'+shorts.length+'] '+inst.name+(dongName?' ('+dongName+')':'')+' ...');

      var result=await fixOne(inst,sidoName,sgName);
      if(result){
        inst.address=result.address;
        if(result.lat)inst.lat=result.lat;
        if(result.lng)inst.lng=result.lng;
        fixed++;
        methods[result.method]=(methods[result.method]||0)+1;
        process.stdout.write(' ✅ '+result.address+' ('+result.method+')\n');
      }else{
        failed++;
        process.stdout.write(' ❌ 실패\n');
      }
    }

    fs.writeFileSync(filePath,JSON.stringify(data,null,2),'utf-8');
    console.log('  💾 저장: 수정 '+fixed+', 실패 '+failed+'\n');
    totalFixed+=fixed;totalFailed+=failed;
  }

  console.log('✅ 완료! 수정: '+totalFixed+'개, 실패: '+totalFailed+'개');
  console.log('   방법별: JUSO동='+methods.juso_dong+', JUSO좌표='+methods.juso_coord+', 카카오='+methods.kakao_keyword+'\n');
}

main().catch(e=>{console.error('❌',e);process.exit(1);});
