import {normalizeState, validContext} from './state.js';
import {getSource} from './domain.js';
export const workspacePath='research/sinoseal/';
export const sourcePath=alias=>getSource(alias)?`sources/sinoseal/${alias}/`:workspacePath;
export function captureContext(path,state,scroll=0,focus='') {
  return {schema:1,path,state:normalizeState(state),scroll:Math.max(0,Number(scroll)||0),focus:String(focus).slice(0,200)};
}
export function returnContext(value,basePath='/') {
  const context=validContext(value);
  if(!context)return null;
  // Internal contexts only. Never honor externally supplied return URLs.
  const clean=context.path.split('?')[0].replace(/\/index\.html$/,'/');
  if(![basePath,basePath+workspacePath,basePath+'space/sinoseal/'].includes(clean))return null;
  return context;
}
