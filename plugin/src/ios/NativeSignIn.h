#pragma once
// Sign in with Apple and passkeys in the iPad app (CHG-0039, SHARING-0011), through AuthenticationServices. The page
// asks (bd_nativeApple, bd_nativePasskey) with what the server gave it; the answer goes back to the page, which hands
// it to the server for a key. `anchor` is the editor's UIView: the system sheet shows over its window.
#include <juce_core/juce_core.h>
#include <functional>

namespace blokdust::plugin::nativesignin {

/** Sign in with Apple (no name, no email) with `nonce` in the request: {code} or {error, cancelled}. */
void apple(void* anchor, const juce::String& nonce, std::function<void(juce::var)> done);
/** The passkey of `rpId` (the site) answering `challenge` (base64url): {id, rawId, clientDataJSON, authenticatorData,
 * signature, userHandle} (base64url), or {error, cancelled}. */
void passkey(void* anchor, const juce::String& rpId, const juce::String& challenge, std::function<void(juce::var)> done);

}  // namespace blokdust::plugin::nativesignin
