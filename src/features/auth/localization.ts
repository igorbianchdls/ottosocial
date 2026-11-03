import { ptBR } from '@clerk/localizations'

// Clerk says "organização"; in OttoSocial it is a "workspace" (masculine), so the words around it change too.
const rules: [RegExp, string][] = [
  // Whole phrases first, then article + noun, then the noun alone.
  [/Nenhuma organização selecionada/g, 'Nenhum workspace selecionado'], [/Criar nova organização/g, 'Criar novo workspace'],
  [/A organização foi atualizada/g, 'O workspace foi atualizado'], [/Minha organização/g, 'Meu workspace'], [/minha-organizacao/g, 'meu-workspace'],
  [/Organização não encontrada ou não autorizada/g, 'Workspace não encontrado ou não autorizado'], [/crie uma nova/g, 'crie um novo'],
  [/da sua organização/g, 'do seu workspace'], [/sua organização/g, 'seu workspace'],
  [/desta organização/g, 'deste workspace'], [/esta organização/g, 'este workspace'],
  [/da [Oo]rganização/g, 'do workspace'], [/à organização/g, 'ao workspace'],
  [/Uma organização/g, 'Um workspace'], [/uma organização/g, 'um workspace'],
  [/(?<![\p{L}])a organização/gu, 'o workspace'],
  [/Organizações/g, 'Workspaces'], [/organizações/g, 'workspaces'], [/Organização/g, 'Workspace'], [/organização/g, 'workspace'],
]
const fix = (v: string) => rules.reduce((s, [re, to]) => s.replace(re, to), v)

function walk<T>(o: T): T {
  if (typeof o === 'string') return fix(o) as T
  if (!o || typeof o !== 'object') return o
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)])) as T
}

/** Clerk's Portuguese texts with "workspace" in place of "organização". */
export const clerkPtBR = walk(ptBR)
