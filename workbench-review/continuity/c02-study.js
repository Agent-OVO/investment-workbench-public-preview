// Explicit, local-only visual comparison. Never activate across the research scenes.
export function isC02Study(pathname, search) {
  const params=new URLSearchParams(search);
  return pathname === '/investment-workbench-public-preview/workbench-review/models/c02/' && params.get('visual') === 'c02-light-study' && params.get('finish') !== 'original';
}
