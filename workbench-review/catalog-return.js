import {CATALOG_PATH,queryFromSearch,catalogHref} from './catalog-state.js';

export function restoreCatalogLinks({doc=document,win=window}={}){
 const params=new URLSearchParams(win.location.search);
 if(!params.has('q')&&params.get('catalog')!=='1')return false;
 const href=catalogHref(queryFromSearch(win.location.search),{resume:true});
 // Both the explicit return action and the primary research-library nav keep the query.
 for(const link of doc.querySelectorAll('a'))if(link.getAttribute('href')===CATALOG_PATH)link.setAttribute('href',href);
 return true;
}
if(typeof document!=='undefined'&&typeof window!=='undefined')restoreCatalogLinks();
