import { ok } from '@/features/apikeys/v1'

/** What the API offers, for people and agents finding their way. No key needed. */
export function GET() {
  return ok({
    nome: 'API do OttoSocial',
    versao: 'v1',
    autenticacao: 'Envie a chave de API (Configurações → Chaves de API) no cabeçalho "Authorization: Bearer otto_sk_…".',
    rotas: [
      { metodo: 'GET', caminho: '/api/v1/eu', permissao: 'qualquer', descricao: 'A chave, o workspace e as permissões.' },
      { metodo: 'GET', caminho: '/api/v1/conectores', permissao: 'ler', descricao: 'Todos os conectores e se estão conectados.' },
      { metodo: 'GET', caminho: '/api/v1/conectores/{id}', permissao: 'ler', descricao: 'Um conector: o que faz, status e conta.' },
      { metodo: 'GET', caminho: '/api/v1/conectores/{id}/acoes?busca=', permissao: 'ler', descricao: 'Ações disponíveis no serviço e os argumentos de cada uma.' },
      { metodo: 'POST', caminho: '/api/v1/conectores/{id}/conectar', permissao: 'conectar', descricao: 'Gera o link de login. Uma pessoa precisa abrir e autorizar.' },
      { metodo: 'POST', caminho: '/api/v1/conectores/{id}/desconectar', permissao: 'conectar', descricao: 'Desconecta o serviço do workspace.' },
      { metodo: 'POST', caminho: '/api/v1/conectores/{id}/executar', permissao: 'usar', descricao: 'Executa uma ação. Corpo: { "acao": "SLUG_DA_ACAO", "argumentos": { … } }.' },
    ],
  })
}
