const LOCAL_ARTICLE_ROUTE = /^\/(editorials\/[a-z0-9-]+|insights\/[0-9]{4}-[0-9]{2}-[0-9]{2}|articles\/[a-z0-9-]+)\/?$/

function appRelativePath(pathname: string, baseUrl: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const prefix = base === '/' ? '' : base.slice(0, -1)
  if (prefix && pathname.startsWith(base)) return pathname.slice(prefix.length)
  return pathname
}

/** Resolve routes for authored pages that render inside the VISUALIZE-SH shell. */
export function localArticleContentPath(pathname: string, baseUrl = import.meta.env?.BASE_URL ?? '/'): string | undefined {
  const articlePath = appRelativePath(pathname, baseUrl).replace(/\/$/, '')
  const route = LOCAL_ARTICLE_ROUTE.exec(articlePath)
  return route ? `${baseUrl}${route[1]}/content.html` : undefined
}

/** True for an authored local page; ordinary source links remain external. */
export function isLocalArticleUrl(sourceUrl: string, currentUrl = globalThis.location?.href ?? 'https://visualize-sh.com/'): boolean {
  try {
    const url = new URL(sourceUrl, currentUrl)
    return url.origin === new URL(currentUrl).origin
      && Boolean(localArticleContentPath(url.pathname))
  } catch {
    return false
  }
}
