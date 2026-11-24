// Sign in with Google: OpenID Connect authorisation code flow with PKCE, via Arctic (SPEC-SHARING-ACCOUNTS R2a,
// SHARING-0008). Only Google's stable subject id is kept: no email, no name, no picture. The ID token comes straight
// from Google's token endpoint over TLS, so its signature need not be checked (OIDC Core 3.1.3.7); its issuer,
// audience and expiry are.
import {
  CodeChallengeMethod,
  OAuth2Client,
  decodeIdToken,
  generateCodeVerifier,
  generateState,
} from 'arctic';
import type { Env } from '../env.ts';
import { HttpError, publicBase } from '../http.ts';
import { cookie, readCookie } from './session.ts';
import { finishSignIn, safeReturn } from './oauth.ts';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

const client = (env: Env, req: Request) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)
    throw new HttpError(503, 'Google sign-in is not configured');
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${publicBase(env, req)}/api/auth/google/callback`,
  );
};

/** GET /api/auth/google/start?return=/… */
export function googleStart(env: Env, req: Request, url: URL): Response {
  const state = generateState(),
    verifier = generateCodeVerifier(),
    back = safeReturn(url.searchParams.get('return'));
  const to = client(env, req).createAuthorizationURLWithPKCE(
    env.GOOGLE_AUTH_URL || AUTH_URL,
    state,
    CodeChallengeMethod.S256,
    verifier,
    ['openid'],
  );
  const headers = new Headers({ location: to.toString(), 'cache-control': 'no-store' });
  headers.append(
    'set-cookie',
    cookie(req, 'bd_oauth', `${state}.${verifier}.${encodeURIComponent(back)}`, 600),
  );
  return new Response(null, { status: 302, headers });
}

/** GET /api/auth/google/callback?code&state — signs in (a new account if this Google account is new here). */
export async function googleCallback(env: Env, req: Request, url: URL): Promise<Response> {
  const [state, verifier, back] = (readCookie(req, 'bd_oauth') ?? '').split('.');
  const code = url.searchParams.get('code');
  if (!state || !verifier || !code || url.searchParams.get('state') !== state)
    throw new HttpError(400, 'sign-in expired or was not started here; try again');
  let claims: { iss?: string; aud?: string | string[]; sub?: string; exp?: number };
  try {
    const tokens = await client(env, req).validateAuthorizationCode(
      env.GOOGLE_TOKEN_URL || TOKEN_URL,
      code,
      verifier,
    );
    claims = decodeIdToken(tokens.idToken()) as typeof claims;
  } catch {
    throw new HttpError(401, 'Google did not confirm the sign-in');
  }
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const issuers = env.GOOGLE_ISSUER ? [env.GOOGLE_ISSUER] : ISSUERS;
  if (
    !claims.sub ||
    !issuers.includes(claims.iss ?? '') ||
    !aud.includes(env.GOOGLE_CLIENT_ID) ||
    !claims.exp ||
    claims.exp * 1000 < Date.now()
  )
    throw new HttpError(401, 'Google sign-in could not be verified');

  return finishSignIn(env, req, 'google', claims.sub, back);
}
