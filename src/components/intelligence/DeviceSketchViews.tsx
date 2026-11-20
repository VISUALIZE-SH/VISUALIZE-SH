import { schematicAssetUrl, type IllustrationSource, type SketchViewPaths } from '../../data/device-illustrations'

const views = [
  ['oblique', 'Oblique'],
  ['front', 'Front'],
  ['top', 'Top'],
] as const

export function SketchSources({ sources }: { sources: IllustrationSource[] }) {
  return <ul>{sources.map(({ title, url, locator }) => <li key={`${url}:${locator}`}>
    <a href={url} target="_blank" rel="noreferrer">{title}</a> · {locator}
  </li>)}</ul>
}

export default function DeviceSketchViews({ paths, name }: { paths?: SketchViewPaths; name: string }) {
  if (!paths) return null
  return <div className="intel-sketch-views" role="group" aria-label={`Device sketches for ${name}`}>
    {views.map(([view, label]) => {
      const url = schematicAssetUrl(paths[view])
      return <figure key={view}>
        <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${label.toLowerCase()} sketch of ${name}`}>
          <img src={url} alt={`${label} sketch of ${name}`} width={640} height={640} loading="lazy" />
        </a>
        <figcaption>{label}</figcaption>
      </figure>
    })}
  </div>
}
