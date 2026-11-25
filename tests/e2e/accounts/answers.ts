// The API's JSON answers as the account tests read them (SPEC-SHARING-ACCOUNTS). Each endpoint
// fills some of these fields, so all are optional; the tests check the ones their endpoint sends.
import type { Account, AccountPatch, SignedInApp } from '../../../web/src/account/client.ts';

export interface ApiAnswer {
  error?: string;
  user?: Account | null;
  google?: boolean;
  apple?: boolean;
  /** A saved patch, a sign-in challenge or a device code. */
  id?: string;
  rev?: number;
  mine?: boolean;
  parent?: string | null;
  patches?: AccountPatch[];
  claimed?: string[];
  apps?: SignedInApp[];
  /** App and plugin sign-in: the key, and whether the account is new. */
  key?: string;
  fresh?: boolean;
  nonce?: string;
  rpId?: string;
  options?: { challenge: string };
  /** The device-code flow (SHARING-0011). */
  userCode?: string;
  deviceCode?: string;
  verifyUrl?: string;
  interval?: number;
  status?: string;
  name?: string;
  approved?: boolean;
  webcredentials?: { apps?: string[] };
}
