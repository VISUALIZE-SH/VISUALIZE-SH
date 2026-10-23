import type { IntelligenceData } from '../../types/intelligence'
import { therapySnapshots } from '../../data/therapy-snapshots'
import { GroupedTable, WIDTH } from './DataTables'
import EvidenceReferences from './EvidenceReferences'

export default function TherapySnapshots({ data, rows }: {
  data: IntelligenceData
  rows: ReturnType<typeof therapySnapshots>
}) {
  if (!rows.length) return null
  return <div className="intel-spec-tables">
    <p className="intel-data-result-note">Therapy snapshots — exact-version data is not yet curated. Illustrations show the named pictured configuration, not a verified clinical build or dated regulatory record.</p>
    <GroupedTable id="therapy-snapshots" label="Therapy snapshots" rows={rows} rowKey={row => row.therapy.id}
      product={({ therapy, illustration, maker }) => ({ name: therapy.name, maker, thumb: illustration, lifecycleStatus: therapy.lifecycleStatus, lifecycleDetail: therapy.lifecycleDetail })}
      sources={({ therapy, illustration }) => data.sources.filter(source => therapy.curation.sources?.includes(source.url) || illustration?.sources.some(reference => reference.url === source.url))}
      columns={[
        { id: 'type', label: 'Type', width: WIDTH.cell, cell: ({ therapy }) => ({ content: <>{therapy.therapyType}<small>{therapy.subtype}{therapy.curation.status === 'draft' && ' · draft record'}</small></> }) },
        { id: 'configuration', label: 'Pictured configuration', width: WIDTH.wide, cell: ({ illustration }) => ({ content: illustration?.configuration ?? 'Illustration unavailable', gap: !illustration }) },
      ]}
      detail={({ therapy, illustration }) => <>
        {illustration && <><ul>{illustration.limitations.map((limit, i) => <li key={i}>{limit}</li>)}</ul><ul>{illustration.sources.map((source, i) => <li key={i}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.locator}</li>)}</ul></>}
        <EvidenceReferences data={data} entityId={therapy.id} name={therapy.name} />
        {therapy.links?.map(link => <p key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a></p>)}
      </>} />
  </div>
}
