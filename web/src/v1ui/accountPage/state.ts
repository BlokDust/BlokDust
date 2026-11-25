// The account page's state: who is signed in, the view, and the codes waiting.
import type { AccountHost, AccountInfo } from '../patches/hosts.ts';
import type { SignedInApp } from '../../account/client.ts';
import type { DeviceCode } from '../../account/device.ts';
import { COPY } from './copy.ts';

export abstract class AccountPageState {
  protected abstract submit(): Promise<void>;
  Account: AccountInfo | null | undefined = undefined;
  View: 'main' | 'create' | 'name' | 'delete' | 'methods' | 'code' | 'approve' = 'main';
  /** The plugin's code waiting for approval (SHARING-0011). */
  Device: DeviceCode | null = null;
  /** The website: plugins signed in to this account (SIGN-IN METHODS). */
  Apps: SignedInApp[] = [];
  /** The website: a plugin's code to approve, and what it calls itself once known. */
  ApproveCode: string | null = null;
  ApproveName: string | null = null;
  protected pollTimer: ReturnType<typeof setTimeout> | undefined;
  Busy = false;
  Message = '';
  protected google = false;
  protected apple = false;
  protected noBackend = false;
  protected roll: Record<string, boolean> = {};
  protected readonly field = document.getElementById('accountHandle')!;
  protected readonly input = document.getElementById('accountHandleInput') as HTMLInputElement;
  /** Called when who is signed in changes (the tab's name, the signed-in mark on the stage). */
  onChange: () => void = () => {};

  constructor(
    protected readonly host: AccountHost,
    protected readonly ctx: () => CanvasRenderingContext2D,
  ) {
    this.input.addEventListener('input', () => {
      this.input.value = this.input.value
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20);
      if (this.Message !== COPY.noPasskey) this.Message = '';
    });
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.input.blur();
        void this.submit();
      }
    });
  }

  /** Back from Google or Apple having added it, or refused because it belongs to another account (R7a, R7b). */
  showMethods(message: string): void {
    this.View = 'methods';
    this.Message = message;
    void this.loadApps();
    this.mark();
  }
  /** The website, opened at a plugin's code (`?link=CODE`, SHARING-0011): ask to approve it (signed
   * out: sign in first; the code waits). */
  showApprove(code: string): void {
    this.ApproveCode = code || null;
    this.ApproveName = null;
    this.Message = '';
    this.View = 'approve';
    if (!code) {
      this.input.value = '';
      setTimeout(() => {
        this.input.focus();
      }, 0);
    }
    void this.lookUpCode();
    this.mark();
  }
  protected async lookUpCode(): Promise<void> {
    const approveCode = this.ApproveCode,
      apps = this.host.apps;
    if (!approveCode || !apps || !this.Account) return;
    try {
      this.ApproveName = (await apps.info(approveCode)).name;
    } catch (error) {
      this.Message = (error as Error).message;
      this.ApproveCode = null;
    }
    this.mark();
  }
  protected async loadApps(): Promise<void> {
    if (!this.host.apps || !this.Account) {
      this.Apps = [];
      return;
    }
    try {
      this.Apps = await this.host.apps.list();
    } catch {
      this.Apps = [];
    }
    this.mark();
  }
  /** Back from Google or Apple when this network has made its new accounts for the day (R1b): say so. */
  refused(message: string): void {
    this.View = 'main';
    this.Message = message;
    this.mark();
  }
  /** The Settings tab's name: SIGN IN until signed in. */
  get tabName(): string {
    return this.Account ? 'account' : 'sign in';
  }
  get animating(): boolean {
    return (
      this.Busy ||
      this.Account === undefined ||
      this.View === 'code' ||
      (this.View === 'approve' && !!this.ApproveCode && !this.ApproveName) ||
      performance.now() < this.settle
    );
  }
  /** Keep drawing a moment after something async lands, so its last state is drawn. */
  protected settle = 0;
  protected mark(): void {
    this.settle = performance.now() + 300;
  }

  /** Ask who is signed in (opening the tab, and after any change); `stats` with the account's stats
   * (R15: only for the tab, so loading the page asks for less). */
  async refresh(stats = true): Promise<void> {
    const m = await this.host.me(stats);
    const before = this.Account?.handle ?? null,
      was = this.Account;
    this.noBackend = !m;
    this.google = !!m?.google;
    this.apple = !!m?.apple;
    this.Account = m?.user ?? null;
    // Without stats asked for, keep the ones already shown for the same account.
    if (this.Account && !this.Account.stats && was?.stats && was.handle === this.Account.handle)
      this.Account.stats = was.stats;
    // A new Google account has no name yet: ask for one (SPEC-SHARING-ACCOUNTS R6).
    if (this.Account && !this.Account.handle && this.View === 'main') {
      this.View = 'name';
      this.input.value = '';
    }
    if (!this.Account && this.View !== 'create' && this.View !== 'code' && this.View !== 'approve')
      this.View = 'main';
    if (this.View === 'approve' && this.Account && this.ApproveCode && !this.ApproveName)
      void this.lookUpCode();
    // SIGN-IN METHODS' APPS SIGNED IN, ready before it opens (owner, 2026-11-19: it jumped as the
    // list arrived): it comes with the stats, in the one request (R15).
    if (this.Account?.apps) this.Apps = this.Account.apps;
    if (was === undefined || (this.Account?.handle ?? null) !== before || !!was !== !!this.Account)
      this.onChange();
    this.mark();
  }
}
