// Candidate-only editorial placement. These links do not create research relations.
const CHAPTER_EVIDENCE = Object.freeze({
  'DEMO-RESEARCH-A': Object.freeze({s2: ['EV-03', 'EV-05'], s3: ['EV-01'], s4: ['EV-02'], s6: ['EV-04']}),
  'DEMO-RESEARCH-B': Object.freeze({s1: ['EV-B01'], s2: ['EV-B02']}),
  'DEMO-RESEARCH-C': Object.freeze({s1: ['EV-C01']})
});
const EV02_LABELS = Object.freeze(['A', 'B', 'C', 'D']);
export const EV02_CORRECTION = '演示数据修正：本候选明确将合成类别 A、B、C、D 依次对应 4、2、3、5；不代表实测映射。';

// Never mutate the frozen fixture or make a global chart-label fallback.
export function displayEvidence(e, researchId) {
  if (researchId === 'DEMO-RESEARCH-A' && e.id === 'EV-02' && e.isSynthetic === true &&
      e.kind === 'chart' && e.chartType === 'bar' && e.timeRange === '虚构类别 A–D' &&
      !e.labels && JSON.stringify(e.series) === '[4,2,3,5]') {
    return {...e, labels: EV02_LABELS, displayCorrection: EV02_CORRECTION};
  }
  return e;
}

export function versionEvidence(s) {
  const available = new Map(s.evidence.map(e => [e.id, e]));
  return s.version.evidenceIds.filter(id => available.has(id))
    .map(id => displayEvidence(available.get(id), s.research.researchId));
}

export function chapterEvidence(s, chapter) {
  const available = new Map(versionEvidence(s).map(e => [e.id, e]));
  return (CHAPTER_EVIDENCE[s.research.researchId]?.[chapter.id] || [])
    .filter(id => available.has(id)).map(id => available.get(id));
}
