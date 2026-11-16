#pragma once
// Plugin usage ping (SHARING-0010, SPEC-SHARING-USAGE-ANALYTICS R8): once a day per install, when BlokDust's window opens,
// POST one plugin_active event (format, instrument/FX, DAW name and version, OS, CPU) to the public site's
// /api/events, with a random install id the Worker stores only as a hash. Opt-out (owner, 2026-11-16): the switch on
// Settings › About, kept per user in BlokDust's settings file. Never on the audio thread; failures are silent.
#include <juce_audio_processors/juce_audio_processors.h>

namespace blokdust::plugin::telemetry {

/** The user's choice (default on). */
bool enabled();
void setEnabled(bool on);

/** What the ping would send (tests, logs): the event batch as JSON, or empty when this format isn't counted. */
juce::String pingBody(juce::AudioProcessor::WrapperType format, bool fx, const juce::String& installId);

/** The DAW's version, read from its app bundle (macOS) or executable (Windows); empty when unknown. */
juce::String hostVersion();

/**
 * Send today's ping if it hasn't gone yet (and the user allows it). Returns at once; the request runs on `pool`,
 * which its owner must outlive the request with (the editor owns one; the request times out after a few seconds).
 * Off with BLOKDUST_NO_TELEMETRY=1 (validators, tests); BLOKDUST_EVENTS_URL points it elsewhere (local Worker tests).
 */
void dailyPing(juce::ThreadPool& pool, juce::AudioProcessor::WrapperType format, bool fx);

}  // namespace blokdust::plugin::telemetry
