import {chartModel} from '../../integration/chart.js';

const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

// Derived from the authoritative snapshot on every call; no selection is cached here.
export function createContentAdapter({store, content}) {
  if (!store?.getSnapshot || content?.schema !== 'c01-content-v1') throw new Error('CONTENT_ADAPTER_CONTRACT');
  function getPresentation() {
    const s = store.getSnapshot();
    if (s.resultId !== s.version.resultId || s.state.resultId !== s.resultId ||
        s.state.versionId !== s.version.versionId || s.state.researchId !== s.research.researchId) {
      throw new Error('INCONSISTENT_RESEARCH_SNAPSHOT');
    }
    const identity = {researchId:s.state.researchId, versionId:s.version.versionId, resultId:s.resultId};
    const allowed = new Set(s.version.evidenceIds);
    if (s.evidence.length !== allowed.size || s.evidence.some(e => !allowed.has(e.id))) throw new Error('INCONSISTENT_EVIDENCE_SNAPSHOT');
    const evidence = s.evidence.map(e => ({
      id:e.id, title:e.title, kind:e.kind, source:e.source, timeRange:e.timeRange,
      units:e.units || '不适用', synthetic:e.isSynthetic, asset:e.asset || null,
      originalAvailable:e.kind === 'document' ? e.originalAvailable === true : null,
      syntheticPreviewAsset:e.syntheticPreviewAsset || null,
      chart:e.kind === 'chart' ? chartModel(e) : null,
      identity, action:{type:'open-evidence',evidenceId:e.id}
    }));
    const relations = s.relations.map(rel => {
      if (rel.fromResultId !== s.resultId || !s.version.relationIds.includes(rel.id) || rel.evidenceIds.some(id => !allowed.has(id))) throw new Error('INCONSISTENT_RELATION_SNAPSHOT');
      const targetResearch = content.research.find(r => r.versions.some(v => v.resultId === rel.toResultId));
      const targetVersion = targetResearch?.versions.find(v => v.resultId === rel.toResultId);
      if (!targetVersion) throw new Error('MISSING_RELATION_TARGET');
      return {...rel, target:{researchId:targetResearch.researchId,versionId:targetVersion.versionId,resultId:targetVersion.resultId,title:targetResearch.title},
        action:{type:'select',researchId:targetResearch.researchId,versionId:targetVersion.versionId}};
    });
    return freeze({identity, title:s.research.title, category:s.research.category, summary:s.research.summary,
      article:s.version.article, synthetic:content.synthetic, evidence, relations,
      versions:s.research.versions.map(v => ({id:v.versionId,resultId:v.resultId,dateLabel:v.dateLabel,change:v.change,
        selected:v.resultId === s.resultId,action:{type:'set-version',versionId:v.versionId}})),
      readAction:{type:'read'}});
  }
  function activate({kind, id} = {}) {
    const current = getPresentation();
    const target = kind === 'read' ? {action:current.readAction} :
      kind === 'evidence' ? current.evidence.find(e => e.id === id) :
      kind === 'version' ? current.versions.find(v => v.id === id) :
      kind === 'relation' ? current.relations.find(r => r.id === id) : null;
    if (!target) throw new Error('UNAVAILABLE_CONTENT_TARGET:'+kind+':'+id);
    return store.dispatch(target.action);
  }
  return Object.freeze({getPresentation, activate, subscribe:listener => store.subscribe(() => listener(getPresentation()))});
}
