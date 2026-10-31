const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});
async function manager(page) {
  await page
    .getByRole('button', { name: 'Manage templates', exact: true })
    .click();
}
async function newTemplate(page, name, message) {
  await page.getByRole('button', { name: 'New template', exact: true }).click();
  await page.locator('#template-name').fill(name);
  await page.locator('#template-message').fill(message);
  await page
    .getByRole('button', { name: 'Save Template', exact: true })
    .click();
}
async function close(page) {
  await page.getByRole('button', { name: 'Close template manager' }).click();
}
async function word(page) {
  const d = page.waitForEvent('download');
  await page.locator('#generate').click();
  return await (await d).path();
}
function unzip(path) {
  return JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import zipfile,json,sys,struct,base64
with zipfile.ZipFile(sys.argv[1]) as z:
 p=[n for n in z.namelist() if n.startswith('word/media/')][0]
 b=z.read(p)
 print(json.dumps({'png':base64.b64encode(b).decode(),'xml':z.read('word/document.xml').decode(),'dimensions':struct.unpack('>II',b[16:24])}))`,
        path
      ],
      { encoding: 'utf8' }
    )
  );
}
test('starts offline with plain paper and locally loaded fonts; preferences preserve edits', async ({
  page
}) => {
  const remote = [];
  await page.route('**/*', (route) => {
    if (!route.request().url().startsWith('http://127.0.0.1:5010')) {
      remote.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.reload();
  await expect(page).toHaveTitle('Team Bouma Card Generator');
  await expect(page.locator('#font')).toHaveValue('Caveat');
  await expect(page.locator('#ink')).toHaveValue('#163b69');
  await expect(page.locator('#handwriting')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)'
  );
  await expect(page.locator('#render')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)'
  );
  await page.locator('#message').fill('One-off note');
  await page.locator('summary').click();
  await page.locator('#font').selectOption('Homemade Apple');
  await page.locator('#ink').fill('#112233');
  await expect(page.locator('#handwriting')).toHaveCSS(
    'color',
    'rgb(17, 34, 51)'
  );
  await expect(page.locator('#message')).toHaveValue('One-off note');
  expect(
    await page.evaluate(async () => {
      const f = await document.fonts.load('18pt "Homemade Apple"');
      return f[0].status;
    })
  ).toBe('loaded');
  expect(remote).toEqual([]);
  page.on('dialog', (d) => d.accept());
  await page.reload();
  await expect(page.locator('#font')).toHaveValue('Homemade Apple');
  expect(
    await page.evaluate(() => localStorage.getItem('bouma.cards.v1'))
  ).not.toContain('One-off note');
});
test('templates create, explicitly save, rename, persist, and delete without reseeding', async ({
  page
}) => {
  await manager(page);
  await newTemplate(page, 'Fictitious sample', 'Dear {first_names},\nThanks!');
  await page.locator('#template-name').fill('Renamed sample');
  await page.locator('#template-message').fill('Updated {first_names}');
  await page.locator('#save-template').click();
  await close(page);
  await page.reload();
  await expect(page.locator('#template option')).toContainText([
    'Renamed sample'
  ]);
  await page.locator('#template').selectOption({ label: 'Renamed sample' });
  await manager(page);
  page.on('dialog', (d) => d.accept());
  await page.locator('#delete-template').click();
  await close(page);
  await page.reload();
  await expect(page.locator('#template option')).not.toContainText([
    'Renamed sample'
  ]);
  await manager(page);
  while ((await page.locator('#managed-template option').count()) > 1) {
    await page.locator('#managed-template').selectOption({ index: 1 });
    await page.locator('#delete-template').click();
  }
  await close(page);
  await page.reload();
  expect(await page.locator('#template option').count()).toBe(1);
});
test('recipient substitution, address opt-in and one-off edits stay separate', async ({
  page
}) => {
  await page.locator('#names').fill('Alex and Sam');
  await page.locator('#address').fill('123 Fiction Street\nOttawa ON\nK1A 0A1');
  await page.locator('#template').selectOption({ index: 1 });
  expect(await page.locator('#message').inputValue()).toContain(
    'Dear Alex and Sam'
  );
  expect(await page.locator('#message').inputValue()).not.toContain('Fiction');
  await page.locator('#message').fill('My custom card');
  await page.locator('#names').fill('Jamie');
  await expect(page.locator('#message')).toHaveValue('My custom card');
  await expect(page.locator('#address')).toHaveValue(
    '123 Fiction Street\nOttawa ON\nK1A 0A1'
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bouma.cards.v1'))
  );
  expect(JSON.stringify(saved)).not.toContain('My custom card');
  expect(JSON.stringify(saved)).not.toContain('Fiction Street');
  page.once('dialog', (d) => d.dismiss());
  await page.locator('#template').selectOption({ index: 2 });
  await expect(page.locator('#message')).toHaveValue('My custom card');
  await manager(page);
  await newTemplate(page, 'Address test', '{first_names}\n{address}');
  await close(page);
  page.once('dialog', (d) => d.accept());
  await page.locator('#template').selectOption({ label: 'Address test' });
  await expect(page.locator('#message')).toHaveValue(
    'Jamie\n123 Fiction Street\nOttawa ON\nK1A 0A1'
  );
});
test('JSON backups merge copies; invalid imports do not overwrite', async ({
  page
}) => {
  await manager(page);
  const d = page.waitForEvent('download');
  await page.locator('#export-templates').click();
  const file = await (await d).path();
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(data.version).toBe(1);
  expect(data.templates).toHaveLength(4);
  await page.locator('#import-templates').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data))
  });
  await expect(page.locator('#template-status')).toContainText('Imported 4');
  expect(await page.locator('#managed-template option').count()).toBe(9);
  for (const bad of [
    '{',
    JSON.stringify({ version: 1, templates: [{ name: 'Bad', message: 42 }] })
  ]) {
    await page.locator('#import-templates').setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from(bad)
    });
    expect(await page.locator('#managed-template option').count()).toBe(9);
  }
});
test('empty, unresolved and long messages block export without extra pages', async ({
  page
}) => {
  await page.locator('#generate').click();
  await expect(page.locator('#status')).toContainText('Enter a message');
  await page.locator('#message').fill('Hello {missing}');
  await page.locator('#generate').click();
  await expect(page.locator('#status')).toContainText('Resolve placeholders');
  await page.locator('#message').fill('Long message '.repeat(1000));
  await page.locator('#generate').click();
  await expect(page.locator('#status')).toContainText('does not fit');
});
test('300 DPI DOCX has exact 7 × 10 page and fixed lower-panel anchor', async ({
  page
}) => {
  await page
    .locator('#message')
    .fill('Dear Alex,\n\nThank you for your kindness.\n\nMike');
  const path = await word(page);
  const { xml, dimensions, png } = unzip(path);
  const ink = await page.evaluate(async (b64) => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + b64;
    await image.decode();
    const c = document.createElement('canvas');
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let transparent = 0,
      opaque = 0,
      white = 0;
    let top = c.height,
      bottom = 0,
      left = c.width,
      right = 0;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if (d[i + 3] === 0) transparent++;
        if (d[i + 3] === 255) opaque++;
        if (d[i + 3] > 0 && d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240)
          white++;
        if (d[i] < 170 && d[i + 3] > 0) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
      }
    return { top, bottom, left, right, transparent, opaque, white };
  }, png);
  expect(ink.transparent).toBeGreaterThan(1800 * 1200 * 0.9);
  expect(ink.opaque).toBeGreaterThan(0);
  expect(ink.white).toBe(0);
  expect(ink.top).toBeGreaterThan(250);
  expect(ink.bottom).toBeLessThan(950);
  expect(ink.left).toBeGreaterThan(0);
  expect(ink.right).toBeLessThan(1800);
  expect(dimensions).toEqual([1800, 1200]);
  expect(xml).toMatch(/w:w="10080" w:h="14400"/);
  expect(xml).toContain('<wp:posOffset>457200</wp:posOffset>');
  expect(xml).toContain('<wp:posOffset>5029200</wp:posOffset>');
  expect(xml.match(/<w:sectPr>/g)).toHaveLength(1);
  expect(xml).not.toContain('w:type="page"');
  expect(xml.match(/<w:p[ >]/g)).toHaveLength(1);
  expect(xml.match(/<w:drawing>/g)).toHaveLength(1);
  expect(xml).not.toMatch(
    /<w:(t|tbl|headerReference|footerReference|pageBreakBefore)[ >]/
  );
  expect(xml).toContain('w:line="1"');
  expect(xml).toContain('cx="5486400" cy="3657600"');
});
test('medium message and calibration export; filename sanitization', async ({
  page
}) => {
  await page.locator('#names').fill('Alex / Sam:*');
  await page
    .locator('#message')
    .fill(
      'Dear Alex and Sam,\n\nThank you for trusting me with your purchase. It has been a pleasure helping you find a home, and I hope you make wonderful memories there.\n\nMike'
    );
  const d = page.waitForEvent('download');
  await page.locator('#generate').click();
  expect((await d).suggestedFilename()).toBe('Thank You Card - Alex  Sam.docx');
  await page.locator('summary').click();
  await page.locator('#x').fill('2');
  await page.evaluate(() => {
    const render = window.html2canvas;
    window.html2canvas = (element, options) => {
      window.calibrationLabel = element.textContent;
      return render(element, options);
    };
  });
  const c = page.waitForEvent('download');
  await page.locator('#calibrate').click();
  const path = await (await c).path();
  expect(unzip(path).xml).toContain('<wp:posOffset>529200</wp:posOffset>');
  expect(unzip(path).xml).toContain('<wp:posOffset>5029200</wp:posOffset>');
  expect(await page.evaluate(() => window.calibrationLabel)).toContain(
    'LOWER PANEL'
  );
});
test('legacy equivalent: generation, deletion, margins and lines', async ({
  page
}) => {
  await page.route('https://**', (r) => r.abort());
  await page.goto('/legacy/index.html');
  const generate = page.locator('[data-testid=generate-image-button]');
  await generate.click();
  await expect(page.locator('#output').locator(':scope > *')).toHaveCount(1);
  await generate.click();
  await expect(page.locator('#output').locator(':scope > *')).toHaveCount(2);
  await page.locator('.close-0').click();
  await expect(page.locator('#output').locator(':scope > *')).toHaveCount(1);
  await expect(page.locator('.left-margin')).toBeVisible();
  await page.locator('label[for=paper-margin-toggle]').click();
  await expect(page.locator('.left-margin')).toBeHidden();
  await expect(page.locator('.top-margin')).toBeHidden();
  await expect(page.locator('.page-a')).toHaveClass(/lines/);
  await page.locator('label[for=paper-line-toggle]').click();
  await expect(page.locator('.page-a')).not.toHaveClass(/lines/);
  await page.locator('label[for=paper-line-toggle]').click();
  await expect(page.locator('.page-a')).toHaveClass(/lines/);
});

test('failed template writes keep existing data, and unsaved manager edits require confirmation', async ({
  page
}) => {
  await manager(page);
  await page.locator('#managed-template').selectOption({ index: 1 });
  const original = await page.locator('#template-name').inputValue();
  await page.locator('#template-name').fill('Unsaved change');
  page.once('dialog', (d) => d.dismiss());
  await page.locator('#managed-template').selectOption({ index: 2 });
  await expect(page.locator('#template-name')).toHaveValue('Unsaved change');
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.locator('#save-template').click();
  await expect(page.locator('#template-status')).toContainText(
    'Quota exceeded'
  );
  const names = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bouma.cards.v1')).templates.map(
      (t) => t.name
    )
  );
  expect(names).toContain(original);
  expect(names).not.toContain('Unsaved change');
});

test('mobile layout and custom font load without persisting font or recipient data', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#generate')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.locator('summary').click();
  await page
    .locator('#font-file')
    .setInputFiles(
      'node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff2'
    );
  await expect(page.locator('#font')).toHaveValue('Session font');
  await expect(page.locator('#status')).toContainText('Custom font loaded');
  await page.locator('#names').fill('Alex');
  await page.reload();
  await expect(page.locator('#font')).not.toHaveValue('Session font');
  await expect(page.locator('#names')).toHaveValue('');
});

test('explicit recipient refresh preserves custom prose and never replaces arbitrary matching names', async ({
  page
}) => {
  await page.locator('#names').fill('Alex');
  await page.locator('#template').selectOption({ index: 1 });
  const original = await page.locator('#message').inputValue();
  await page
    .locator('#message')
    .fill(original + '\nA personal note: Alex recommended this neighbourhood.');
  await page.locator('#names').fill('Jamie and Sam');
  await expect(page.locator('#message')).toHaveValue(
    original + '\nA personal note: Alex recommended this neighbourhood.'
  );
  await page.locator('#update-recipient').click();
  await expect(page.locator('#message')).toHaveValue(
    original.replace('Dear Alex,', 'Dear Jamie and Sam,') +
      '\nA personal note: Alex recommended this neighbourhood.'
  );
  await page.locator('#names').fill('Taylor');
  await page.locator('#update-recipient').click();
  expect(await page.locator('#message').inputValue()).toContain('Dear Taylor,');
  expect(await page.locator('#message').inputValue()).toContain(
    'Alex recommended'
  );
  const stored = await page.evaluate(() =>
    localStorage.getItem('bouma.cards.v1')
  );
  expect(stored).not.toContain('Jamie');
  expect(stored).not.toContain('personal note');
});

test('manually edited recipient fields stay untouched; explicit tokens can be refreshed', async ({
  page
}) => {
  await manager(page);
  await newTemplate(
    page,
    'Recipient fields',
    'Dear {first_names},\n{address}\nThank you, {first_names}!'
  );
  await close(page);
  await page.locator('#names').fill('Alex');
  await page.locator('#address').fill('123 Fiction Street\nOttawa');
  await page.locator('#template').selectOption({ label: 'Recipient fields' });
  const text = await page.locator('#message').inputValue();
  await page
    .locator('#message')
    .fill(text.replace('Dear Alex,', 'Dear dear friends,'));
  await page.locator('#names').fill('Taylor');
  await page.locator('#address').fill('456 Example Street\nToronto');
  await page.locator('#update-recipient').click();
  await expect(page.locator('#message')).toHaveValue(
    'Dear dear friends,\n456 Example Street\nToronto\nThank you, Taylor!'
  );
  await page
    .locator('#message')
    .fill('Dear {first_names},\nMy complete rewrite.\n{address}');
  await page.locator('#update-recipient').click();
  await expect(page.locator('#message')).toHaveValue(
    'Dear Taylor,\nMy complete rewrite.\n456 Example Street\nToronto'
  );
  await page.locator('#message').fill('Entirely custom greeting');
  await page.locator('#update-recipient').click();
  await expect(page.locator('#message')).toHaveValue(
    'Entirely custom greeting'
  );
  await expect(page.locator('#status')).toContainText(
    'No untouched recipient fields'
  );
});

test('backup is discoverable on the main screen', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: 'Back up templates', exact: true })
  ).toBeVisible();
  const d = page.waitForEvent('download');
  await page.locator('#backup-templates').click();
  const path = await (await d).path();
  expect(JSON.parse(fs.readFileSync(path, 'utf8')).templates).toHaveLength(4);
});

for (const offset of [-6, 6])
  test(`export stays inside the lower half at ${offset} mm calibration limits`, async ({
    page
  }) => {
    await page.locator('#message').fill('A short handwritten thank-you.');
    await page.locator('summary').click();
    await page.locator('#x').fill(String(offset));
    await page.locator('#y').fill(String(offset));
    const { xml } = unzip(await word(page));
    const x = Number(xml.match(/<wp:positionH[^>]*>.*?<wp:posOffset>(\d+)/)[1]);
    const y = Number(xml.match(/<wp:positionV[^>]*>.*?<wp:posOffset>(\d+)/)[1]);
    const half = 5 * 914400;
    expect(x).toBeGreaterThan(0);
    expect(x + 6 * 914400).toBeLessThan(7 * 914400);
    expect(y).toBeGreaterThan(half);
    expect(y + 4 * 914400).toBeLessThan(half + 5 * 914400);
    expect(xml).not.toMatch(
      /<w:t[ >]|<w:br[ >]|<w:headerReference|<w:footerReference/
    );
  });

test('typing a greeting into an initially empty name placeholder takes ownership of that field', async ({
  page
}) => {
  await page.locator('#template').selectOption({ index: 1 });
  const text = await page.locator('#message').inputValue();
  await page.locator('#message').fill(text.replace('Dear ,', 'Dear friends,'));
  await page.locator('#names').fill('Alex');
  await page.locator('#update-recipient').click();
  expect(await page.locator('#message').inputValue()).toContain(
    'Dear friends,'
  );
  expect(await page.locator('#message').inputValue()).not.toContain(
    'Alexfriends'
  );
});

for (const oldPanel of ['top', 'bottom'])
  test(`obsolete ${oldPanel} preference is removed without losing templates or handwriting settings`, async ({
    page
  }) => {
    const before = await page.evaluate((panel) => {
      const data = JSON.parse(localStorage.getItem('bouma.cards.v1'));
      data.preferences = {
        font: 'Homemade Apple',
        size: 20,
        ink: '#123456',
        letter: 1,
        word: 2,
        x: 2,
        y: -2,
        panel
      };
      data.templates = data.templates.slice(0, 1);
      data.templates[0].name = 'My retained template';
      localStorage.setItem('bouma.cards.v1', JSON.stringify(data));
      return data;
    }, oldPanel);
    await page.reload();
    await expect(page.locator('#panel')).toHaveCount(0);
    expect(
      await page
        .locator('#render')
        .evaluate((el) => parseFloat(getComputedStyle(el).top))
    ).toBeCloseTo((5.5 - 2 / 25.4) * 96, 2);
    const after = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('bouma.cards.v1'))
    );
    expect(after.templates).toEqual(before.templates);
    const { panel, ...preferences } = before.preferences;
    expect(after.preferences).toEqual(preferences);
    await page.locator('summary').click();
    for (const [key, value] of Object.entries(preferences))
      await expect(page.locator('#' + key)).toHaveValue(String(value));
    await page.reload();
    expect(await page.locator('#template option').count()).toBe(2);
    await page.locator('#message').fill('A lower-panel note.');
    const { xml } = unzip(await word(page));
    const y = Number(xml.match(/<wp:positionV[^>]*>.*?<wp:posOffset>(\d+)/)[1]);
    expect(y).toBe(Math.round((5.5 - 2 / 25.4) * 914400));
  });
