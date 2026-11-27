//-----------------------------------------------------------------------------------------
// HTML helpers for Viewer UI
//-----------------------------------------------------------------------------------------
//
// Anything that did not come from this codebase (URL parameters, input
// fields, log data and records from the API) must go through escapeHtml
// before it is put into innerHTML or into a snackbar text (the shared
// snackbar renders its text as HTML).

const htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;'
};

export function escapeHtml(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).replace(/[&<>"']/gu, character => htmlEscapes[character]);
}
