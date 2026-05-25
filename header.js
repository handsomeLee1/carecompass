(function(){
  var path=window.location.pathname;
  var isCalc=path.includes('calculator');
  var isFacility=path.includes('facility-cost');
  var isHomecare=path.includes('homecare-cost');
  var isDaycare=path.includes('daycare-cost');
  var isWelfare=path.includes('welfare-cart');
  var isCost=isFacility||isHomecare||isDaycare||isWelfare;

  var subNav='';
  if(isCalc){
    subNav='<div class="tab-bar"><div class="tab-inner">'+
      '<button class="tab-btn active" id="tab-재가급여" onclick="if(window.switchCalc)switchCalc(\'재가급여\')">재가급여 간편계산</button>'+
      '<button class="tab-btn" id="tab-시설급여" onclick="if(window.switchCalc)switchCalc(\'시설급여\')">시설급여 간편계산</button>'+
      '<button class="tab-btn" id="tab-등급예상" onclick="if(window.switchCalc)switchCalc(\'등급예상\')">등급예상 점수계산 <span class="calc-tab-badge">인기</span></button>'+
      '</div></div>';
  } else if(isCost){
    subNav='<div class="tab-bar"><div class="tab-inner">'+
      '<a href="/facility-cost.html" class="tab-btn'+(isFacility?' active':'')+'">요양원 입소 비용</a>'+
      '<a href="/homecare-cost.html" class="tab-btn'+(isHomecare?' active':'')+'">방문요양 비용</a>'+
      '<a href="/daycare-cost.html" class="tab-btn'+(isDaycare?' active':'')+'">주간보호 비용</a>'+
      '<a href="/welfare-cart.html" class="tab-btn'+(isWelfare?' active':'')+'">복지용구 안내</a>'+
      '</div></div>';
  }

  var html=
    '<nav class="topnav">'+
    '<div class="topnav-inner">'+
    '<a href="/" class="logo">Care<span>Compass</span></a>'+
    '<div class="nav-links">'+
    '<a href="/"'+((!isCalc&&!isCost)?' class="active"':'')+'>기관찾기</a>'+
    '<a href="/facility-cost.html"'+(isCost?' class="active"':'')+'>비용안내</a>'+
    '<a href="/calculator.html"'+(isCalc?' class="active"':'')+'>계산기</a>'+
    '<a href="#">장기요양 안내</a>'+
    '</div>'+
    '<div class="nav-right">국민건강보험공단 공공데이터</div>'+
    '</div>'+
    '</nav>'+
    subNav;

  document.addEventListener('DOMContentLoaded',function(){
    var div=document.createElement('div');
    div.innerHTML=html;
    document.body.insertBefore(div.firstChild,document.body.firstChild);
    if(subNav){
      var sub=document.createElement('div');
      sub.innerHTML=subNav;
      document.body.insertBefore(sub.firstChild,document.body.children[1]);
    }
  });
})();