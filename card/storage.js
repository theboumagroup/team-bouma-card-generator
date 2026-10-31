const KEY = 'bouma.cards.v1';
const examples = [
  [
    'Buyer Closing',
    'Dear {first_names},\n\nCongratulations on your new home! Thank you for trusting me to guide you through your purchase. Wishing you many happy memories in your new space.\n\nMike'
  ],
  [
    'Seller Closing',
    'Dear {first_names},\n\nThank you so much for trusting me to help with the sale of your home. It was a pleasure working with you, and I wish you all the best in your next chapter!\n\nMike'
  ],
  [
    'Referral Thank You',
    'Dear {first_names},\n\nThank you for your thoughtful referral. Your confidence and support mean so much to me. I truly appreciate you thinking of me!\n\nMike'
  ],
  [
    'General Thank You',
    'Dear {first_names},\n\nThank you for your kindness and support. It is a pleasure knowing you, and I look forward to staying in touch.\n\nMike'
  ]
];
export function validateTemplates(value) {
  if (!Array.isArray(value) || value.length > 200)
    throw Error('Import must contain up to 200 templates.');
  return value.map((t) => {
    if (
      !t ||
      typeof t.name !== 'string' ||
      !t.name.trim() ||
      t.name.length > 100 ||
      typeof t.message !== 'string' ||
      !t.message.trim() ||
      t.message.length > 10000
    )
      throw Error(
        'Each template needs a name (1–100 characters) and message (1–10,000 characters).'
      );
    return { id: crypto.randomUUID(), name: t.name.trim(), message: t.message };
  });
}
export function load() {
  const raw = localStorage.getItem(KEY);
  if (raw === null)
    return {
      templates: examples.map(([name, message]) => ({
        id: crypto.randomUUID(),
        name: `Example: ${name}`,
        message
      })),
      preferences: {}
    };
  const data = JSON.parse(raw);
  if (
    data.version !== 1 ||
    !Array.isArray(data.templates) ||
    !data.preferences ||
    typeof data.preferences !== 'object'
  )
    throw Error(
      'Saved data could not be read. Export a backup before resetting browser data.'
    );
  validateTemplates(data.templates);
  return { templates: data.templates, preferences: data.preferences };
}
export function save(state) {
  localStorage.setItem(KEY, JSON.stringify({ version: 1, ...state }));
}
export function importTemplates(text) {
  if (text.length > 2000000)
    throw Error('Import file is too large (maximum 2 MB).');
  const data = JSON.parse(text);
  if (data.version !== 1) throw Error('Unsupported template file version.');
  return validateTemplates(data.templates);
}
export function personalize(message, recipient) {
  return message
    .replace(/\{first_names\}/g, () => recipient.firstNames)
    .replace(/\{address\}/g, () => recipient.address);
}
