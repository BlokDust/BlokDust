// Signing in, out and up, plugin codes, and the account's actions.
import { COPY } from './copy.ts';
import { AccountPageDraw } from './draw.ts';

export abstract class AccountPageFlows extends AccountPageDraw {
  /** CONTINUE WITH PASSKEY: sign in with the device's, else make an account with a new one (R1,
   * R2); a closed dialog and no passkey look the same, so both reach the name step, with BACK. */
  protected async continueWithPasskey(): Promise<void> {
    this.Busy = true;
    this.Message = '';
    try {
      await this.host.signIn();
      this.View = this.ApproveCode ? 'approve' : 'main';
      await this.refresh();
    } catch (error) {
      if (this.host.cancelled(error) || (error as { status?: number }).status === 401) {
        this.View = 'create';
        this.Message = COPY.noPasskey;
        this.input.value = '';
        setTimeout(() => {
          this.input.focus();
        }, 0);
      } else this.Message = (error as Error).message || 'That did not work. Try again.';
    } finally {
      this.Busy = false;
      this.mark();
    }
  }
  /** The iPad app: Apple or a passkey, natively; a new Apple account then picks its name. */
  protected async nativeSignIn(kind: 'apple' | 'passkey'): Promise<void> {
    const plug = this.host.plugin,
      native = plug?.native;
    if (!plug || !native) throw new Error('BlokDust: no native sign-in here');
    this.Busy = true;
    this.Message = '';
    try {
      const answer = await (kind === 'apple' ? native.apple() : native.passkey());
      plug.keep(answer.key, answer.user.handle);
      this.View = 'main';
      await this.refresh();
    } catch (error) {
      if ((error as Error).name !== 'AbortError')
        this.Message =
          kind === 'passkey' && (error as { status?: number }).status === 401
            ? 'This passkey is not known here. Make an account on the website first, or sign in with your browser.'
            : (error as Error).message || 'That did not work. Try again.';
    } finally {
      this.Busy = false;
      this.mark();
    }
  }

  // ---- a plugin's code (SHARING-0011) ----
  protected deviceUntil = 0;
  protected async startCode(): Promise<void> {
    const plug = this.host.plugin;
    if (!plug) return;
    this.Busy = true;
    this.Message = '';
    try {
      this.Device = await plug.start();
      this.deviceUntil = Date.now() + this.Device.expiresIn * 1000;
      this.View = 'code';
      if (plug.canOpenBrowser) plug.open(this.Device.verifyUrl);
      this.schedulePoll(this.Device.interval);
    } catch (error) {
      this.Message =
        (error as { status?: number }).status === undefined
          ? 'BlokDust couldn’t be reached. Check your connection and try again.'
          : (error as Error).message;
    } finally {
      this.Busy = false;
      this.mark();
    }
  }
  protected schedulePoll(seconds: number): void {
    clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => void this.pollOnce(seconds), seconds * 1000);
  }
  protected stopCode(): void {
    clearTimeout(this.pollTimer);
    this.Device = null;
  }
  protected async pollOnce(interval: number): Promise<void> {
    const device = this.Device,
      plug = this.host.plugin;
    if (!device || !plug || this.View !== 'code') return;
    if (Date.now() > this.deviceUntil) {
      this.stopCode();
      this.View = 'main';
      this.Message = COPY.expired;
      this.mark();
      return;
    }
    let devicePoll: Awaited<ReturnType<typeof plug.poll>>;
    try {
      devicePoll = await plug.poll(device.deviceCode);
    } catch {
      this.schedulePoll(interval);
      return;
    } // offline a moment: keep asking until it expires
    if (this.Device !== device) return; // BACK meanwhile
    if (devicePoll.status === 'approved') {
      this.stopCode();
      this.View = 'main';
      plug.keep(devicePoll.key, devicePoll.user.handle);
      await this.refresh();
    } else if (devicePoll.status === 'pending') this.schedulePoll(interval);
    else if (devicePoll.status === 'slow_down') this.schedulePoll(interval + 5);
    else {
      this.stopCode();
      this.View = 'main';
      this.Message = devicePoll.status === 'denied' ? COPY.denied : COPY.expired;
    }
    this.mark();
  }
  /** The website: APPROVE or CANCEL a plugin's code. */
  protected async answer(yes: boolean): Promise<void> {
    const code = this.ApproveCode,
      apps = this.host.apps;
    if (!code || !apps || this.Busy) return;
    this.Busy = true;
    this.Message = '';
    try {
      const result = await apps.approve(code, yes);
      this.Message = yes ? COPY.approved(result.name) : COPY.turnedDown(result.name);
      this.ApproveCode = null;
      this.ApproveName = null;
      this.View = 'main';
    } catch (error) {
      this.Message = (error as Error).message || 'That did not work. Try again.';
    } finally {
      this.Busy = false;
      this.mark();
    }
  }

  /** `stay`: keep the page on show (SIGN-IN METHODS) rather than going back to the account. */
  protected async action(run: () => Promise<void>, stay = false): Promise<boolean> {
    this.Busy = true;
    this.Message = '';
    try {
      await run();
      if (!stay) this.View = 'main';
      await this.refresh();
      return true;
    } catch (error) {
      if (!this.host.cancelled(error))
        this.Message = (error as Error).message || 'That did not work. Try again.';
      return false;
    } finally {
      this.Busy = false;
      this.mark();
    }
  }
  protected async submit(): Promise<void> {
    const handle = this.input.value.trim().toLowerCase();
    if (!handle) {
      this.Message = 'Choose a name first.';
      return;
    }
    if (this.View === 'create') await this.action(() => this.host.signUp(handle));
    else if (this.View === 'name') await this.action(() => this.host.setHandle(handle));
  }
}
