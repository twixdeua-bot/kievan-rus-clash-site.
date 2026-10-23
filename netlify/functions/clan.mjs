export default async (request) => {
  // Netlify env values are expected to contain the raw Supercell token.
  // Remove accidental whitespace/newlines from copy-paste and an optional Bearer prefix.
  const rawKey = process.env.CLASH_ROYALE_API_KEY || '';
  const key = rawKey.replace(/^\s*Bearer\s+/i, '').replace(/\s+/g, '').trim();
  if (!key) {
    return Response.json({ error: 'На Netlify не найдена переменная CLASH_ROYALE_API_KEY для Production.', diagnostic: 'MISSING_API_KEY' }, { status: 500 });
  }

  const url = new URL(request.url);
  const rawTag = (url.searchParams.get('tag') || '').trim().replace(/^#/, '');
  if (!rawTag || !/^[0-9A-Z]+$/i.test(rawTag)) {
    return Response.json({ error: 'Укажи корректный тег клана, например #ABC123.', diagnostic: 'INVALID_TAG' }, { status: 400 });
  }

  const encodedTag = encodeURIComponent(`#${rawTag.toUpperCase()}`);
  const view = (url.searchParams.get('view') || 'clan').toLowerCase();
  const suffix = view === 'race' ? '/currentriverrace' : view === 'log' ? '/riverracelog' : '';
  if (!['clan','race','log'].includes(view)) return Response.json({error:'Неизвестный тип данных.'},{status:400});
  const endpoint = `https://proxy.royaleapi.dev/v1/clans/${encodedTag}${suffix}`;
  try {
    const upstream = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${key}`,
        // The proxy also supports the Supercell-style custom auth header.
        auth: key,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(12000)
    });
    const rawBody = await upstream.text();
    let body;
    try { body = rawBody ? JSON.parse(rawBody) : {}; }
    catch { body = { message: rawBody.slice(0, 500) }; }

    if (!upstream.ok) {
      // Show useful upstream diagnostics without ever returning the secret API key.
      const upstreamMessage = [body?.message, body?.reason, body?.error?.message, body?.error]
        .find(v => typeof v === 'string' && v.trim()) || '';
      let hint = 'Проверьте настройки API-ключа и разрешённый IP.';
      if (upstream.status === 400 || upstream.status === 404) hint = 'API не нашёл клан по этому тегу. Проверь тег в игре.';
      else if (upstream.status === 401) hint = 'API не принял авторизацию. Проверь API-ключ в Netlify.';
      else if (upstream.status === 403) hint = 'API запретил запрос. Обычно нужно проверить разрешённый IP в Supercell Developer Portal и то, через какой IP идёт запрос.';
      else if (upstream.status === 429) hint = 'Превышен лимит запросов API. Попробуй позже.';
      else if (upstream.status >= 500) hint = 'Сервис API временно ответил ошибкой.';
      return Response.json({
        error: 'Clash Royale API отклонил запрос.',
        diagnostic: 'UPSTREAM_API_ERROR',
        upstreamStatus: upstream.status,
        upstreamStatusText: upstream.statusText,
        upstreamMessage: upstreamMessage.slice(0, 350),
        hint
      }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }

    return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } });
  } catch (err) {
    const timeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return Response.json({
      error: timeout ? 'Превышено время ожидания ответа от Clash Royale API.' : 'Netlify Function не смогла связаться с Clash Royale API.',
      diagnostic: timeout ? 'UPSTREAM_TIMEOUT' : 'FETCH_FAILED',
      detail: String(err?.message || err).slice(0, 250)
    }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
};

export const config = { path: '/api/clan' };
