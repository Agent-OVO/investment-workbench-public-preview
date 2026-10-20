import {serializeState} from './store.js';
// Only the shared store owns the URL. History UI metadata is scoped to this candidate.
export function installHistory({store,win,capture=()=>null,restore=()=>{}}){
 const original=store.dispatch;let traversing=false,lastHash=serializeState(store.getState());
 const save=()=>win.history.replaceState({...win.history.state,contentFlow:true,ui:capture()},'',win.location.href);
 store.dispatch=action=>{if(!traversing)save();return original(action);};
 const unsubscribe=store.subscribe(s=>{
  if(s.state.error||traversing)return;
  const hash=serializeState(s.state);
  if(!win.location.hash)win.history.replaceState({contentFlow:true,ui:capture()},'',hash);
  else if(hash!==lastHash&&win.location.hash!==hash)win.history.pushState({contentFlow:true,ui:null},'',hash);
  lastHash=hash;
 });
 const navigate=()=>{
  if(win.location.hash===lastHash&&!store.getState().error)return;
  traversing=true;original({type:'hydrate',hash:win.location.hash});traversing=false;
  if(!store.getState().error){lastHash=serializeState(store.getState());restore(win.history.state?.contentFlow?win.history.state.ui:null);}
 };
 win.addEventListener('popstate',navigate);win.addEventListener('hashchange',navigate);
 return {save,dispose(){unsubscribe();win.removeEventListener('popstate',navigate);win.removeEventListener('hashchange',navigate);store.dispatch=original;}};
}
