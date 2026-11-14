#pragma once
// Patch files in the plugin (CHG-0005, SPEC-PATCH-FORMAT-V2 R10): `.blokdust` files in ~/Music/BlokDust/Patches (next
// to Recordings and SampleGen), plus the merge the processor applies for Open / Insert. JUCE core + JSON only, so the
// headless host test can check it without a plugin (`blokdust_host_test --selftest-patches`).
#include <juce_core/juce_core.h>
#include <nlohmann/json.hpp>

namespace blokdust::plugin::patchfiles {

/// ~/Music/BlokDust/Patches (created on first use).
juce::File folder();
/// The folder's `.blokdust` files, newest first: [{name, path, modified (ms since epoch)}].
nlohmann::json list(const juce::File& dir);
/// A title → a safe file name (no path or reserved characters, never empty).
juce::String safeName(const juce::String& title);
/// Write `patch` (with meta.title = title) as <dir>/<safeName>.blokdust, replacing a file of that name (Save keeps
/// one file per title). Returns the file, or {} on failure.
juce::File save(const juce::File& dir, const juce::String& title, nlohmann::json patch);
/// Write `patch` (with meta.title = title) to `file` (given the `.blokdust` extension if it has another).
juce::File saveTo(const juce::File& file, const juce::String& title, nlohmann::json patch);
/// Open: `part` replaces the blocks, refs and tempo; automation goes (it named the old blocks).
/// Insert: `part`'s blocks (already given free ids and positions by the page) and refs are added.
/// The host's own fields (anything else in `current`) are kept either way.
nlohmann::json merge(const nlohmann::json& current, const nlohmann::json& part, bool open);

}  // namespace blokdust::plugin::patchfiles
