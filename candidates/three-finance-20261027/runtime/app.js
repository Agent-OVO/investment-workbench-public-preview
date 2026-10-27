import {demoMarket,formatPrice,deriveHolding,windowCandles} from './demo-market.js';
import {demoResearch} from './demo-research.js';
import {initialState,reduceWorkspace} from './workspace-state.js';
import {SpatialStage} from './spatial-stage.js';

const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qty=value=>value.toLocaleString('zh-CN');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let state=initialState({reducedMotion:motion.matches}),stage;
const barMap=new Map(demoMarket.candles.map(x=>[x.id,x]));
const tradeMap=new Map(demoMarket.trades.map(x=>[x.id,x]));

function dispatch(event){state=reduceWorkspace(state,event);render();}
function select(selection){dispatch({type:selection.kind==='node'?'select-node':selection.kind==='trade'?'select-trade':'select-bar',id:selection.id});}
function revealSelection(){
  const target=matchMedia('(max-width:760px)').matches?document.querySelector('.inspector'):$('visual-panel');
  target.scrollIntoView({block:'start',behavior:'instant'});$('inspector-title').tabIndex=-1;$('inspector-title').focus({preventScroll:true});
}
function openData(){
  $('data-details').open=true;
  $('data-details').scrollIntoView({block:'start',behavior:'instant'});
  $('data-details').querySelector('summary').focus({preventScroll:true});
}
function renderStatus(status){
  const ready=status==='ready';document.body.dataset.renderStatus=status;
  $('render-message').hidden=ready;
  if(status==='lost')$('render-message').querySelector('strong').textContent='三维渲染连接已中断';
  $('render-status').textContent=ready?'三维场景已启用':status==='lost'?'WebGL 上下文中断':'WebGL 不可用 · 三维画面未验收';
  document.querySelectorAll('[data-camera]').forEach(b=>b.disabled=!ready);
  $('camera-hint').textContent=ready?'拖动旋转 · Ctrl + 滚轮缩放':'精确选择和记录联动可用';
}
function render(){
  const visible=windowCandles(state.start,state.count),bar=barMap.get(state.barId),trade=tradeMap.get(state.tradeId),last=visible.at(-1);
  $('latest-close').textContent=formatPrice(last.closeCents);$('latest-date').textContent=last.date+' · 元';
  document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===state.view;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
  $('visual-panel').setAttribute('aria-labelledby','tab-'+state.view);
  $('pause').setAttribute('aria-pressed',String(state.paused));$('pause').textContent=state.paused?'过渡已暂停':'暂停过渡';
  $('time-controls').hidden=state.view!=='market';$('market-legend').hidden=state.view!=='market';$('relation-index').hidden=state.view!=='research';
  $('selection-nav').hidden=state.view!=='market';
  $('scene-title').textContent=state.view==='market'?'价格路径':demoResearch.title;
  $('scene-subtitle').textContent=state.view==='market'?'日线与成交量 · 同日期对齐':'从问题到证据，再到反证与失效条件';
  $('encoding-note').textContent=state.view==='market'?'横轴按交易序列等距；价格共用线性刻度，成交量独立零基。厚度只表达形状。':'有向边说明关系；三轴仅用于空间排布，距离与体积不表示研究权重。';
  $('window-range').textContent=visible[0].date.slice(5)+' — '+last.date.slice(5);
  $('window-prev').disabled=state.start===0;$('window-next').disabled=state.start+state.count>=demoMarket.candles.length;
  document.querySelectorAll('[data-count]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.count)===state.count)));
  $('bar-select').value=state.barId;
  if(state.view==='research'){
    const node=demoResearch.nodes.find(n=>n.id===state.selection.id)||demoResearch.nodes.find(n=>n.id===state.instrumentId);
    $('selection-kind').textContent=node.short;$('inspector-title').textContent=node.label;
    const edges=demoResearch.edges.filter(e=>e.from===node.id||e.to===node.id);
    $('inspector-content').innerHTML='<p class="node-description">'+esc(node.body)+'</p><h3>关联路径</h3><ul class="edge-list">'+edges.map(e=>{
      const other=demoResearch.nodes.find(n=>n.id===(e.from===node.id?e.to:e.from));
      return '<li><span>'+esc(e.label)+' '+(e.from===node.id?'→':'←')+'</span><button data-node="'+esc(other.id)+'">'+esc(other.label)+'</button></li>';
    }).join('')+'</ul>'+(node.kind==='instrument'?'<button class="primary-button" id="back-market">查看同一品种行情 →</button>':'');
    $('stable-id').textContent=node.id;$('data-open').hidden=true;
  }else{
    $('selection-kind').textContent=trade?(trade.side==='buy'?'买入记录':'卖出记录'):'选中日期';$('inspector-title').textContent=bar.date;
    const delta=bar.closeCents-bar.openCents,sign=delta>0?'+':'';
    $('inspector-content').innerHTML='<div class="selected-price"><strong>'+formatPrice(bar.closeCents)+'</strong><span>收盘 / 元</span><small class="'+(delta>=0?'up-text':'down-text')+'">较开盘 '+sign+formatPrice(delta)+' 元</small></div><dl class="ohlc-grid">'+[['开盘',bar.openCents],['最高',bar.highCents],['最低',bar.lowCents]].map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+formatPrice(value)+'</dd></div>').join('')+'<div><dt>成交量 / 股</dt><dd>'+qty(bar.volume)+'</dd></div></dl>'+(trade?'<div class="selected-trade"><span>'+(trade.side==='buy'?'买入':'卖出')+' '+qty(trade.quantity)+' 股</span><strong>'+formatPrice(trade.priceCents)+' <small>元</small></strong><p>费用 '+formatPrice(trade.feeCents)+' 元</p></div>':'<p class="inspector-help">选择成交标记或下方记录，将定位到对应日期与价格。</p>');
    $('stable-id').textContent=trade?.id||bar.id;$('data-open').hidden=false;
  }
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>dispatch({type:'select-node',id:b.dataset.node}));
  $('back-market')?.addEventListener('click',()=>dispatch({type:'view',view:'market'}));
  document.querySelectorAll('[data-research-id]').forEach(b=>b.setAttribute('aria-pressed',String(state.selection.id===b.dataset.researchId)));
  document.querySelectorAll('#trade-rows tr').forEach(row=>row.classList.toggle('selected',row.dataset.id===state.tradeId));
  $('bar-rows').innerHTML=visible.map(b=>'<tr class="'+(b.id===state.barId?'selected':'')+'"><th scope="row">'+b.date+'</th>'+[b.openCents,b.highCents,b.lowCents,b.closeCents].map(value=>'<td class="number">'+formatPrice(value)+'</td>').join('')+'<td class="number">'+qty(b.volume)+'</td><td><button class="row-action" data-bar="'+b.id+'" aria-label="选中 '+b.date+'">选中</button></td></tr>').join('');
  document.querySelectorAll('[data-bar]').forEach(b=>b.onclick=()=>{dispatch({type:'select-bar',id:b.dataset.bar});revealSelection();});
  stage?.setData({view:state.view,candles:visible,trades:demoMarket.trades,research:demoResearch,selection:state.selection,barId:state.barId,paused:state.paused,reducedMotion:state.reducedMotion});
}

$('bar-select').innerHTML=demoMarket.candles.map(b=>'<option value="'+b.id+'">'+b.date+' · '+formatPrice(b.closeCents)+'</option>').join('');
$('bar-select').addEventListener('change',e=>dispatch({type:'select-bar',id:e.target.value}));
$('relation-index').innerHTML=demoResearch.nodes.map(n=>'<button data-research-id="'+n.id+'">'+esc(n.short)+'</button>').join('');
document.querySelectorAll('[data-research-id]').forEach(b=>b.onclick=()=>dispatch({type:'select-node',id:b.dataset.researchId}));
let runningQuantity=0;
$('trade-rows').innerHTML=demoMarket.trades.map(t=>{runningQuantity+=(t.side==='buy'?1:-1)*t.quantity;return '<tr data-id="'+t.id+'"><th scope="row">'+t.date+'</th><td><span class="side-label '+t.side+'">'+(t.side==='buy'?'买入':'卖出')+'</span></td><td class="number">'+qty(t.quantity)+'</td><td class="number">'+formatPrice(t.priceCents)+'</td><td class="number">'+formatPrice(t.feeCents)+'</td><td class="number">'+qty(runningQuantity)+'</td><td><button class="row-action" data-trade="'+t.id+'" aria-label="定位 '+t.date+' '+(t.side==='buy'?'买入':'卖出')+'">在图中查看 ↗</button></td></tr>';}).join('');
document.querySelectorAll('[data-trade]').forEach(b=>b.onclick=()=>{dispatch({type:'select-trade',id:b.dataset.trade});revealSelection();});
const holding=deriveHolding(demoMarket.trades);$('holding-summary').innerHTML='<strong>'+qty(holding.quantity)+'</strong> 股 · '+demoMarket.trades.length+' 笔累计';
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>dispatch({type:'view',view:b.dataset.view}));
document.querySelector('.view-switch').addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const view=e.key==='Home'?'market':e.key==='End'?'research':state.view==='market'?'research':'market';dispatch({type:'view',view});$('tab-'+view).focus();});
document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>dispatch({type:'window',count:Number(b.dataset.count)}));
$('window-prev').onclick=()=>dispatch({type:'shift',direction:-1});$('window-next').onclick=()=>dispatch({type:'shift',direction:1});
$('pause').onclick=()=>dispatch({type:'pause',paused:!state.paused});
motion.addEventListener('change',e=>dispatch({type:'reduced-motion',value:e.matches}));
document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>{const c=b.dataset.camera;if(c==='left')stage.rotate(-.15);if(c==='right')stage.rotate(.15);if(c==='in')stage.zoomBy(1.12);if(c==='out')stage.zoomBy(1/1.12);if(c==='front')stage.front();if(c==='reset')stage.reset();});
$('data-open').onclick=openData;$('fallback-data').onclick=openData;
$('data-return').onclick=revealSelection;
$('scene-return').onclick=()=>{$('visual-panel').scrollIntoView({block:'start',behavior:'instant'});$('scene-title').tabIndex=-1;$('scene-title').focus({preventScroll:true});};
$('method-open').onclick=()=>$('method-dialog').showModal();$('method-close').onclick=()=>$('method-dialog').close();
stage=new SpatialStage($('stage'),{onSelect:select,onStatus:renderStatus});render();
window.addEventListener('pagehide',event=>{if(!event.persisted)stage.dispose();});
window.addEventListener('pageshow',event=>{if(event.persisted)stage.resize();});
