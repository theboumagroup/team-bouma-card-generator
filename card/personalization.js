// Track only placeholder-derived ranges, never arbitrary matching names in prose.
const tokens = /\{(first_names|address)\}/g;
const value = (key, recipient) =>
  key === 'first_names' ? recipient.firstNames : recipient.address;
export function workingCopy(source, recipient) {
  let text = '',
    end = 0;
  const fields = [];
  for (const match of source.matchAll(tokens)) {
    text += source.slice(end, match.index);
    const start = text.length;
    text += value(match[1], recipient);
    fields.push({ key: match[1], start, end: text.length });
    end = match.index + match[0].length;
  }
  return { text: text + source.slice(end), fields };
}
export function trackEdit(copy, text) {
  if (copy.text === text) return copy;
  let start = 0,
    tail = 0;
  while (
    start < copy.text.length &&
    start < text.length &&
    copy.text[start] === text[start]
  )
    start++;
  while (
    tail < copy.text.length - start &&
    tail < text.length - start &&
    copy.text[copy.text.length - tail - 1] === text[text.length - tail - 1]
  )
    tail++;
  const end = copy.text.length - tail,
    delta = text.length - copy.text.length;
  // If an edit touches a personalized field, stop managing that field.
  const fields = copy.fields.flatMap((f) => {
    if (f.start === f.end && f.start === start) return [];
    if (f.end <= start) return [f];
    if (f.start >= end)
      return [{ ...f, start: f.start + delta, end: f.end + delta }];
    return [];
  });
  return { text, fields };
}
export function updateRecipient(copy, recipient) {
  const fields = [...copy.fields];
  for (const match of copy.text.matchAll(tokens)) {
    if (!fields.some((f) => match.index >= f.start && match.index < f.end))
      fields.push({
        key: match[1],
        start: match.index,
        end: match.index + match[0].length
      });
  }
  fields.sort((a, b) => a.start - b.start);
  let text = '',
    end = 0;
  const updated = [];
  for (const f of fields) {
    text += copy.text.slice(end, f.start);
    const start = text.length;
    text += value(f.key, recipient);
    updated.push({ ...f, start, end: text.length });
    end = f.end;
  }
  return { text: text + copy.text.slice(end), fields: updated };
}
