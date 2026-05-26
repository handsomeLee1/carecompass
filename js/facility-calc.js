/**
 * 기관 상세 페이지 공용 계산기
 * 기관 유형에 따라 자동으로 적절한 계산기 표시
 */
(function(){
  var GRADE_LIMITS={1:2306550,2:2143240,3:1712580,4:1572880,5:1352900,6:694200};
  var FACILITY_DAILY={1:74390,2:69060,3:63740};
  var WELFARE_LIMIT=1600000;

  function fmt(n){return Math.round(n).toLocaleString();}

  function renderCalc(containerId,type){
    var el=document.getElementById(containerId);
    if(!el)return;
    var h='';

    if(type==='facility'){
      h+='<div class="fc-title"><i class="ti ti-calculator"></i> 시설급여 비용 계산기</div>';
      h+='<div class="fc-desc">이 요양시설 입소 시 예상 본인부담금을 계산해보세요</div>';
      h+='<div class="fc-row"><label>장기요양 등급</label><select id="fcGrade" onchange="window.__fcCalc()"><option value="">선택</option><option value="1">1등급</option><option value="2">2등급</option><option value="3">3~5등급</option></select></div>';
      h+='<div class="fc-row"><label>본인부담률</label><select id="fcRate" onchange="window.__fcCalc()"><option value="0.20">일반 (20%)</option><option value="0.12">경감1 (12%)</option><option value="0.08">경감2 (8%)</option><option value="0">의료급여 (0%)</option></select></div>';
      h+='<div id="fcResult" class="fc-result" style="display:none"><div class="fc-result-label">월 예상 본인부담금 (30일)</div><div class="fc-result-num" id="fcResultNum"></div><div class="fc-result-note">* 식재료비 등 비급여 항목은 별도</div></div>';
      window.__fcCalc=function(){
        var g=document.getElementById('fcGrade').value;
        var r=parseFloat(document.getElementById('fcRate').value);
        if(!g)return;
        var daily=FACILITY_DAILY[g];
        var amt=Math.round(daily*30*r);
        document.getElementById('fcResult').style.display='block';
        document.getElementById('fcResultNum').textContent=fmt(amt)+'원';
      };
    } else if(type==='home'){
      h+='<div class="fc-title"><i class="ti ti-calculator"></i> 재가급여 비용 계산기</div>';
      h+='<div class="fc-desc">방문요양/주간보호 이용 시 예상 본인부담금을 계산해보세요</div>';
      h+='<div class="fc-row"><label>장기요양 등급</label><select id="fcGrade2" onchange="window.__fcCalc2()"><option value="">선택</option><option value="1">1등급 (월 2,306,550원)</option><option value="2">2등급 (월 2,143,240원)</option><option value="3">3등급 (월 1,712,580원)</option><option value="4">4등급 (월 1,572,880원)</option><option value="5">5등급 (월 1,352,900원)</option><option value="6">인지지원등급 (월 694,200원)</option></select></div>';
      h+='<div class="fc-row"><label>본인부담률</label><select id="fcRate2" onchange="window.__fcCalc2()"><option value="0.15">일반 (15%)</option><option value="0.09">경감1 (9%)</option><option value="0.06">경감2 (6%)</option><option value="0">의료급여 (0%)</option></select></div>';
      h+='<div id="fcResult2" class="fc-result" style="display:none"><div class="fc-result-label">월 예상 본인부담금</div><div class="fc-result-num" id="fcResultNum2"></div><div class="fc-result-sub" id="fcResultSub2"></div><div class="fc-result-note">* 실제 이용금액에 따라 달라질 수 있습니다</div></div>';
      window.__fcCalc2=function(){
        var g=document.getElementById('fcGrade2').value;
        var r=parseFloat(document.getElementById('fcRate2').value);
        if(!g)return;
        var limit=GRADE_LIMITS[g];
        var amt=Math.round(limit*r);
        document.getElementById('fcResult2').style.display='block';
        document.getElementById('fcResultNum2').textContent=fmt(amt)+'원';
        document.getElementById('fcResultSub2').textContent='월 한도액 '+fmt(limit)+'원의 '+Math.round(r*100)+'%';
      };
    } else if(type==='welfare'){
      h+='<div class="fc-title"><i class="ti ti-calculator"></i> 복지용구 한도 계산기</div>';
      h+='<div class="fc-desc">연간 복지용구 급여한도와 본인부담금을 확인하세요</div>';
      h+='<div class="fc-row"><label>예상 이용금액 (연간)</label><input type="range" id="fcWelAmt" min="0" max="1600000" step="10000" value="800000" oninput="window.__fcCalc3()"><div class="fc-range-val" id="fcWelAmtVal">800,000원</div></div>';
      h+='<div class="fc-row"><label>본인부담률</label><select id="fcWelRate" onchange="window.__fcCalc3()"><option value="0.15">일반 (15%)</option><option value="0.09">경감1 (9%)</option><option value="0.06">경감2 (6%)</option><option value="0">의료급여 (0%)</option></select></div>';
      h+='<div id="fcResult3" class="fc-result"><div class="fc-result-label">연간 본인부담금</div><div class="fc-result-num" id="fcResultNum3">120,000원</div><div class="fc-limit-bar"><div class="fc-limit-fill" id="fcLimitFill" style="width:50%"></div></div><div class="fc-result-sub" id="fcResultSub3">한도 사용률 50% (잔액 800,000원)</div><div class="fc-result-note">* 연간 급여한도 1,600,000원</div></div>';
      window.__fcCalc3=function(){
        var amt=parseInt(document.getElementById('fcWelAmt').value);
        var r=parseFloat(document.getElementById('fcWelRate').value);
        var self=Math.round(amt*r);
        var pct=Math.round(amt/WELFARE_LIMIT*100);
        var remain=WELFARE_LIMIT-amt;
        document.getElementById('fcWelAmtVal').textContent=fmt(amt)+'원';
        document.getElementById('fcResultNum3').textContent=fmt(self)+'원';
        document.getElementById('fcLimitFill').style.width=Math.min(pct,100)+'%';
        document.getElementById('fcLimitFill').style.background=pct>100?'#E24B4A':'#534AB7';
        document.getElementById('fcResultSub3').textContent='한도 사용률 '+pct+'%'+(remain>=0?' (잔액 '+fmt(remain)+'원)':' (초과 '+fmt(-remain)+'원)');
      };
      setTimeout(function(){if(window.__fcCalc3)window.__fcCalc3();},100);
    }
    el.innerHTML=h;
  }

  window.renderFacilityCalc=renderCalc;
})();
