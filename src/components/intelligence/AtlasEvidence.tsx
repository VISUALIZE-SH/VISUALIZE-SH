import { useMemo } from 'react'
import type { EvidenceClaim, IntelligenceData, IntelligenceEvent, Provenance } from '../../types/intelligence'
import { displayValue, eventVersionAssociation, formatEvidenceDate, isOnOrBefore, mediaForVersion, versionById } from '../../data/intelligence'
import { deviceIllustrationFor } from '../../data/device-illustrations'
import ProfileSchematic from './ProfileSchematic'
import EvidenceMediaGallery from './EvidenceMediaGallery'
import EvidenceReferences from './EvidenceReferences'
import './intelligence.css'

export interface AtlasEvidenceProps {
  data: IntelligenceData
  versionId: string
  onSelectVersion: (id: string) => void
  onOpenData: (versionId: string) => void
  onOpenTrial: (id: string) => void
  asOf?: string
  jurisdiction?: string
}

function ReviewMark({ item }: { item: Provenance }) {
  return item.reviewStatus === 'draft' ? <span className="intel-badge intel-badge-draft">Draft</span> : null
}

function SourceLink({ data, item }: { data: IntelligenceData; item: Provenance }) {
  if (!item.sourceRefs.length) return <span className="intel-source">Source not linked</span>
  return <span className="intel-source-list">{item.sourceRefs.map((ref) => {
    const source = data.sources.find((entry) => entry.id === ref.sourceId)
    const label = `${source?.publisher ?? ref.sourceId} · ${ref.locator}`
    return source?.url ? <a className="intel-source" key={`${ref.sourceId}:${ref.locator}`} href={source.url} target="_blank" rel="noreferrer">{label} ↗</a> : <span className="intel-source" key={`${ref.sourceId}:${ref.locator}`}>{label}</span>
  })}</span>
}

/** The version badge carries draft status; a claim repeats it only when it differs. */
function ClaimList({ data, claims, empty, versionStatus }: { data: IntelligenceData; claims: EvidenceClaim[]; empty: string; versionStatus: Provenance['reviewStatus'] }) {
  if (!claims.length) return <p className="intel-empty-copy">{empty}</p>
  return <dl className="intel-claim-list">
    {[...claims].sort((a, b) => ({ directly_reported: 0, derived: 1, analyst_interpretation: 2 }[a.basis] - { directly_reported: 0, derived: 1, analyst_interpretation: 2 }[b.basis])).map((claim) => (
      <div key={claim.id} className="intel-claim">
        <dt>{claim.label}{claim.reviewStatus !== versionStatus && <> <ReviewMark item={claim} /></>}{claim.basis !== 'directly_reported' && <> <span className="intel-basis">{claim.basis === 'analyst_interpretation' ? 'editorial' : claim.basis.replace(/_/g, ' ')}</span></>}</dt>
        <dd>{displayValue(claim.value, claim.unit, claim.availability)}</dd>
        {claim.context && <p>{claim.context}</p>}
        {claim.limitation && <p className="intel-boundary">Boundary: {claim.limitation}</p>}
        <SourceLink data={data} item={claim} />
      </div>
    ))}
  </dl>
}

function EventEntry({ data, event, familyOnly }: { data: IntelligenceData; event: IntelligenceEvent; familyOnly?: boolean }) {
  return (
    <article className="intel-event">
      <time dateTime={event.eventDate.value}>{formatEvidenceDate(event.eventDate)}</time>
      <h4>{event.title} <ReviewMark item={event} /> {familyOnly && <span className="intel-badge intel-badge-draft">Family association · exact build unresolved</span>}</h4>
      <dl className="intel-old-new">
        <div><dt>Earlier</dt><dd>{event.before}</dd></div>
        <div><dt>Changed</dt><dd>{event.after}</dd></div>
      </dl>
      <p>{event.whyItMatters}</p>
      <p className="intel-boundary">Uncertainty: {event.uncertainty}</p>
      <SourceLink data={data} item={event} />
    </article>
  )
}

export default function AtlasEvidence({
  data, versionId, onSelectVersion, onOpenData, onOpenTrial, asOf, jurisdiction,
}: AtlasEvidenceProps) {
  const version = versionById(data, versionId)
  const filteredClaims = useMemo(
    () => data.claims.filter((claim) => claim.versionId === versionId && isOnOrBefore(claim.observedAt, asOf)),
    [data, versionId, asOf],
  )
  const events = useMemo(
    () => data.events.filter((event) => Boolean(eventVersionAssociation(data, event, versionId)) && isOnOrBefore(event.eventDate, asOf)),
    [data, versionId, asOf],
  )
  const decisions = useMemo(
    () => data.decisions.filter((decision) => decision.versionIds.includes(versionId) && (!jurisdiction || decision.jurisdiction === jurisdiction) && isOnOrBefore(decision.date, asOf)),
    [data, versionId, jurisdiction, asOf],
  )
  const indications = useMemo(
    () => data.indications.filter((indication) => indication.versionIds.includes(versionId) && (!jurisdiction || indication.jurisdiction === jurisdiction) && isOnOrBefore(indication.effectiveDate, asOf)),
    [data, versionId, jurisdiction, asOf],
  )
  const design = filteredClaims.filter((claim) => claim.category === 'design' || claim.category === 'digital')
  const fit = filteredClaims.filter((claim) => claim.category === 'fit')
  const evidence = filteredClaims.filter((claim) => claim.category === 'evidence')
  const history = filteredClaims.filter((claim) => claim.category === 'evolution')
  const media = useMemo(() => mediaForVersion(data, versionId), [data, versionId])
  const evidenceReadouts = useMemo(() => data.readouts.flatMap((readout) => {
    const trial = data.trials.find((item) => item.id === readout.trialId)
    if (!trial || !isOnOrBefore(readout.publishedAt, asOf)) return []
    const exact = readout.versionIds.includes(versionId) || trial.versionIds.includes(versionId)
    const family = trial.familyIds?.includes(version?.familyId ?? '')
    if (!exact && !family) return []
    return [{ readout, trial, exact }]
  }), [data, versionId, version?.familyId, asOf])
  const graphTrials = useMemo(() => {
    const sourceDates = new Map(data.sources.map((source) => [source.id, source.publishedAt]))
    return data.trials.flatMap((trial) => {
      const { entityId } = trial
      if (!entityId || !trial.versionIds.includes(versionId)) return []
      return trial.sourceRefs.some((ref) => isOnOrBefore(sourceDates.get(ref.sourceId), asOf)) ? [{ trial, entityId }] : []
    })
  }, [data, versionId, asOf])
  const versionRelationships = useMemo(() => {
    const dates = new Map(data.sources.map((source) => [source.id, source.publishedAt]))
    return data.lineage.filter((edge) =>
      (edge.fromVersionId === versionId || edge.toVersionId === versionId)
      && edge.sourceRefs.some((ref) => isOnOrBefore(dates.get(ref.sourceId), asOf)),
    )
  }, [data, versionId, asOf])
  const lanes: Array<{ name: string; kinds: IntelligenceEvent['kind'][] }> = [
    { name: 'Design & manufacture', kinds: ['design', 'manufacturing', 'software'] },
    { name: 'Label & indication', kinds: ['indication', 'labeling'] },
    { name: 'Evidence', kinds: ['evidence'] },
  ]

  if (!version) {
    return <section className="intel-workspace intel-empty" aria-label="Evidence atlas"><h2>Evidence Atlas</h2><p>This item doesn't have a product version yet.</p></section>
  }

  const schematic = version.kind === 'device' ? deviceIllustrationFor(version.id) : undefined
  const role = version.kind === 'digital'
    ? `${version.digitalSubtype ?? 'digital'} · ${version.clinicalRole}`
    : `${version.kind} · ${version.clinicalRole}`
  return (
    <section className="intel-workspace intel-atlas" aria-labelledby="atlas-title">
      <header className="intel-workspace-head">
        <div>
          <h2 id="atlas-title">{version.name}</h2>
          <p>{version.summary}</p>
        </div>
        <div className="intel-actions">
          <label className="intel-select-label">Product version
            <select value={versionId} onChange={(event) => onSelectVersion(event.target.value)}>
              {data.versions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button type="button" className="intel-button" onClick={() => onOpenData(versionId)}>Inspect data</button>
        </div>
      </header>

      <div className="intel-version-meta">
        <span>{role}</span>
        {version.model && <span>Model: {version.model}</span>}
        {version.softwareVersion && <span>Software: {version.softwareVersion}</span>}
        <ReviewMark item={version} />
        <SourceLink data={data} item={version} />
      </div>

      <div className={`intel-profile-grid${schematic ? ' has-schematic' : ''}`}>
        <section className="intel-card intel-profile-design"><h3>Design</h3><ClaimList data={data} claims={design} empty="No design field curated for this version."  versionStatus={version.reviewStatus} /></section>

        {schematic && <ProfileSchematic illustration={schematic} name={version.name} notes={schematic.notes} />}
        <section className="intel-card intel-profile-fit"><h3>Fit</h3>{(fit.length > 0 || indications.length === 0) && <ClaimList data={data} claims={fit} empty="No anatomy, use-condition, or workflow-fit field curated for this version."  versionStatus={version.reviewStatus} />}{indications.slice(0, 2).map((indication) => <article className="intel-card-record" key={indication.id}><span>{formatEvidenceDate(indication.effectiveDate)} · {indication.textType}</span><p>{indication.population}</p><SourceLink data={data} item={indication} /></article>)}</section>
        <section className="intel-card intel-profile-evidence"><h3>Clinical Evidence</h3>{(evidence.length > 0 || (evidenceReadouts.length === 0 && graphTrials.length === 0)) && <ClaimList data={data} claims={evidence} empty="No evidence curated for this version."  versionStatus={version.reviewStatus} />}{evidenceReadouts.slice(0, 2).map(({ readout, trial, exact }) => <article className="intel-card-record" key={readout.id}><span>{trial.name} · {readout.followUp}</span><p>{readout.title}</p><p className={exact ? '' : 'intel-boundary'}>{exact ? 'Exact version mapping recorded.' : 'Family association only; exact generation/software build unresolved.'}</p><SourceLink data={data} item={readout} /></article>)}
          {graphTrials.length > 0 && <details className="intel-card-record"><summary>Clinical studies ({graphTrials.length})</summary>
            <ul className="intel-profile-study-list">{graphTrials.map(({ trial, entityId }) => <li key={trial.id}>
              <button type="button" className="intel-button" onClick={() => onOpenTrial(entityId)}>{trial.name}</button>
              {trial.nctId && <small>{trial.nctId}</small>}
            </li>)}</ul>
          </details>}
        </section>
        <section className="intel-card intel-profile-history"><h3>History</h3>{(history.length > 0 || (decisions.length === 0 && events.length === 0)) && <ClaimList data={data} claims={history} empty="No evolution claim curated for this version."  versionStatus={version.reviewStatus} />}{[...decisions].sort((a, b) => b.date.value.localeCompare(a.date.value)).slice(0, 2).map((decision) => <article className="intel-card-record" key={decision.id}><span>{formatEvidenceDate(decision.date)} · {decision.identifier}</span><p>{decision.summary}</p><SourceLink data={data} item={decision} /></article>)}{[...events].sort((a, b) => b.eventDate.value.localeCompare(a.eventDate.value)).slice(0, 1).map((event) => <article className="intel-card-record" key={event.id}><span>Latest selected change · {formatEvidenceDate(event.eventDate)}</span><p>{event.after}</p><SourceLink data={data} item={event} /></article>)}</section>
      </div>

      <EvidenceMediaGallery data={data} media={media} heading="Figures" />

      <EvidenceReferences data={data} versionId={versionId} name={version.name} />

      {version.kind === 'digital' && (
        <section className="intel-digital-boundary" aria-label="Digital product context">
          <h3>Role, dose, and human boundary</h3>
          <p>This record identifies a <strong>{version.digitalSubtype ?? 'digital'}</strong> product that <strong>{version.clinicalRole}</strong>. Configuration, dose, and clinician or coach responsibilities show only when source-linked below.</p>
          <ClaimList data={data} claims={design.filter((claim) => claim.category === 'digital')} empty="No dose or human-workflow boundary has been curated for this product."  versionStatus={version.reviewStatus} />
        </section>
      )}

      <section className="intel-history" aria-labelledby="history-title">
        <div className="intel-section-head"><h3 id="history-title">History</h3><span>{asOf ? `As of ${asOf}` : 'All available dates'}</span></div>
        <p className="intel-caveat">A selected history — may not reflect the current, complete IFU or label.</p>
        {versionRelationships.length > 0 && <section className="intel-label-record" aria-label="Version relationships">
          <h4>Version relationships</h4>
          {versionRelationships.map((edge) => {
            const from = versionById(data, edge.fromVersionId)
            const to = versionById(data, edge.toVersionId)
            if (!from || !to) return null
            const endpoint = (id: string, name: string) => id === versionId
              ? <strong>{name}</strong>
              : <button className="intel-button" type="button" onClick={() => onSelectVersion(id)}>{name}</button>
            return <article key={edge.id}>
              <p>{endpoint(from.id, from.name)} {' → '} {endpoint(to.id, to.name)} <ReviewMark item={edge} /></p>
              <p>{edge.explanation}</p>
              <SourceLink data={data} item={edge} />
            </article>
          })}
        </section>}
        <div className="intel-history-lanes">
          {lanes.map((lane) => {
            const laneEvents = events.filter((event) => lane.kinds.includes(event.kind))
            return <section className="intel-history-lane" key={lane.name}><h4>{lane.name}</h4>{laneEvents.length ? laneEvents.map((event) => <EventEntry key={event.id} data={data} event={event} familyOnly={eventVersionAssociation(data, event, versionId) === 'family'} />) : <p className="intel-empty-copy">No dated events in this lane.</p>}</section>
          })}
        </div>
        {(decisions.length > 0 || indications.length > 0) && <section className="intel-label-record"><h4>Regulatory &amp; indication records</h4>
          {decisions.map((decision) => <article key={decision.id}><time>{formatEvidenceDate(decision.date)}</time><p><strong>{decision.identifier}</strong> · {decision.changeType.replace(/_/g, ' ')}</p><p>{decision.summary}</p><SourceLink data={data} item={decision} /></article>)}
          {indications.map((indication) => <article key={indication.id}><time>{formatEvidenceDate(indication.effectiveDate)}</time><p><strong>Indication ({indication.textType})</strong> · {indication.population}</p><p>{indication.text}</p>{indication.restrictions && <p className="intel-boundary">Restriction: {indication.restrictions}</p>}<SourceLink data={data} item={indication} /></article>)}
        </section>}
      </section>
    </section>
  )
}
