import {topicManifests} from './topic-manifest.js';
import {documentManifests} from '../cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/document-manifest.js';
export const BASE='/investment-workbench-public-preview/workbench-review/';
export const REPORT_BASE=new URL('../cloud/current-20261015-right-workspace/content-flow-20261017/public-draft-20261018/main.js',import.meta.url);
export const reportSlug=m=>m.slug||m.localDocumentRef.match(/^documents\/([a-z]+)-public-research\.md$/)?.[1];
export const reports=Object.freeze([...documentManifests,...topicManifests].map(manifest=>Object.freeze({slug:reportSlug(manifest),manifest})));
export function resolveReport(slug){return reports.find(x=>x.slug===slug)?.manifest||null;}
export function reportHref(slug){if(!resolveReport(slug))throw Error('UNKNOWN_REPORT');return BASE+'research/'+slug+'/';}
export function spaceHref(slug,anchor=''){const m=resolveReport(slug);if(!m)throw Error('UNKNOWN_REPORT');const safe=safeReturnAnchor(anchor,m);return BASE+'space/'+slug+'/'+(safe?'?return='+encodeURIComponent(safe):'');}
export function returnHref(slug,search=''){const m=resolveReport(slug);if(!m)throw Error('UNKNOWN_REPORT');const anchor=safeReturnAnchor(new URLSearchParams(search).get('return'),m);return reportHref(slug)+(anchor?'#'+anchor:'');}
export const MODEL_VARIANTS=Object.freeze({c02:'c02-platform-b',c03:'c03-trees-75',c04:'c04-whole-canopy'});
export function safeReturnAnchor(value,manifest){return new RegExp('^'+manifest.anchorPrefix+'-line-\\d+$').test(value||'')?value:'';}
export function filterReports(query){const q=String(query||'').trim().toLocaleLowerCase();return reports.filter(({manifest:m})=>[m.company,m.securityCode,m.title,...m.topics,...(m.companies||[]).flatMap(c=>[c.name,c.code,c.marketCode])].join(' ').toLocaleLowerCase().includes(q));}

export function closestReturnAnchor(nodes,manifest,threshold=160){const safe=nodes.filter(node=>safeReturnAnchor(node.id,manifest)&&Number.isFinite(node.top));return (safe.filter(node=>node.top<=threshold).at(-1)||safe[0])?.id||'';}

export const relatedReports=manifest=>reports.filter(({manifest:m})=>m!==manifest&&manifest.topicGroup&&m.topicGroup===manifest.topicGroup);
