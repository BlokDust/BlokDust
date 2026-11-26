// The plugins' account (SHARING-0011): a key the plugin keeps (bd_account / bd_accountSave).
import type { AccountHost } from '../../v1ui/patches/hosts.ts';
import { appKey, setAppKey } from '../../account/appKey.ts';
import * as account from '../../account/client.ts';
import { pollDevice, startDevice } from '../../account/device.ts';
import { App } from '../../v1ui/shim.ts';
import { accountOwnedClear, sessionFor, type JuceBackend } from '../boot/page.ts';
import { setShareLink, shareLink } from '../model/unsavedChanges.ts';
import { scene } from '../scene/scene.ts';
import { checkOwnDirty } from '../share/ownLink.ts';
import { nativeSignIn } from './nativeSignIn.ts';

/** What this plugin calls itself on the website (from bd_account). */
export let pluginName = 'BlokDust';
/** It can open the user's browser (not an extension inside another iPad app). */
export let pluginBrowser = true;
/** It signs in through the system (the iPad app). */
export let pluginNative = false;

export function setPluginName(name: string): void {
  pluginName = name;
}
export function setPluginBrowser(canOpen: boolean): void {
  pluginBrowser = canOpen;
}
export function setPluginNative(native: boolean): void {
  pluginNative = native;
}

/** After signing in or out: whether this device may save over the open composition (R9). */
export function refreshOwnership(signedOut = false): void {
  if (signedOut) accountOwnedClear();
  App.SessionId = sessionFor(App.CompositionId);
  if (shareLink) setShareLink({ ...shareLink, owned: !!App.SessionId });
  checkOwnDirty();
}

const nothing = async () => {};

export function pluginAccountHost(plugin: JuceBackend): AccountHost {
  return {
    me: async (stats) =>
      appKey() ? account.me(stats) : { user: null, google: false, apple: false },
    signUp: nothing,
    signIn: nothing,
    google: () => {},
    apple: () => {},
    addPasskey: nothing,
    removeMethod: nothing,
    deleteAccount: nothing,
    setHandle: async (handle) => {
      await account.setHandle(handle);
    },
    signOut: async () => {
      // Its key goes on the server too (offline: it is forgotten here anyway).
      await account.signOut(false).catch(() => {});
      plugin.emitEvent('bd_accountClear', {});
      setAppKey(null);
      refreshOwnership(true);
      scene.PatchesPanel.galleryKnown(null);
    },
    cancelled: (error) => (error as Error).name === 'AbortError',
    plugin: {
      get canOpenBrowser() {
        return pluginBrowser;
      },
      start: () => startDevice(pluginName),
      poll: (code) => pollDevice(code),
      open: (url) => {
        plugin.emitEvent('bd_openUrl', { url });
      },
      // Back to the stage, whose corner says who; a new account names itself first.
      keep: (key, handle) => {
        setAppKey(key);
        plugin.emitEvent('bd_accountSave', { key, handle: handle ?? '' });
        refreshOwnership();
        if (handle) scene.SettingsPanel.ClosePanel();
      },
      get native() {
        return pluginNative ? nativeSignIn : undefined;
      },
    },
  };
}
