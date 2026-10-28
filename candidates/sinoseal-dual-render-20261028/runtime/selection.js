import {productIds} from './core.js';
/** @typedef {{kind:'research-product',reportId:'report:sinoseal',revision:'2026-10-24',objectId:string,productId:string}} ResearchSelection */
export function researchSelection(productId='repair') {
 const id=productIds.includes(productId)?productId:'repair';
 return Object.freeze({kind:'research-product',reportId:'report:sinoseal',revision:'2026-10-24',objectId:'report:sinoseal:product:'+id,productId:id});
}
export function validResearchSelection(value) {
 return value?.kind==='research-product'&&value.reportId==='report:sinoseal'&&value.revision==='2026-10-24'&&productIds.includes(value.productId)&&value.objectId==='report:sinoseal:product:'+value.productId;
}
// Legacy URL/history fields are adapters, not independently writable selections.
export function attachSelection(state, selection) {
 delete state.product;delete state.selectedId;state.selection=selection;
 Object.defineProperties(state,{product:{enumerable:true,get:()=>state.selection.productId},selectedId:{enumerable:true,get:()=>state.selection.objectId}});
 return state;
}
