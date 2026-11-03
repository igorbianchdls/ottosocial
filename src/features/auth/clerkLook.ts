/** Clerk's card blends into the auth pages: no box of its own, the page already frames it. */
export const embedded = {
  elements: {
    rootBox: { width: '100%' },
    cardBox: { width: '100%', boxShadow: 'none', border: 0, borderRadius: 0 },
    card: { boxShadow: 'none', border: 0, background: 'transparent', padding: '0' },
    footer: { background: 'transparent' },
  },
}
