import { workingCopy, trackEdit, updateRecipient } from './personalization.js';
import { load, save, validateTemplates, importTemplates } from './storage.js';
import {
  WIDTH,
  HEIGHT,
  SCALE,
  wordBlob,
  download,
  filename,
  imagePosition
} from './export.js';
const $ = (id) => document.getElementById(id);
const defaults = {
  font: 'Caveat',
  size: 18,
  ink: '#163b69',
  letter: 0,
  word: 0,
  x: 0,
  y: 0
};
let state,
  storageHealthy = true;
function status(text) {
  $('status').textContent = text;
}
try {
  state = load();
  save(state);
} catch (e) {
  storageHealthy = false;
  state = { templates: [], preferences: {} };
  status(
    `Local storage unavailable: ${e.message} Card generation still works; templates and preferences cannot be saved.`
  );
}
function persist(next) {
  if (!storageHealthy)
    throw Error(
      'Local storage is unavailable. Back up your templates before clearing browser data.'
    );
  save(next);
  state = next;
}
const settings = { ...defaults };
for (const key in defaults) {
  const v = state.preferences[key];
  if (v !== undefined) settings[key] = v;
}
function readSettings() {
  const s = {};
  for (const key in defaults) s[key] = $(key).value;
  for (const [key, min, max] of [
    ['size', 10, 36],
    ['letter', -2, 8],
    ['word', 0, 16],
    ['x', -6, 6],
    ['y', -6, 6]
  ]) {
    s[key] = Number(s[key]);
    if (!Number.isFinite(s[key]) || s[key] < min || s[key] > max)
      throw Error(`Check ${key}: value must be ${min} to ${max}.`);
  }
  if (
    !/^#[0-9a-f]{6}$/i.test(s.ink) ||
    !['Caveat', 'Homemade Apple', 'Liu Jian Mao Cao', 'Session font'].includes(
      s.font
    )
  )
    throw Error('Choose valid handwriting settings.');
  return s;
}
for (const key in defaults) {
  $(key).value = settings[key];
  if (!$(key).value) $(key).value = defaults[key];
}
let selected = '',
  workingDirty = false,
  base = '',
  managerId = '',
  managerDirty = false;
let copy = { text: '', fields: [] };
const recipient = () => ({
  firstNames: $('names').value,
  address: $('address').value
});
function renderOptions() {
  for (const id of ['template', 'managed-template']) {
    const el = $(id);
    el.replaceChildren(
      new Option(id === 'template' ? 'Custom message' : 'New template', '')
    );
    for (const t of state.templates) el.add(new Option(t.name, t.id));
  }
  $('template').value = selected;
  $('managed-template').value = managerId;
}
function updatePreview() {
  try {
    const s = readSettings(),
      p = imagePosition(s),
      el = $('handwriting');
    el.textContent = $('message').value;
    Object.assign(el.style, {
      fontFamily: `"${s.font}"`,
      fontSize: `${(s.size * 96) / 72}px`,
      color: s.ink,
      letterSpacing: `${s.letter}px`,
      wordSpacing: `${s.word}px`
    });
    Object.assign($('render').style, {
      left: `${p.x * 96}px`,
      top: `${p.y * 96}px`
    });
    const scale = ($('sheet').parentElement.clientWidth - 32) / 672;
    $('sheet').style.transform = `scale(${scale})`;
    $('sheet').parentElement.style.height = `${960 * scale + 32}px`;
  } catch (e) {
    status(e.message);
  }
}
new ResizeObserver(updatePreview).observe($('sheet').parentElement);
function applyTemplate(id) {
  selected = id;
  base = state.templates.find((t) => t.id === id)?.message || '';
  copy = workingCopy(base, recipient());
  $('message').value = copy.text;
  workingDirty = false;
  updatePreview();
}
$('template').addEventListener('change', () => {
  if (
    workingDirty &&
    !confirm('Replace your one-off message edits with this template?')
  ) {
    $('template').value = selected;
    return;
  }
  applyTemplate($('template').value);
});
$('message').addEventListener('input', () => {
  workingDirty = true;
  copy = trackEdit(copy, $('message').value);
  updatePreview();
});
for (const id of ['names', 'address'])
  $(id).addEventListener('input', () => {
    if (!workingDirty) {
      copy = workingCopy(base, recipient());
      $('message').value = copy.text;
      updatePreview();
    } else
      status(
        'Recipient details changed. Your edits were kept. Use Update recipient in message to refresh untouched recipient fields.'
      );
  });

$('update-recipient').onclick = () => {
  copy = updateRecipient(copy, recipient());
  $('message').value = copy.text;
  updatePreview();
  status(
    copy.fields.length
      ? 'Recipient fields updated. Your other message edits and saved template were kept.'
      : 'No untouched recipient fields remain. Edit the greeting directly, or insert {first_names} or {address} and click Update recipient in message.'
  );
};
for (const key in defaults)
  $(key).addEventListener('input', () => {
    updatePreview();
    try {
      const prefs = readSettings();
      if (prefs.font === 'Session font') prefs.font = defaults.font;
      persist({ ...state, preferences: prefs });
    } catch (e) {
      status(e.message);
    }
  });
$('font-file').addEventListener('change', async () => {
  try {
    const file = $('font-file').files[0];
    if (!file) return;
    if (file.size > 10000000) throw Error('Font file must be under 10 MB.');
    const font = new FontFace('Session font', await file.arrayBuffer());
    await font.load();
    document.fonts.add(font);
    if (![...$('font').options].some((o) => o.value === 'Session font'))
      $('font').add(new Option('Session font', 'Session font'));
    $('font').value = 'Session font';
    updatePreview();
    status('Custom font loaded for this session.');
  } catch (e) {
    status(`Font could not be loaded: ${e.message}`);
  }
});
function editorLoad(id) {
  managerId = id;
  const t = state.templates.find((t) => t.id === id);
  $('template-name').value = t?.name || '';
  $('template-message').value = t?.message || '';
  $('managed-template').value = id;
  managerDirty = false;
}
function discardTemplate() {
  return !managerDirty || confirm('Discard unsaved template changes?');
}
$('manage').onclick = () => {
  editorLoad(selected);
  $('manager').showModal();
};
$('manager').addEventListener('cancel', (e) => {
  if (!discardTemplate()) e.preventDefault();
});
$('manager')
  .querySelector('form')
  .addEventListener('submit', (e) => {
    if (!discardTemplate()) e.preventDefault();
  });
for (const id of ['template-name', 'template-message'])
  $(id).oninput = () => {
    managerDirty = true;
  };
$('managed-template').onchange = () => {
  if (discardTemplate()) editorLoad($('managed-template').value);
  else $('managed-template').value = managerId;
};
$('new-template').onclick = () => {
  if (discardTemplate()) editorLoad('');
};
function templateError(e) {
  $('template-status').textContent = e.message;
}
$('save-template').onclick = () => {
  try {
    const [validated] = validateTemplates([
      { name: $('template-name').value, message: $('template-message').value }
    ]);
    const t = { ...validated, id: managerId || validated.id };
    const templates = state.templates.filter((x) => x.id !== t.id);
    if (templates.length >= 200)
      throw Error(
        'Maximum 200 templates. Export a backup before removing templates.'
      );
    templates.push(t);
    persist({ ...state, templates });
    managerId = t.id;
    renderOptions();
    editorLoad(t.id);
    $('template-status').textContent =
      'Template saved. Your working card is unchanged.';
  } catch (e) {
    templateError(e);
  }
};
$('delete-template').onclick = () => {
  if (!managerId) return;
  if (
    !confirm(
      'Delete this saved template? Export a backup first if you may need it again.'
    )
  )
    return;
  try {
    persist({
      ...state,
      templates: state.templates.filter((t) => t.id !== managerId)
    });
    if (selected === managerId) {
      selected = '';
      $('template').value = '';
    }
    managerId = '';
    renderOptions();
    editorLoad('');
    $('template-status').textContent =
      'Template deleted. Your working card is unchanged.';
  } catch (e) {
    templateError(e);
  }
};
$('backup-templates').onclick = $('export-templates').onclick = () =>
  download(
    new Blob(
      [JSON.stringify({ version: 1, templates: state.templates }, null, 2)],
      { type: 'application/json' }
    ),
    'Team Bouma Templates.json'
  );
$('import-templates').onchange = async () => {
  try {
    const file = $('import-templates').files[0];
    if (!file) return;
    if (file.size > 2000000)
      throw Error('Import file is too large (maximum 2 MB).');
    const added = importTemplates(await file.text());
    if (state.templates.length + added.length > 200)
      throw Error(
        'Import would exceed 200 templates. Existing templates were kept.'
      );
    persist({ ...state, templates: [...state.templates, ...added] });
    renderOptions();
    $(
      'template-status'
    ).textContent = `Imported ${added.length} templates as new copies. Existing templates were kept.`;
  } catch (e) {
    templateError(e);
  } finally {
    $('import-templates').value = '';
  }
};
async function capture(calibration) {
  const s = readSettings();
  await document.fonts.load(`${s.size}pt "${s.font}"`);
  await document.fonts.ready;
  if (!calibration) {
    if (!$('message').value.trim())
      throw Error('Enter a message before generating a card.');
    const unresolved = $('message').value.match(/\{[^{}]+\}/g);
    if (unresolved)
      throw Error(
        `Resolve placeholders before exporting: ${[...new Set(unresolved)].join(
          ', '
        )}`
      );
    const text = $('handwriting');
    if (text.scrollHeight > HEIGHT || text.scrollWidth > WIDTH)
      throw Error(
        'This message does not fit. Shorten it, reduce font size, or adjust spacing. No document was generated.'
      );
  }
  const clone = $('render').cloneNode(true);
  clone.removeAttribute('id');
  Object.assign(clone.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    zIndex: '-1',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: `${WIDTH}px`,
    height: `${HEIGHT}px`
  });
  if (calibration) {
    clone.replaceChildren();
    const text = document.createElement('div');
    Object.assign(text.style, {
      font: '20px Arial',
      width: '100%',
      height: '100%',
      border: '2px solid black',
      padding: '24px',
      color: 'black'
    });
    text.textContent = `TEAM BOUMA — LOWER PANEL\n↑ TOP OF SHEET\n7 × 10 inch portrait sheet\nFold at 5 inches\nPrint Actual Size / 100%\n6 × 4 inch inner rectangle\nOffset: ${s.x} mm horizontal, ${s.y} mm vertical`;
    text.style.whiteSpace = 'pre-wrap';
    clone.append(text);
  }
  document.body.append(clone);
  try {
    return await window.html2canvas(clone, {
      scale: SCALE,
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: null,
      scrollX: 0,
      scrollY: 0
    });
  } finally {
    clone.remove();
  }
}
async function generate(calibration = false) {
  $('generate').disabled = true;
  $('calibrate').disabled = true;
  try {
    const canvas = await capture(calibration);
    download(
      await wordBlob(canvas, readSettings()),
      calibration
        ? 'Team Bouma Calibration.docx'
        : filename(recipient().firstNames)
    );
    status(
      calibration
        ? 'Calibration downloaded. Use plain paper first. Mark the feed edge and confirm the lower-panel feed orientation at Actual Size / 100%.'
        : 'Word document downloaded. Print at Actual Size / 100%; confirm 7 × 10 inch portrait paper in Word and the printer driver.'
    );
  } catch (e) {
    status(e.message);
  } finally {
    $('generate').disabled = false;
    $('calibrate').disabled = false;
  }
}
$('generate').onclick = () => generate();
$('calibrate').onclick = () => generate(true);
window.addEventListener('beforeunload', (e) => {
  if (workingDirty || managerDirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
renderOptions();
updatePreview();
