#pragma once
// A signed-in plugin's key (CHG-0039, SHARING-0011), kept where only this user can read it: on macOS
// ~/Library/Application Support/BlokDust/account.json (one for every DAW and the app; the login keychain would ask
// each DAW for access), on Windows %APPDATA%\BlokDust\account.json, on iPad the App Group container (the app and its
// AUv3 share it, inside the iOS sandbox). The page holds it while it runs and sends it with its requests.
#include <juce_core/juce_core.h>
#include <nlohmann/json.hpp>

namespace blokdust::plugin::account {

/** {key, handle}, or an empty object when signed out (or the file is unreadable). */
nlohmann::json read();
/** Keep `key` (a `bdk_` key) and `handle`; false if it couldn't be written. */
bool write(const std::string& key, const std::string& handle);
/** Signed out: the file goes. */
void clear();
/** What this plugin calls itself on the website's list: "BlokDust on Mac (Logic Pro)", "BlokDust on iPad". */
juce::String deviceName(bool standalone);

}  // namespace blokdust::plugin::account
