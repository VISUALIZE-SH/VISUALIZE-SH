import { useEffect, useState, type ReactNode } from 'react'
import type { GraphNodeData } from '../../types/entities'
import type { IntelligenceData, ProductFamily, ProductVersion } from '../../types/intelligence'
import { deviceIllustrationFor, therapyIllustrationFor } from '../../data/device-illustrations'
import ProfileSchematic from './ProfileSchematic'
import EvidenceReferences from './EvidenceReferences'
import './profile-catalog.css'

interface ProfileCatalogProps {
  data: IntelligenceData
  therapyNodes: GraphNodeData[]
  nodesById: Map<string, GraphNodeData>
  onOpenVersion: (id: string) => void
  onOpenNode: (id: string) => void
}

const GROUP_LABELS: Record<string, string> = {
  device: 'Devices',
  pharmaceutical: 'Pharmaceuticals',
  procedure: 'Procedures',
  digital: 'Digital therapies',
}

function ProfileDescription({ description, children }: { description: string; children?: ReactNode }) {
  return <details className="profile-card-description">
    <summary>
      <span className="profile-card-excerpt">{description}</span>
      <span className="profile-card-detail-link">
        <span className="profile-card-detail-closed">Full description</span>
        <span className="profile-card-detail-open">Show less</span>
      </span>
    </summary>
    {children}
  </details>
}

function FamilyProfileCard({ family, versions, data, onOpenVersion }: {
  family: ProductFamily
  versions: ProductVersion[]
  data: IntelligenceData
  onOpenVersion: ProfileCatalogProps['onOpenVersion']
}) {
  const [selectedVersionId, setSelectedVersionId] = useState<string>()
  const firstIllustrated = versions.find(version => version.kind === 'device' && deviceIllustrationFor(version.id))
  const version = versions.find(item => item.id === selectedVersionId) ?? firstIllustrated ?? versions[0]
  const illustration = version?.kind === 'device' ? deviceIllustrationFor(version.id) : undefined

  return <article className="profile-catalog-card" id={`profile-${family.id}`} tabIndex={-1}>
    <header className="profile-card-heading">
      <p className="profile-card-maker">{family.manufacturer}</p>
      <h4 className="profile-card-title">{family.name}</h4>
    </header>
    {versions.length > 1 && <label className="profile-card-version">
      <span>Version</span>
      <select value={version?.id} onChange={event => setSelectedVersionId(event.target.value)} aria-label={`${family.name} version`}>
        {versions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>}
    {version && illustration
      ? <ProfileSchematic illustration={illustration} name={version.name} notes={illustration.notes} catalog />
      : firstIllustrated && <p className="profile-card-unavailable">No schematic for this version.</p>}
    {family.description && <ProfileDescription description={family.description} />}
    {version && <footer className="profile-card-footer">
      <button type="button" className="profile-card-open" onClick={() => onOpenVersion(version.id)} aria-label={`View ${version.name} profile`}>View profile <span aria-hidden="true">→</span></button>
      <EvidenceReferences key={version.id} data={data} versionId={version.id} name={version.name} compact />
    </footer>}
  </article>
}

/** Exact versions and graph-level snapshots keep their own illustration identities. */
export default function ProfileCatalog({ data, therapyNodes, nodesById, onOpenVersion, onOpenNode }: ProfileCatalogProps) {
  const targetId = window.location.hash.slice(1)
  useEffect(() => {
    if (!targetId.startsWith('profile-')) return
    const card = document.getElementById(targetId)
    card?.scrollIntoView({ block: 'center' })
    card?.focus({ preventScroll: true })
  }, [targetId, data])

  const versionsByFamily = new Map<string, ProductVersion[]>()
  for (const version of data.versions) {
    const versions = versionsByFamily.get(version.familyId)
    if (versions) versions.push(version)
    else versionsByFamily.set(version.familyId, [version])
  }
  const deeplyProfiledIds = new Set(data.families.flatMap(family => family.entityIds))
  const snapshots = therapyNodes.flatMap(node => {
    if (node.entity.type !== 'therapy') return []
    const illustration = node.entity.therapyType === 'device' ? therapyIllustrationFor(node.id) : undefined
    return !deeplyProfiledIds.has(node.id) || illustration ? [{ node, therapy: node.entity, illustration }] : []
  }).sort(({ node: a }, { node: b }) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label))
  const groups = [...new Set(snapshots.map(({ node }) => node.group))]

  return <section className="profile-catalog" aria-labelledby="profile-catalog-title">
    <h2 id="profile-catalog-title">All therapies</h2>
    <p>{data.coverage.description}</p>

    {data.families.length > 0 && <section className="profile-section" aria-labelledby="deep-profiles-title">
      <header><h3 id="deep-profiles-title">Source-linked versions</h3><span>{data.versions.length}</span></header>
      <div className="profile-catalog-grid">{data.families.map(family => <FamilyProfileCard key={family.id}
        family={family} versions={versionsByFamily.get(family.id) ?? []} data={data} onOpenVersion={onOpenVersion} />)}</div>
    </section>}

    {groups.map(group => {
      const records = snapshots.filter(({ node }) => node.group === group)
      return <section className="profile-section" key={group} aria-labelledby={`landscape-${group}`}>
        <header><h3 id={`landscape-${group}`}>{GROUP_LABELS[group] ?? group}</h3><span>{records.length}</span></header>
        <div className="profile-catalog-grid">{records.map(({ node, therapy, illustration }) => {
          const company = therapy.company ? nodesById.get(therapy.company)?.label : undefined
          const conditions = therapy.treats.map(id => nodesById.get(id)?.label ?? id)
          return <article className="profile-catalog-card" key={node.id} id={`profile-${node.id}`} tabIndex={-1}>
            <header className="profile-card-heading">
              {company && <p className="profile-card-maker">{company}</p>}
              <h4 className="profile-card-title">{therapy.name}</h4>
              <div className="profile-landscape-meta">
                <span className="profile-card-subtype">{therapy.subtype ?? node.category ?? therapy.therapyType}</span>
                <span className={`profile-status profile-status-${therapy.regulatoryStatus}`}>{therapy.regulatoryStatus === 'unknown' ? 'Unverified' : therapy.regulatoryStatus}</span>
              </div>
            </header>
            {illustration && <ProfileSchematic illustration={illustration} name={therapy.name} notes={illustration} catalog />}
            <ProfileDescription description={therapy.mechanism ?? therapy.description ?? 'No detailed mechanism profile yet.'}>
              <dl className="profile-card-context">
                <div><dt>Clinical context</dt><dd>{conditions.join(' · ') || 'Not linked'}</dd></div>
                {therapy.regulatoryDetail && <div><dt>Regulatory record</dt><dd>{therapy.regulatoryDetail}</dd></div>}
                {!!therapy.materials?.length && <div><dt>Reported implant materials</dt><dd>{therapy.materials.map(material => material.name).join(' · ')}</dd></div>}
              </dl>
            </ProfileDescription>
            <footer className="profile-card-footer">
              <div className="profile-card-actions">
                <button type="button" className="profile-card-open" onClick={() => onOpenNode(node.id)}>Open in Explore →</button>
                {therapy.links?.slice(0, 1).map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>)}
              </div>
              <EvidenceReferences data={data} entityId={node.id} name={therapy.name} compact />
            </footer>
          </article>
        })}</div>
      </section>
    })}
  </section>
}
