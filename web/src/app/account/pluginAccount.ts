// The plugins' account (SHARING-0011) and the iPad app's native sign-in.
import { appKey, setAppKey } from '../../account/appKey.ts';
import * as account from '../../account/client.ts';
import { startDevice, pollDevice, appPost } from '../../account/device.ts';
import { App } from '../../v1ui/shim.ts';
import { type JuceBackend, accountOwnedClear, juce, sessionFor } from '../boot/page.ts';
import { setShareLink, shareLink } from '../model/unsavedChanges.ts';
import { scene } from '../scene/scene.ts';
import { checkOwnDirty } from '../share/ownLink.ts';

/** The plugins' account (SHARING-0011): signed in with a key the plugin keeps (bd_account / bd_accountSave). */
export function pluginAccountHost(j: JuceBackend): import('../../v1ui/patches.ts').AccountHost {
  const none = async () => {};
  return {
    me: async (stats) =>
      appKey() ? account.me(stats) : { user: null, google: false, apple: false },
    signUp: none,
    signIn: none,
    google: () => {},
    apple: () => {},
    addPasskey: none,
    removeMethod: none,
    deleteAccount: none,
    setHandle: async (h) => {
      await account.setHandle(h);
    },
    signOut: async () => {
      await account.signOut(false).catch(() => {}); // its key goes on the server (offline: it is forgotten here anyway)
      j.emitEvent('bd_accountClear', {});
      setAppKey(null);
      refreshOwnership(true);
      scene.PatchesPanel.galleryKnown(null);
    },
    cancelled: (e) => (e as Error).name === 'AbortError',
    plugin: {
      get canOpenBrowser() {
        return pluginBrowser;
      },
      start: () => startDevice(pluginName),
      poll: (code) => pollDevice(code),
      open: (url) => j.emitEvent('bd_openUrl', { url }),
      // Signed in: back to the stage, whose corner says who (owner, 2026-11-19); a new account names itself first.
      keep: (key, handle) => {
        setAppKey(key);
        j.emitEvent('bd_accountSave', { key, handle: handle ?? '' });
        refreshOwnership();
        if (handle) (scene.SettingsPanel as any).ClosePanel();
      },
      // The iPad app (SHARING-0011): Apple and passkeys through the system; the server gives the key.
      get native() {
        return pluginNative ? nativeSignIn : undefined;
      },
    },
  };
}

/** What this plugin calls itself on the website, whether it can open a browser, and whether it signs in natively
 * (the iPad app; from bd_account). */
export let pluginName = 'BlokDust',
  pluginBrowser = true,
  pluginNative = false;

/** The iPad app's answer from the system's sign-in sheet (bd_nativeAppleDone / bd_nativePasskeyDone). */
export let nativeAnswer: ((v: Record<string, string | boolean>) => void) | null = null;

export const askNative = (event: string, body: object) =>
  new Promise<Record<string, string | boolean>>((resolve) => {
    nativeAnswer = resolve;
    juce?.emitEvent(event, body);
  });

export const nativeFailed = (r: Record<string, string | boolean>) =>
  Object.assign(new Error(String(r.error ?? 'That did not work. Try again.')), {
    name: r.cancelled ? 'AbortError' : 'Error',
  });

export let nativeSignIn!: {
  apple: () => Promise<{ key: string; user: { handle: string | null }; fresh?: boolean }>;
  passkey: () => Promise<{ key: string; user: { handle: string | null } }>;
};

/** After signing in or out: whether this device may save over the open composition (R9). */
export function refreshOwnership(out = false): void {
  if (out) accountOwnedClear();
  App.SessionId = sessionFor(App.CompositionId);
  if (shareLink) setShareLink({ ...shareLink, owned: !!App.SessionId });
  checkOwnDirty();
}

export function setNativeAnswer<Value extends typeof nativeAnswer>(value: Value): Value {
  nativeAnswer = value;
  return value;
}

export function setPluginName<Value extends typeof pluginName>(value: Value): Value {
  pluginName = value;
  return value;
}

export function setPluginBrowser<Value extends typeof pluginBrowser>(value: Value): Value {
  pluginBrowser = value;
  return value;
}

export function setPluginNative<Value extends typeof pluginNative>(value: Value): Value {
  pluginNative = value;
  return value;
}

export function init(): void {
  nativeSignIn = {
    apple: async () => {
      const n = await appPost<{ id: string; nonce: string }>('app/apple/nonce');
      const r = await askNative('bd_nativeApple', { nonce: n.nonce });
      if (typeof r.code !== 'string') throw nativeFailed(r);
      return appPost<{ key: string; user: { handle: string | null }; fresh?: boolean }>(
        'app/apple',
        { id: n.id, code: r.code, name: pluginName },
      );
    },
    passkey: async () => {
      const o = await appPost<{ id: string; rpId: string; options: { challenge: string } }>(
        'app/passkey/options',
      );
      const r = await askNative('bd_nativePasskey', {
        rpId: o.rpId,
        challenge: o.options.challenge,
      });
      if (typeof r.id !== 'string') throw nativeFailed(r);
      const response = {
        id: r.id,
        rawId: r.rawId,
        type: 'public-key',
        clientExtensionResults: {},
        authenticatorAttachment: 'platform',
        response: {
          clientDataJSON: r.clientDataJSON,
          authenticatorData: r.authenticatorData,
          signature: r.signature,
          ...(r.userHandle ? { userHandle: r.userHandle } : {}),
        },
      };
      return appPost<{ key: string; user: { handle: string | null } }>('app/passkey', {
        id: o.id,
        response,
        name: pluginName,
      });
    },
  };
}
