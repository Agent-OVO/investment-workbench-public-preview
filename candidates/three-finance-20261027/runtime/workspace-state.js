import {demoMarket} from './demo-market.js';
import {demoResearch} from './demo-research.js';
const bars = new Map(demoMarket.candles.map(x=>[x.id,x]));
const trades = new Map(demoMarket.trades.map(x=>[x.id,x]));
const nodes = new Map(demoResearch.nodes.map(x=>[x.id,x]));
export function initialState({reducedMotion=false}={}) {
  return Object.freeze({view:'market',selection:{kind:'bar',id:demoMarket.candles.at(-1).id},
    barId:demoMarket.candles.at(-1).id,tradeId:null,instrumentId:demoMarket.instrument.id,
    start:24,count:24,paused:reducedMotion,reducedMotion});
}
export function reduceWorkspace(state,event) {
  let next={...state};
  const reveal=bar=>{
    next.barId=bar.id;
    if(bar.sessionIndex<next.start||bar.sessionIndex>=next.start+next.count)
      next.start=Math.min(48-next.count,Math.max(0,bar.sessionIndex-Math.floor(next.count/2)));
  };
  switch(event.type){
    case 'select-bar': {
      const bar=bars.get(event.id); if(!bar)throw new Error('UNKNOWN_BAR');
      reveal(bar);next.selection={kind:'bar',id:bar.id};next.tradeId=null;next.view='market';break;
    }
    case 'select-trade': {
      const trade=trades.get(event.id);if(!trade)throw new Error('UNKNOWN_TRADE');
      reveal(bars.get(trade.barId));next.selection={kind:'trade',id:trade.id};next.tradeId=trade.id;next.view='market';break;
    }
    case 'select-node': {
      if(!nodes.has(event.id))throw new Error('UNKNOWN_NODE');
      next.selection={kind:'node',id:event.id};next.view='research';next.tradeId=null;break;
    }
    case 'view':
      if(!['market','research'].includes(event.view))throw new Error('UNKNOWN_VIEW');
      next.view=event.view;
      next.selection=event.view==='research'?{kind:'node',id:state.instrumentId}:{kind:'bar',id:state.barId};
      next.tradeId=null;break;
    case 'window': {
      if(![12,24,48].includes(event.count))throw new Error('WINDOW_COUNT');
      const index=bars.get(state.barId).sessionIndex;
      next.count=event.count;next.start=Math.min(48-next.count,Math.max(0,index-Math.floor(next.count/2)));break;
    }
    case 'shift': {
      if(![-1,1].includes(event.direction))throw new Error('SHIFT_DIRECTION');
      next.start=Math.min(48-next.count,Math.max(0,state.start+event.direction*Math.max(1,Math.floor(next.count/2))));
      const index=bars.get(state.barId).sessionIndex;
      if(index<next.start||index>=next.start+next.count){
        const bar=demoMarket.candles[next.start];next.barId=bar.id;next.tradeId=null;next.selection={kind:'bar',id:bar.id};
      }break;
    }
    case 'pause': next.paused=Boolean(event.paused);break;
    case 'reduced-motion': next.reducedMotion=Boolean(event.value);if(event.value)next.paused=true;break;
    default:throw new Error('UNKNOWN_EVENT');
  }
  return Object.freeze(next);
}
