#pragma once
// Plugin-side samples (CHG-0004 3.6/3.7, DATA-0005): the plugin's engine is native, so its samplers' audio is loaded
// here, never by the web UI. Files by path (picked natively, or restored from the DAW project and relinked by name +
// fingerprint), Freesound previews by URL. Decoding and downloads run on a background pool; results come back on the
// message thread. Nothing is uploaded or cached anywhere but memory.
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_cryptography/juce_cryptography.h>
#include <juce_events/juce_events.h>
#include <nlohmann/json.hpp>

#include <functional>
#include <memory>
#include <string>
#include <vector>

namespace blokdust::plugin {

struct LoadedSample {
  juce::AudioBuffer<float> audio;   // owned; the engine reads it until the next attach for that block
  double sampleRate = 48000.0;
  double duration = 0.0;
  nlohmann::json ref;               // patch `refs` entry (provider "file" with path, or "freesound")
  std::string track;                // ref key: "file:<name>" or "freesound:<id>"
  std::vector<float> preview;       // ≤ 4000 peaks (loudest |sample| per stretch) for the UI's waveform (it never gets the audio)
};

using SampleResult = std::function<void(std::shared_ptr<LoadedSample> ok, std::string error)>;

class SampleLoader {
 public:
  SampleLoader() { formats_.registerBasicFormats(); }
  ~SampleLoader() { pool_.removeAllJobs(true, 5000); }

  /// Decode an audio file (any format JUCE reads: WAV, AIFF, FLAC, Ogg, MP3, CAF/M4A on macOS).
  void loadFile(const juce::File& file, SampleResult done);
  /// Download (first `maxBytes` when > 0: the Convolver uses 2.5 s) and decode a Freesound preview.
  void loadUrl(const std::string& url, nlohmann::json ref, std::int64_t maxBytes, SampleResult done);

  /// DATA-0005 fingerprint, identical to the web's: size + SHA-256 of the first and last 64 KB.
  static nlohmann::json fingerprint(const juce::File& file);
  /// iPad (CHG-0025 task 6): a document-picker URL is only readable while it is picked, and not by the extension in
  /// another host. Copy it into `dir` (the shared BlokDust/Samples), reusing a same-named copy with the same
  /// fingerprint. `done` gets the copy, or {} and an error, on the message thread. Local only (DATA-0005).
  void copyIn(const juce::URL& url, const juce::File& dir, std::function<void(juce::File, std::string)> done);
  /// A file that moved: the same name beside its last known folder (that folder, its parent, their subfolders), then
  /// in `samplesDir` if given (iPad: a patch from another device, or after a reinstall moved the App Group).
  static juce::File relink(const nlohmann::json& ref, const juce::File& samplesDir = {});

 private:
  std::shared_ptr<LoadedSample> decode(std::unique_ptr<juce::InputStream> in, std::string& error);
  juce::AudioFormatManager formats_;
  juce::ThreadPool pool_{2};
};

}  // namespace blokdust::plugin
