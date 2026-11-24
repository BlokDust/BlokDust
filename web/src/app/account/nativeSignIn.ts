// The iPad app's sign-in (SHARING-0011): Apple and passkeys through the system sheet.
import { appPost } from '../../account/device.ts';
import { juce } from '../boot/page.ts';
import { pluginName } from './pluginAccount.ts';

type NativeAnswer = Partial<Record<string, string | boolean>>;
interface SignedIn {
  key: string;
  user: { handle: string | null };
  fresh?: boolean;
}

/** Waiting for the system sheet's answer (bd_nativeAppleDone / bd_nativePasskeyDone). */
export let nativeAnswer: ((answer: NativeAnswer) => void) | null = null;

export function setNativeAnswer<Value extends typeof nativeAnswer>(value: Value): Value {
  nativeAnswer = value;
  return value;
}

export const askNative = (event: string, body: object) =>
  new Promise<NativeAnswer>((resolve) => {
    nativeAnswer = resolve;
    juce?.emitEvent(event, body);
  });

export const nativeFailed = (answer: NativeAnswer) =>
  Object.assign(new Error(String(answer.error ?? 'That did not work. Try again.')), {
    name: answer.cancelled ? 'AbortError' : 'Error',
  });

async function appleSignIn(): Promise<SignedIn> {
  const nonce = await appPost<{ id: string; nonce: string }>('app/apple/nonce');
  const answer = await askNative('bd_nativeApple', { nonce: nonce.nonce });
  if (typeof answer.code !== 'string') throw nativeFailed(answer);
  return appPost<SignedIn>('app/apple', { id: nonce.id, code: answer.code, name: pluginName });
}

async function passkeySignIn(): Promise<SignedIn> {
  const challenge = await appPost<{ id: string; rpId: string; options: { challenge: string } }>(
    'app/passkey/options',
  );
  const answer = await askNative('bd_nativePasskey', {
    rpId: challenge.rpId,
    challenge: challenge.options.challenge,
  });
  if (typeof answer.id !== 'string') throw nativeFailed(answer);
  const response = {
    id: answer.id,
    rawId: answer.rawId,
    type: 'public-key',
    clientExtensionResults: {},
    authenticatorAttachment: 'platform',
    response: {
      clientDataJSON: answer.clientDataJSON,
      authenticatorData: answer.authenticatorData,
      signature: answer.signature,
      ...(answer.userHandle ? { userHandle: answer.userHandle } : {}),
    },
  };
  return appPost<SignedIn>('app/passkey', { id: challenge.id, response, name: pluginName });
}

export const nativeSignIn = { apple: appleSignIn, passkey: passkeySignIn };
