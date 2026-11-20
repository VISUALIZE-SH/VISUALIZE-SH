import { useId, useState } from 'react'
import { schematicAssetUrl, type IllustrationNotes, type ProfileIllustration } from '../../data/device-illustrations'
import { SketchSources } from './DeviceSketchViews'
import './profile-schematic.css'

const labels = [
  ['oblique', 'Oblique'],
  ['side', 'Side'],
  ['top', 'Top'],
  ['distal', 'Distal'],
  ['reference', 'Reference'],
] as const

type Projection = typeof labels[number][0]

function SchematicDrawing({ illustration, name, notes, catalog }: {
  illustration: ProfileIllustration
  name: string
  notes?: IllustrationNotes
  catalog: boolean
}) {
  const viewGroup = useId()
  const [selected, setSelected] = useState<Projection>('oblique')
  const [failed, setFailed] = useState<string>()
  const paths = {
    oblique: illustration.views?.oblique ?? illustration.assetPath,
    side: illustration.views?.front,
    top: illustration.views?.top,
    ...illustration.profileViews,
  }
  const options = labels.filter(([view]) => paths[view])
  const [view, label] = options.find(([view]) => view === selected) ?? labels[0]
  const src = schematicAssetUrl(paths[view] ?? illustration.assetPath)
  return <>
    <figure className="intel-schematic-frame">
      {options.length > 1 && <fieldset className="intel-schematic-switch">
        <legend className="intel-visually-hidden">Schematic view</legend>
        {options.map(([option, text]) => <label key={option}>
          <input type="radio" name={viewGroup} checked={view === option} onChange={() => setSelected(option)} />
          <span>{text}</span>
        </label>)}
      </fieldset>}
      <div className="intel-schematic-stage">
        {failed === src
          ? <p role="status">This schematic view could not load.</p>
          : <img key={src} src={src} alt={`${label} schematic of ${name}`} width={640} height={640} loading="lazy" onError={() => setFailed(src)} />}
      </div>
    </figure>
    {!catalog && notes?.configuration && <p className="intel-schematic-config">{notes.configuration}</p>}
    {notes && (notes.limitations.length > 0 || notes.sources.length > 0) && <details className="intel-schematic-references">
      <summary>Sources and depiction limits</summary>
      {catalog && notes.configuration && <p className="intel-schematic-config">{notes.configuration}</p>}
      {notes.limitations.length > 0 && <ul>{notes.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>}
      {notes.sources.length > 0 && <SketchSources sources={notes.sources} />}
    </details>}
  </>
}

export default function ProfileSchematic({ illustration, name, notes, catalog = false }: {
  illustration: ProfileIllustration
  name: string
  notes?: IllustrationNotes
  catalog?: boolean
}) {
  const heading = useId()
  return <section className={catalog ? 'profile-card-schematic' : 'intel-card intel-profile-schematic'} aria-labelledby={heading}>
    {catalog ? <p className="profile-card-schematic-title"><strong id={heading}>Schematic</strong><span>Not to scale</span></p> : <h3 id={heading}>Schematic</h3>}
    <SchematicDrawing key={illustration.assetPath} illustration={illustration} name={name} notes={notes} catalog={catalog} />
  </section>
}
