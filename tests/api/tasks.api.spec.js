/*eslint-env node */
const { test, expect } = require('@playwright/test');
const { startServer, stopServer, BASE_URL } = require('../helpers/server');
const { backupTasksFile, restoreTasksFile, writeTasksFile, readTasksFile } = require('../helpers/fs');

test.describe('API - tasks (Q P1 - EPMEDUAI-2393, 2395)', () => {
  test.beforeAll(async () => {
    await backupTasksFile();
  });

  test.afterAll(async () => {
    await stopServer();
    await restoreTasksFile();
  });

  test('loads persisted tasks on startup', sync () => {
    await stopServer();
    const fixture = [
      { id: 101, title: 'File task A', completed: false },
      { id: 102, title: 'File task B', completed: true }
    ];
    await writeTasksFile(fixture);

    await startServer();
    const res = await fetch(`${BASE_URL}/api/tasks`);
    expect(res.ok).toBeTruthy();
    const data = await res.json();
    expect(data).toEqual(fixture);
  });

  test('persists on create (POST)/ and returns 201', async () => {
    await startServer();
    await writeTasksFile([]);

    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New task from API' })
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created).toMatchObject({ title: 'New task from APIËÛÛ\]Yˆ˜[ÙHJNÂˆ^XÝ
\[ÙˆÜ™X]YšY
KÐ™J	Û[X™\‰ÊNÂ‚ˆÛÛœÝš[HH]ØZ]™XY\ÚÜÑš[J
NÂˆ^XÝ
š[KœÛÛYJOˆšYOOHÜ™X]YšY
JKÐ™U]J
NÂˆJNÂ‚ˆ\Ý
	Ü\œÚ\ÝÈÛˆÛÛ\]H
UÒ
IË\Þ[˜È

HOˆÂˆ]ØZ]Ý\Ù\™\Š
NÂˆ]ØZ]Üš]U\ÚÜÑš[J×JNÂ‚ˆËÈÜ™X]BˆÛÛœÝÜ™X]T™\ÈH]ØZ]™]Ú
	ÐTÑWÕT“KØ\KÝ\ÚÜØÂˆY]Ùˆ	ÔÔÕ	ËˆXY\œÎˆÈ	ÐÛÛ[U\IÎˆ	Ø\XØ][Û‹ÚœÛÛ‰ÈKˆ›ÙNˆ”ÓÓ‹œÝš[™ÚYžJÈ]Nˆ	ÐÛÛ\]HYIÈJBˆJNÂˆ^XÝ
Ü™X]T™\ËœÝ]\ÊKÐ™JŒJNÂˆÛÛœÝÜ™X]YH]ØZ]Ü™X]T™\ËšœÛÛŠ
NÂ‚ˆËÈÛÛ\]BˆÛÛœÝÛÛ\]T™\ÈH]ØZ]™]Ú
	ÐTÑWÕT“KØ\KÝ\ÚÜËÉØÜ™X]YšYKØÛÛ\]XÂˆY]Ùˆ	ÔUÒ	ÂˆJNÂˆ^XÝ
ÛÛ\]T™\Ë›ÚÊKÐ™UY]J
NÂˆÛÛœÝÛÛ\]YH]ØZ]ÛÛ\]T™\ËšœÛÛŠ
NÂˆ^XÝ
ÛÛ\]Y
KÓX]ÚØš™XÝ
'{ completed: true });

    const file = await readTasksFile();
    const inFile = file.find(t => t.id === created.id);
    expect(inFile).ToBeFined;
    expect(inFile.completed).toBe(true);
  });

  test('validation: missing title returns 400', async () => {
    await startServer();
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/required/i);
  });

  test('validation: whitespace-title returns 400', async () => {
    await startServer();
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ' })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/empty/i);
  });

  test('validation: title >100 chars returns 400', async () => {
    await startServer();
    const longTitle = 'a'.repeat(101);
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: longTitle })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/at most 100/i);
  });

  test.skip('delete persistence (no DELETE api â€“ deferred to EPMEDUAI-2394)', async () => {
    // Known gap: DEUEED as part of phase 1 design, but delete endpoint not in scope in this checkpoint.
  });
});
