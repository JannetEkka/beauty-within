import { describe, expect, it } from 'vitest';
import { resultImageUrl, YouCam, YouCamError } from './youcam';

function fakeFetch(script: Record<string, (init?: RequestInit) => unknown>) {
  const calls: string[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.replace('https://api.test', '')}`;
    calls.push(key);
    const hit = Object.entries(script).find(([k]) => key.startsWith(k));
    if (!hit) return new Response('{}', { status: 404 });
    const body = hit[1](init);
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe('YouCam client', () => {
  it('uploads, starts a task and polls until success', async () => {
    let polls = 0;
    const { f, calls } = fakeFetch({
      'POST /s2s/v2.0/file': () => ({
        status: 200,
        data: { files: [{ file_id: 'F1', requests: [{ method: 'PUT', url: 'https://s3.test/up', headers: { 'Content-Type': 'image/jpeg' } }] }] },
      }),
      'PUT https://s3.test/up': () => '',
      'POST /s2s/v2.0/task/skin-tone-analysis': () => ({ status: 200, data: { task_id: 'T1' } }),
      'GET /s2s/v2.0/task/skin-tone-analysis/T1': () =>
        ++polls < 3 ? { status: 200, data: { task_status: 'running' } } : { status: 200, data: { task_status: 'success', results: { color: { skin_color: '#aa8866' } } } },
    });
    const yc = new YouCam({ apiKey: 'k', baseUrl: 'https://api.test', fetch: f, sleep: async () => {} });
    const id = await yc.upload(new ArrayBuffer(10), 'image/jpeg');
    expect(id).toBe('F1');
    const res = await yc.run('skin-tone-analysis', { src_file_id: id });
    expect(res.data?.task_status).toBe('success');
    expect(polls).toBe(3);
    expect(calls).toContain('PUT https://s3.test/up');
  });

  it('raises engine errors with their code', async () => {
    const { f } = fakeFetch({
      'POST /s2s/v2.0/task/makeup-vto': () => ({ status: 200, data: { task_id: 'T2' } }),
      'GET /s2s/v2.0/task/makeup-vto/T2': () => ({ status: 200, data: { task_status: 'error', error: 'error_face_position_invalid' } }),
    });
    const yc = new YouCam({ apiKey: 'k', baseUrl: 'https://api.test', fetch: f, sleep: async () => {} });
    await expect(yc.run('makeup-vto', {})).rejects.toMatchObject({ code: 'error_face_position_invalid' });
  });

  it('sums unit batches', async () => {
    const { f } = fakeFetch({ 'GET /s2s/v1.0/client/credit': () => ({ status: 200, results: [{ amount_dec: 990.5 }, { amount: 40 }] }) });
    const yc = new YouCam({ apiKey: 'k', baseUrl: 'https://api.test', fetch: f });
    expect(await yc.unitsLeft()).toBe(1030.5);
  });

  it('surfaces HTTP errors', async () => {
    const f = (async () => new Response(JSON.stringify({ status: 401, error_code: 'InvalidApiKey' }), { status: 401 })) as unknown as typeof fetch;
    const yc = new YouCam({ apiKey: 'bad', baseUrl: 'https://api.test', fetch: f });
    await expect(yc.unitsLeft()).rejects.toBeInstanceOf(YouCamError);
  });

  it('uses the v2.1 path for hairstyle transfer and pages through templates', async () => {
    const { f, calls } = fakeFetch({
      'POST /s2s/v2.1/task/hair-transfer': () => ({ status: 200, data: { task_id: 'H1' } }),
      'GET /s2s/v2.1/task/hair-transfer/H1': () => ({ status: 200, data: { task_status: 'success', results: { url: 'x' } } }),
      'GET /s2s/v2.1/task/template/hair-transfer?page_size=50&starting_token=n1': () => ({ status: 200, data: { templates: [{ id: 't2', title: 'Bob' }] } }),
      'GET /s2s/v2.1/task/template/hair-transfer?page_size=50': () => ({ status: 200, data: { templates: [{ id: 't1', title: 'Long' }], next_token: 'n1' } }),
    });
    const yc = new YouCam({ apiKey: 'k', baseUrl: 'https://api.test', fetch: f, sleep: async () => {} });
    await yc.run('hair-transfer', { template_id: 't1' });
    expect(calls[0]).toBe('POST /s2s/v2.1/task/hair-transfer');
    expect((await yc.hairTemplates()).map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('finds the try-on image in either result shape', () => {
    expect(resultImageUrl({ data: { results: { url: 'a' } } })).toBe('a');
    expect(resultImageUrl({ data: { results: [{ download_url: 'b' }] } })).toBe('b');
  });
});
