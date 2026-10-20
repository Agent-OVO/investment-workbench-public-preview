// Share one in-flight load, but release failures so the visible retry can recover.
export function createThreeLoader(doc, win) {
  let pending;
  const checkRevision = () => {
    if (String(win.THREE?.REVISION) !== '149') throw Error('图形库版本不匹配，请刷新页面');
  };
  return async function ensureThree() {
    if (win.THREE) { checkRevision(); return; }
    if (!pending) pending = new Promise((resolve, reject) => {
      const script = doc.createElement('script');
      script.src = '/investment-workbench-public-preview/cloud/current-20261015-right-workspace/vendor/three.min.js';
      script.onload = () => {
        try { checkRevision(); resolve(); }
        catch (error) { script.remove(); reject(error); }
      };
      script.onerror = () => { script.remove(); reject(Error('图形库加载失败，请恢复网络后重载')); };
      doc.head.append(script);
    }).catch(error => { pending = null; throw error; });
    await pending;
  };
}
