/**
 * 지역별 랜딩 페이지 생성 스크립트
 * 사용법: node scripts/generate-regions.js
 */
const fs=require('fs');
const path=require('path');

const SIDO_NM={'11':'서울특별시','26':'부산광역시','27':'대구광역시','28':'인천광역시','29':'광주광역시','30':'대전광역시','31':'울산광역시','36':'세종특별자치시','41':'경기도','42':'강원특별자치도','43':'충청북도','44':'충청남도','45':'전북특별자치도','46':'전라남도','47':'경상북도','48':'경상남도','50':'제주특별자치도'};
const SGG_NM={'41111':'수원시','41131':'성남시','41150':'의정부시','41171':'안양시','41192':'부천시','41210':'광명시','41220':'평택시','41250':'동두천시','41271':'안산시','41281':'고양시','41290':'과천시','41310':'구리시','41360':'남양주시','41370':'오산시','41390':'시흥시','41410':'군포시','41430':'의왕시','41450':'하남시','41461':'용인시','41480':'파주시','41500':'이천시','41510':'안성시','41521':'김포시','41590':'화성시','41610':'광주시','41630':'양주시','41650':'포천시','41670':'여주시','41800':'연천군','41820':'가평군','41830':'양평군','11110':'종로구','11140':'중구','11170':'용산구','11200':'성동구','11215':'광진구','11230':'동대문구','11260':'중랑구','11290':'성북구','11305':'강북구','11320':'도봉구','11350':'노원구','11380':'은평구','11410':'서대문구','11440':'마포구','11470':'양천구','11500':'강서구','11530':'구로구','11545':'금천구','11560':'영등포구','11590':'동작구','11620':'관악구','11650':'서초구','11680':'강남구','11710':'송파구','11740':'강동구','26110':'중구','26140':'서구','26170':'동구','26200':'영도구','26230':'부산진구','26260':'동래구','26290':'남구','26320':'북구','26350':'해운대구','26380':'사하구','26410':'금정구','26440':'강서구','26470':'연제구','26500':'수영구','26530':'사상구','26710':'기장군','27110':'중구','27140':'동구','27170':'서구','27200':'남구','27230':'북구','27260':'수성구','27290':'달서구','27710':'달성군','27720':'군위군','28110':'중구','28140':'동구','28177':'미추홀구','28185':'연수구','28200':'남동구','28237':'부평구','28245':'계양구','28260':'서구','28710':'강화군','28720':'옹진군','29110':'동구','29140':'서구','29170':'남구','29200':'북구','29230':'광산구','30110':'동구','30140':'중구','30170':'서구','30200':'유성구','30230':'대덕구','31110':'중구','31140':'남구','31170':'동구','31200':'북구','31710':'울주군','36110':'세종시','42110':'춘천시','42130':'원주시','42150':'강릉시','42170':'동해시','42190':'태백시','42210':'속초시','42230':'삼척시','42720':'홍천군','42730':'횡성군','42750':'영월군','42760':'평창군','42770':'정선군','42780':'철원군','42790':'화천군','42800':'양구군','42810':'인제군','42820':'고성군','42830':'양양군','43111':'청주시','43130':'충주시','43150':'제천시','43720':'보은군','43730':'옥천군','43740':'영동군','43745':'증평군','43750':'진천군','43770':'괴산군','43800':'음성군','43820':'단양군','44131':'천안시','44150':'공주시','44180':'보령시','44200':'아산시','44210':'서산시','44230':'논산시','44250':'계룡시','44270':'당진시','44710':'금산군','44760':'부여군','44770':'서천군','44790':'청양군','44800':'홍성군','44810':'예산군','44825':'태안군','45111':'전주시','45130':'군산시','45140':'익산시','45180':'정읍시','45190':'남원시','45210':'김제시','45710':'완주군','45720':'진안군','45730':'무주군','45740':'장수군','45750':'임실군','45770':'순창군','45790':'고창군','45800':'부안군','46110':'목포시','46130':'여수시','46150':'순천시','46170':'나주시','46230':'광양시','46710':'담양군','46720':'곡성군','46730':'구례군','46770':'고흥군','46780':'보성군','46790':'화순군','46800':'장흥군','46810':'강진군','46820':'해남군','46830':'영암군','46840':'무안군','46860':'함평군','46870':'영광군','46880':'장성군','46890':'완도군','46900':'진도군','46910':'신안군','47111':'포항시','47130':'경주시','47150':'김천시','47170':'안동시','47190':'구미시','47210':'영주시','47230':'영천시','47250':'상주시','47280':'문경시','47290':'경산시','47730':'의성군','47740':'청송군','47750':'영양군','47760':'영덕군','47770':'청도군','47780':'고령군','47790':'성주군','47800':'칠곡군','47820':'예천군','47830':'봉화군','47840':'울진군','47850':'울릉군','48121':'창원시','48170':'진주시','48220':'통영시','48240':'사천시','48250':'김해시','48270':'밀양시','48310':'거제시','48330':'양산시','48720':'의령군','48730':'함안군','48740':'창녕군','48820':'고성군','48840':'남해군','48850':'하동군','48860':'산청군','48870':'함양군','48880':'거창군','48890':'합천군','50110':'제주시','50130':'서귀포시'};

var TYPE_NAMES={'A01':'노인요양시설','A02':'노인요양공동생활가정','A03':'노인요양시설','A04':'노인요양공동생활가정','B01':'방문요양','B02':'방문목욕','B03':'주간보호','B04':'단기보호','B05':'방문간호','B06':'복지용구','C01':'방문요양','C02':'방문목욕','C03':'주간보호','C04':'단기보호','C05':'방문간호','C06':'복지용구','G01':'치매전담실','G02':'치매전담실','G03':'치매전담형주야간보호'};
function tn(c){return TYPE_NAMES[c]||c||'';}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function categorize(items){
  var cats={facility:[],home:[],daycare:[],bath:[],nursing:[],welfare:[],dementia:[],other:[]};
  items.forEach(function(inst){
    var codes=inst.typeCodes||[];
    if(codes.some(c=>c&&c.startsWith('A')))cats.facility.push(inst);
    else if(codes.some(c=>['B01','C01','001'].includes(c)))cats.home.push(inst);
    else if(codes.some(c=>['B03','C03','003'].includes(c)))cats.daycare.push(inst);
    else if(codes.some(c=>['B02','C02','002'].includes(c)))cats.bath.push(inst);
    else if(codes.some(c=>['B05','C05','005'].includes(c)))cats.nursing.push(inst);
    else if(codes.some(c=>['B06','C06','006'].includes(c)))cats.welfare.push(inst);
    else if(codes.some(c=>c&&(c[0]==='G'||c[0]==='M')))cats.dementia.push(inst);
    else cats.other.push(inst);
  });
  return cats;
}

function genFacilityList(items,max,sidoCd,sgCode){
  var list=items.slice(0,max||5);
  return list.map(function(inst){
    var cap='';
    var c=inst.capacity||{};
    var tot=parseInt(c.totPer)||0;
    var now=(parseInt(c.maNowPer)||0)+(parseInt(c.fmNowPer)||0);
    if(tot>0)cap=' · 정원 '+tot+'명 · 현원 '+now+'명';
    var staff='';
    var s=inst.staff||{};
    var rp=parseInt(s.recuProt_1)||0;
    if(rp>0)staff=' · 요양보호사 '+rp+'명';
    return '<a href="/facility/'+inst.sym+'.html" class="rg-card"><div><div class="rg-card-name">'+esc(inst.name)+'</div><div class="rg-card-info"><i class="ti ti-map-pin"></i> '+(inst.address||'').replace(/^[^ ]+ [^ ]+ /,'')+cap+staff+'</div></div><span class="rg-arrow">&rsaquo;</span></a>';
  }).join('')+'<p class="rg-more"><a href="/?sidoCd='+sidoCd+'&sigunguCd='+sgCode+'">전체 '+items.length+'곳 보기 &rsaquo;</a></p>';
}

function generateRegionPage(sidoCd,sgCode,sidoName,sgName,items){
  var cats=categorize(items);
  var total=items.length;
  var title=sidoName+' '+sgName+' 장기요양기관 '+total+'곳 | 케어컴퍼스';
  var desc=sidoName+' '+sgName+' 요양원, 방문요양, 주간보호, 복지용구 기관 총 '+total+'곳. 기관별 인력현황, 시설현황, 비용 비교. 국민건강보험공단 공공데이터 기반.';
  var schema=JSON.stringify({"@context":"https://schema.org","@type":"WebPage","name":title,"description":desc,"url":"https://carecompass.co.kr/region/"+sidoName+"-"+sgName+".html"});

  var sections=[
    {key:'facility',icon:'ti-building',label:'노인요양시설',color:'#EEEDFE',textColor:'#3C3489',numColor:'#534AB7'},
    {key:'home',icon:'ti-home-heart',label:'방문요양',color:'#E1F5EE',textColor:'#085041',numColor:'#0F6E56'},
    {key:'daycare',icon:'ti-sun',label:'주간보호',color:'#E6F1FB',textColor:'#0C447C',numColor:'#185FA5'},
    {key:'bath',icon:'ti-bath',label:'방문목욕',color:'#FBEAF0',textColor:'#72243E',numColor:'#993556'},
    {key:'nursing',icon:'ti-stethoscope',label:'방문간호',color:'#FAECE7',textColor:'#712B13',numColor:'#993C1D'},
    {key:'welfare',icon:'ti-wheelchair',label:'복지용구',color:'#FAEEDA',textColor:'#633806',numColor:'#854F0B'},
  ];

  var statCards=sections.map(function(s){
    return '<div class="rg-stat" style="background:'+s.color+'"><div class="rg-stat-num" style="color:'+s.numColor+'">'+cats[s.key].length+'</div><div class="rg-stat-label" style="color:'+s.textColor+'">'+s.label+'</div></div>';
  }).join('');

  var listSections='';
  sections.forEach(function(s){
    if(cats[s.key].length===0)return;
    listSections+='<div class="rg-section"><div class="rg-section-title"><i class="ti '+s.icon+'"></i> '+sgName+' '+s.label+' '+cats[s.key].length+'곳</div>'+genFacilityList(cats[s.key],5,sidoCd,sgCode)+'</div>';
    if(s.key==='daycare')listSections+='<div class="rg-ad">광고</div>';
  });

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="https://carecompass.co.kr/region/${sidoName}-${sgName}.html">
<link rel="canonical" href="https://carecompass.co.kr/region/${sidoName}-${sgName}.html">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5551838339309079" crossorigin="anonymous"></script>
<script type="application/ld+json">${schema}</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans KR',sans-serif;background:#f5f5fa;color:#222;font-size:16px;line-height:1.7}
.topnav{background:linear-gradient(135deg,#3D3BB5,#6C63FF);position:sticky;top:0;z-index:100}
.topnav-inner{max-width:800px;margin:0 auto;height:48px;display:flex;align-items:center;padding:0 20px;gap:20px}
.logo{color:#fff;font-size:17px;font-weight:600;text-decoration:none}
.logo span{color:#DDD8FF}
.nav-link{color:rgba(255,255,255,0.75);font-size:13px;text-decoration:none}
.nav-link:hover{color:#fff}
.rg-hero{background:linear-gradient(135deg,#3D3BB5,#6C63FF);padding:28px 24px}
.rg-hero .breadcrumb{font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px}
.rg-hero .breadcrumb a{color:rgba(255,255,255,0.6);text-decoration:none}
.rg-hero h1{font-size:24px;font-weight:600;color:#fff;margin-bottom:8px}
.rg-hero p{font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6}
.container{max-width:800px;margin:0 auto;padding:0 16px 40px}
.rg-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin:20px 0}
.rg-stat{border-radius:10px;padding:14px;text-align:center}
.rg-stat-num{font-size:24px;font-weight:600}
.rg-stat-label{font-size:13px;margin-top:4px}
.rg-ad{background:#fafaf5;border:1px dashed #ddd;border-radius:8px;padding:14px;text-align:center;margin:16px 0;font-size:12px;color:#bbb}
.rg-section{background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
.rg-section-title{font-size:17px;font-weight:600;color:#1a1a2e;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:8px}
.rg-section-title i{color:#534AB7;font-size:20px}
.rg-card{display:flex;justify-content:space-between;align-items:center;padding:14px;background:#f8f8fc;border-radius:8px;margin-bottom:8px;text-decoration:none;color:inherit;transition:background 0.15s}
.rg-card:hover{background:#EEEDFE}
.rg-card-name{font-size:15px;font-weight:500;color:#1a1a2e}
.rg-card-info{font-size:13px;color:#888;margin-top:4px}
.rg-card-info i{font-size:14px;vertical-align:-1px}
.rg-arrow{font-size:20px;color:#bbb;flex-shrink:0}
.rg-more{text-align:center;margin:10px 0 0}
.rg-more a{color:#534AB7;font-size:14px;text-decoration:none}
.rg-info{background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
.rg-info h2{font-size:17px;font-weight:600;color:#1a1a2e;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.rg-info h2 i{color:#534AB7;font-size:20px}
.rg-info p{font-size:15px;color:#555;margin-bottom:10px;line-height:1.7}
.rg-cta{background:linear-gradient(135deg,#534AB7,#6C63FF);border-radius:12px;padding:28px;text-align:center;margin-bottom:12px}
.rg-cta-sub{color:rgba(255,255,255,0.8);font-size:14px;margin-bottom:6px}
.rg-cta-title{color:#fff;font-size:18px;font-weight:600;margin-bottom:14px}
.rg-cta-btn{display:inline-block;background:#fff;color:#534AB7;font-size:14px;font-weight:600;padding:10px 32px;border-radius:8px;text-decoration:none}
.rg-footer{text-align:center;padding:24px 0;font-size:12px;color:#999}
.rg-footer a{color:#534AB7;text-decoration:none}
.rg-nearby{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:12px}
.rg-nearby a{display:block;padding:10px 14px;background:#f8f8fc;border-radius:8px;text-decoration:none;font-size:14px;color:#1a1a2e;text-align:center;transition:background 0.15s}
.rg-nearby a:hover{background:#EEEDFE}
@media(max-width:768px){
  body{font-size:17px}
  .rg-hero h1{font-size:22px}
  .rg-hero p{font-size:15px}
  .container{padding:0 12px 30px}
  .rg-section{padding:16px}
  .rg-section-title{font-size:16px}
  .rg-card-name{font-size:16px}
  .rg-card-info{font-size:14px}
  .rg-stats{grid-template-columns:repeat(3,1fr)}
  .rg-info p{font-size:16px}
}
</style>
<link rel="stylesheet" href="/common.css">
<link rel="stylesheet" href="/widget.css">
</head>
<body>
<script src="/header.js"></script>

<div class="rg-hero">
<div class="container">
<div class="breadcrumb"><a href="/">케어컴퍼스</a> &rsaquo; <a href="/?sidoCd=${sidoCd}">${sidoName}</a> &rsaquo; ${sgName}</div>
<h1>${sgName} 장기요양기관 총 ${total}곳</h1>
<p>${sgName} 요양원, 방문요양, 주간보호, 복지용구 기관을 한눈에 비교하세요. 국민건강보험공단 공공데이터 기반 · 2026년 기준</p>
</div>
</div>

<div class="container">
<div class="rg-stats">${statCards}</div>

<div class="rg-ad">광고</div>

${listSections}

<div class="rg-info">
<h2><i class="ti ti-info-circle"></i> ${sgName} 장기요양 이용 안내</h2>
<p>${sidoName} ${sgName}에는 총 ${total}개의 장기요양기관이 운영 중입니다. 노인요양시설 ${cats.facility.length}곳, 방문요양 ${cats.home.length}곳, 주간보호 ${cats.daycare.length}곳, 방문목욕 ${cats.bath.length}곳, 복지용구 ${cats.welfare.length}곳 등 다양한 서비스를 이용할 수 있습니다.</p>
<p>장기요양서비스를 이용하려면 국민건강보험공단에 장기요양인정 신청을 해야 합니다. 공단 직원이 방문 조사 후 등급을 판정하며, 1~5등급 또는 인지지원등급을 받으면 서비스를 이용할 수 있습니다.</p>
<p>비용은 등급과 서비스 유형에 따라 다르며, 본인부담률은 일반 15%(재가) / 20%(시설)입니다. <a href="/calculator.html" style="color:#534AB7">계산기로 예상 비용을 확인</a>해보세요.</p>
</div>

<div class="rg-cta">
<div class="rg-cta-sub">${sgName} 요양기관을 직접 검색해보세요</div>
<div class="rg-cta-title">기관찾기에서 상세 비교</div>
<a href="/?sidoCd=${sidoCd}&sigunguCd=${sgCode}" class="rg-cta-btn">기관 검색하기</a>
</div>

<div class="rg-ad">광고</div>

<div class="rg-footer" style="display:none">
국민건강보험공단 공공데이터 기반<br>
&copy; 2026 <a href="/">CareCompass</a> · <a href="/privacy.html">개인정보처리방침</a>
</div>
</div>
<script src="/widget.js"></script>
</body>
</html>`;
}

function main(){
  var dataDir=path.join(process.cwd(),'data');
  var outDir=path.join(process.cwd(),'region');
  fs.mkdirSync(outDir,{recursive:true});

  var sidoDirs=fs.readdirSync(dataDir).filter(d=>!d.startsWith('.'));
  var totalPages=0;
  var sitemapUrls=[];

  console.log('\n🚀 지역 랜딩 페이지 생성 시작\n');

  for(var sido of sidoDirs){
    var sidoPath=path.join(dataDir,sido);
    if(!fs.statSync(sidoPath).isDirectory())continue;
    var sidoName=SIDO_NM[sido]||sido;
    var files=fs.readdirSync(sidoPath).filter(f=>f.endsWith('.json'));

    for(var file of files){
      var sgCode=file.replace('.json','');
      var sgName=SGG_NM[sido+sgCode]||sgCode;
      var filePath=path.join(sidoPath,file);
      var items=JSON.parse(fs.readFileSync(filePath,'utf-8'));
      if(items.length===0)continue;

      var html=generateRegionPage(sido,sgCode,sidoName,sgName,items);
      var fileName=sido+'-'+sgCode+'.html';
      var outPath=path.join(outDir,fileName);
      fs.writeFileSync(outPath,html,'utf-8');

      sitemapUrls.push('https://carecompass.co.kr/region/'+fileName);
      totalPages++;
    }
    process.stdout.write('  📄 '+sidoName+': '+files.length+'개 지역\n');
  }

  // 기존 sitemap에 추가
  var sitemapPath=path.join(process.cwd(),'sitemap.xml');
  if(fs.existsSync(sitemapPath)){
    var sitemap=fs.readFileSync(sitemapPath,'utf-8');
    var newUrls=sitemapUrls.map(u=>'<url><loc>'+u+'</loc><priority>0.7</priority></url>').join('\n');
    sitemap=sitemap.replace('</urlset>',newUrls+'\n</urlset>');
    fs.writeFileSync(sitemapPath,sitemap,'utf-8');
  }

  console.log('\n✅ 완료! '+totalPages+'개 지역 페이지 생성');
  console.log('📄 sitemap.xml 업데이트 ('+sitemapUrls.length+'개 URL 추가)\n');
}

main();
