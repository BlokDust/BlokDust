// Accounts (CHG-0023), the public gallery (CHG-0024) and video export (CHG-0022) for v1's panels.
import * as account from '../../account/client.ts';
import * as gallery from '../../gallery/client.ts';
import { BLOCKS_BY_ID } from '../../generated/blocks.gen.ts';
import { editToken } from '../../patch/server.ts';
import { App } from '../../v1ui/shim.ts';
import { videoSeconds } from '../../video/length.ts';
import { canShareFile, downloadFile, shareFile } from '../../video/share.ts';
import { pluginAccountHost, refreshOwnership } from '../account/pluginAccount.ts';
import { AFTER_SIGN_IN, VIDEO_EXPORT, embedId, forgetLink, juce } from '../boot/page.ts';
import { model, tempo } from '../model/patchModel.ts';
import { openShared } from '../patchFiles/openPatch.ts';
import { backToSave } from '../share/signInReturn.ts';
import { accountPage } from '../stage/corners.ts';
import { wantLike } from '../stage/likes.ts';
import { makeVideoFile, videoLink, videoTitle } from '../video/videoExport.ts';
import { openAccountSettings, type SceneHostPart } from './hostParts.ts';
import { scene } from './scene.ts';

type AccountHost = SceneHostPart<'account' | 'gallery' | 'signedIn' | 'signInToSave' | 'video'>;
type WebAccount = NonNullable<AccountHost['account']>;

/** Signing in claims the patches this browser made (R9); then back to the stage, or to SAVE. */
function webAccount(): WebAccount {
  return {
    me: (stats) => account.me(stats),
    signUp: async (handle) => {
      await account.signUpWithPasskey(handle);
      await account.claimMine().catch(() => {});
      refreshOwnership();
      backToSave();
    },
    signIn: async () => {
      await account.signInWithPasskey();
      await account.claimMine().catch(() => {});
      refreshOwnership();
      if (accountPage()?.ApproveCode) return; // approving a plugin (SHARING-0011): the question stays
      scene.SettingsPanel.ClosePanel();
      backToSave();
    },
    google: () => account.signInWith('google'),
    apple: () => account.signInWith('apple'),
    addPasskey: () => account.addPasskey(),
    removeMethod: async (method) => {
      await account.removeMethod(method);
    },
    // A new Google or Apple account has its name now.
    setHandle: async (handle) => {
      await account.setHandle(handle);
      backToSave();
    },
    signOut: async (everywhere) => {
      await account.signOut(everywhere);
      refreshOwnership(true);
      scene.PatchesPanel.galleryKnown(null);
    },
    deleteAccount: async () => {
      await account.deleteAccount();
      refreshOwnership(true);
    },
    cancelled: (error) => account.cancelled(error),
    // The plugins signed in to this account, and a plugin's code to approve (SHARING-0011).
    apps: {
      list: () => account.listApps(),
      remove: async (id) => {
        await account.removeApp(id);
      },
      info: (code) => account.deviceInfo(code),
      approve: async (code, yes) => {
        const answer = await account.approveDevice(code, yes);
        forgetLink();
        return answer;
      },
    },
  };
}

const galleryHost = (): NonNullable<AccountHost['gallery']> => ({
  browse: async (sort, query, page) => {
    try {
      return await gallery.browse(sort, query, page);
    } catch (error) {
      if ((error as { status?: number }).status === undefined) return null;
      throw error;
    }
  },
  open: (row, mode) => openShared(row.id, mode),
  like: (row) => wantLike(row.id, row.liked, row.likes),
  unpublish: async (id) => {
    await gallery.unpublish(id, editToken(id));
    if (id === App.CompositionId) scene.PatchesPanel.galleryKnown(false);
  },
});

/** Web only (R16); hidden behind VIDEO_EXPORT until it gets its own work (owner, CHG-0035). */
const videoHost = (): NonNullable<AccountHost['video']> => ({
  make: (choice, progress, signal) => makeVideoFile(choice, progress, signal),
  // The share sheet where the browser can share files; elsewhere the file downloads.
  share: async (file) => {
    if (!canShareFile(file)) {
      downloadFile(file);
      return;
    }
    await shareFile(file, videoTitle(), `${videoTitle()} — made with BlokDust ${videoLink()}`);
  },
  canShareFiles: () => canShareFile(new File([''], 'video.mp4', { type: 'video/mp4' })),
  seconds: () =>
    videoSeconds(
      [...model.values()],
      tempo ?? 120,
      (type, key) => BLOCKS_BY_ID.get(type)?.params.find((param) => param.key === key)?.default,
    ),
});

export function accountHost(): AccountHost {
  return {
    gallery: embedId ? null : galleryHost(),
    signedIn: () => !!accountPage()?.Account,
    // SAVE / SHARE › SIGN IN (CHG-0035): Settings › SIGN IN, then back to SAVE (backToSave).
    signInToSave: (title) => {
      try {
        sessionStorage.setItem(
          AFTER_SIGN_IN,
          JSON.stringify({ to: 'save', title, at: Date.now() }),
        );
      } catch {
        /* private window: no way back */
      }
      openAccountSettings();
    },
    // The plugins sign in with their own key: a code approved on the website (SHARING-0011).
    account: embedId ? null : juce ? pluginAccountHost(juce) : webAccount(),
    video: juce || embedId || !VIDEO_EXPORT ? null : videoHost(),
  };
}
