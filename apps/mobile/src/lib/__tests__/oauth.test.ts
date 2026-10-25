import { sessionTokensFromUrl } from '../oauth';

jest.mock('../supabase', () => ({ supabase: {} }));

describe('sessionTokensFromUrl', () => {
  it('lee los tokens del fragmento que devuelve Supabase', () => {
    const r = sessionTokensFromUrl(
      'aurevix://auth-callback#access_token=a.b.c&refresh_token=r1&expires_in=3600&token_type=bearer',
    );
    expect(r).toEqual({ error: null, tokens: { access_token: 'a.b.c', refresh_token: 'r1' } });
  });

  it('devuelve el error si Google o Supabase lo rechazan', () => {
    const r = sessionTokensFromUrl(
      'aurevix://auth-callback?error=access_denied&error_description=Usuario+cancel%C3%B3',
    );
    expect(r.tokens).toBeNull();
    expect(r.error).toBe('Usuario canceló');
  });

  it('sin refresh_token no hay sesión', () => {
    expect(sessionTokensFromUrl('aurevix://auth-callback#access_token=x').tokens).toBeNull();
  });
});
