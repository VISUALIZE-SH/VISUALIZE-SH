import type { GraphNodeData } from '../../types/entities'
import type { IntelligenceData } from '../../types/intelligence'

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

/**
 * Profiles has two evidence tiers. Curated IntelligenceData versions expose the
 * source-linked deep dive; every other therapy remains discoverable through a
 * concise landscape profile built only from authored graph fields.
 */
export default function ProfileCatalog({ data, therapyNodes, nodesById, onOpenVersion, onOpenNode }: ProfileCatalogProps) {
  const deeplyProfiledIds = new Set(data.families.flatMap((family) => family.entityIds))
  const landscapeOnly = therapyNodes
    .filter((node) => !deeplyProfiledIds.has(node.id))
    .sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label))
  const groups = [...new Set(landscapeOnly.map((node) => node.group))]

  return <section className="profile-catalog" aria-labelledby="profile-catalog-title">
    <h2 id="profile-catalog-title">All therapies</h2>
    <p>{data.coverage.description}</p>

    {data.families.length > 0 && <section className="profile-section" aria-labelledby="deep-profiles-title">
      <header><h3 id="deep-profiles-title">Source-linked versions</h3><span>{data.versions.length}</span></header>
      <div className="profile-family-grid">{data.families.map((family) => <article key={family.id}>
        <span className="eyebrow">{family.manufacturer}</span><h3>{family.name}</h3><p>{family.description}</p>
        <ul>{data.versions.filter((version) => version.familyId === family.id).map((version) => <li key={version.id}><button onClick={() => onOpenVersion(version.id)}>{version.name}<span>View profile →</span></button></li>)}</ul>
      </article>)}</div>
    </section>}

    {groups.map((group) => {
      const records = landscapeOnly.filter((node) => node.group === group)
      return <section className="profile-section" key={group} aria-labelledby={`landscape-${group}`}>
        <header><h3 id={`landscape-${group}`}>{GROUP_LABELS[group] ?? group}</h3><span>{records.length}</span></header>
        <div className="profile-landscape-grid">{records.map((node) => {
          if (node.entity.type !== 'therapy') return null
          const therapy = node.entity
          const company = therapy.company ? nodesById.get(therapy.company)?.label : undefined
          const conditions = therapy.treats.map((id) => nodesById.get(id)?.label ?? id)
          return <article key={node.id}>
            <div className="profile-landscape-meta"><span>{therapy.subtype ?? node.category ?? therapy.therapyType}</span><span className={`profile-status profile-status-${therapy.regulatoryStatus}`}>{therapy.regulatoryStatus}</span></div>
            <h4>{therapy.name}</h4>
            {company && <p className="profile-maker">{company}</p>}
            <p>{therapy.mechanism ?? therapy.description ?? 'No detailed mechanism profile yet.'}</p>
            <dl>
              <div><dt>Clinical context</dt><dd>{conditions.join(' · ') || 'Not linked'}</dd></div>
              {therapy.regulatoryDetail && <div><dt>Regulatory record</dt><dd>{therapy.regulatoryDetail}</dd></div>}
              {therapy.materials?.length && <div><dt>Reported implant materials</dt><dd>{therapy.materials.map((material) => material.name).join(' · ')}</dd></div>}
            </dl>
            <div className="profile-landscape-actions">
              <button type="button" onClick={() => onOpenNode(node.id)}>Open in Explore →</button>
              {therapy.links?.slice(0, 1).map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>)}
            </div>
          </article>
        })}</div>
      </section>
    })}
  </section>
}
