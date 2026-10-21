// Isolated public candidate only. Existing preview.2 routes stay unchanged.
export function isC02Study(pathname, search) {
 const params=new URLSearchParams(search);
 return pathname === '/investment-workbench-public-preview/candidates/c02-fullspace-v1-20261021/' && (!params.has('visual') || params.get('visual') === 'c02-complete-v1') && params.get('finish') !== 'original';
}
