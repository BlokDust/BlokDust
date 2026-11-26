// Arriving back from signing in (CHG-0023) or with a plugin's code to approve (SHARING-0011).
import * as account from '../../account/client.ts';
import { linkArrival, pendingLink } from '../boot/linkApproval.ts';
import { embedId, juce, params, signInReturn } from '../boot/page.ts';
import { accountSettings, openAccountSettings } from '../scene/hostParts.ts';
import { backToSave } from '../share/signInReturn.ts';
import { refreshOwnership } from './pluginAccount.ts';

const inSettings = (show: () => void) => {
  requestAnimationFrame(() => {
    openAccountSettings();
    show();
  });
};

/** Settings › ACCOUNT asks to approve the code (signed out: after signing in). */
function askToApproveLink(): void {
  const link = !juce && !embedId && signInReturn !== 'new' ? pendingLink() : null;
  if (link !== null && (linkArrival !== null || signInReturn))
    inSettings(() => accountSettings().accountPage?.showApprove(link));
}

/** Claim this browser's patches (R9), then show what happened; a reload doesn't do it again. */
function welcomeBack(returned: string): void {
  params.delete('account');
  history.replaceState(
    null,
    '',
    `${location.pathname}${params.size ? `?${params.toString()}` : ''}`,
  );
  void account
    .claimMine()
    .then(() => {
      refreshOwnership();
    })
    .catch(() => {});
  const linked = account.linkMessage(returned);
  // R7a, R7b: back on SIGN-IN METHODS, which says what happened.
  if (linked) inSettings(() => accountSettings().accountPage?.showMethods(linked));
  // A new account picks its name in Settings › ACCOUNT.
  else if (returned === 'new') inSettings(() => {});
  // Approving a plugin's code: askToApproveLink opens it.
  else if (pendingLink() !== null) return;
  // No new account today from this network (R1b): Settings › SIGN IN says why.
  else if (returned === 'limit')
    inSettings(() => accountSettings().accountPage?.refused(account.ACCOUNT_LIMIT_MESSAGE));
  // A known account goes to the stage, or back to SAVE if the sign-in began there (CHG-0035).
  else backToSave();
}

export function handleSignInArrival(): void {
  askToApproveLink();
  if (signInReturn && !juce && !embedId) welcomeBack(signInReturn);
}
