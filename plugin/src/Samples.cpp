#include "Samples.h"

namespace blokdust::plugin {

namespace {
void onMessageThread(SampleResult done, std::shared_ptr<LoadedSample> s, std::string err) {
  juce::MessageManager::callAsync([done = std::move(done), s = std::move(s), err = std::move(err)] { done(s, err); });
}
}  // namespace

std::shared_ptr<LoadedSample> SampleLoader::decode(std::unique_ptr<juce::InputStream> in, std::string& error) {
  if (!in) { error = "cannot read"; return nullptr; }
  std::unique_ptr<juce::AudioFormatReader> reader(formats_.createReaderFor(std::move(in)));
  if (!reader || reader->lengthInSamples <= 0) { error = "not an audio file BlokDust can read"; return nullptr; }
  constexpr juce::int64 kMaxFrames = 48000LL * 60 * 10;  // 10 minutes at 48 kHz: plenty for a stem, bounded memory
  const auto frames = static_cast<int>(std::min(reader->lengthInSamples, kMaxFrames));
  auto s = std::make_shared<LoadedSample>();
  const int ch = std::min<int>(2, static_cast<int>(reader->numChannels));
  s->audio.setSize(ch, frames);
  reader->read(&s->audio, 0, frames, 0, true, ch > 1);
  s->sampleRate = reader->sampleRate;
  s->duration = frames / reader->sampleRate;
  const int points = std::min(frames, 4096);
  s->preview.resize(static_cast<std::size_t>(points));
  for (int i = 0; i < points; ++i) {
    const int at = static_cast<int>(static_cast<juce::int64>(i) * frames / points);
    float v = s->audio.getSample(0, at);
    if (ch > 1) v = 0.5f * (v + s->audio.getSample(1, at));
    s->preview[static_cast<std::size_t>(i)] = v;
  }
  return s;
}

void SampleLoader::loadFile(const juce::File& file, SampleResult done) {
  pool_.addJob([this, file, done]() mutable {
    std::string err;
    auto s = decode(file.createInputStream(), err);
    if (s) {
      s->track = "file:" + file.getFileName().toStdString();
      s->ref = {{"provider", "file"}, {"name", file.getFileName().toStdString()}, {"path", file.getFullPathName().toStdString()},
                {"durationSec", std::round(s->duration * 1000.0) / 1000.0}};
      for (auto& [k, v] : fingerprint(file).items()) s->ref[k] = v;
    }
    onMessageThread(std::move(done), s, err.empty() && !s ? "decode failed" : err);
  });
}

void SampleLoader::loadUrl(const std::string& url, nlohmann::json ref, std::int64_t maxBytes, SampleResult done) {
  pool_.addJob([this, url, ref = std::move(ref), maxBytes, done]() mutable {
    const auto opts = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress).withConnectionTimeoutMs(20000)
                          .withExtraHeaders(maxBytes > 0 ? "Range: bytes=0-" + juce::String(maxBytes) : juce::String());
    juce::MemoryBlock bytes;
    std::string err;
    if (auto in = juce::URL(juce::String(url)).createInputStream(opts)) in->readIntoMemoryBlock(bytes);
    std::shared_ptr<LoadedSample> s;
    if (bytes.getSize() == 0) err = "download failed";
    else s = decode(std::make_unique<juce::MemoryInputStream>(bytes, true), err);
    if (s) { s->ref = ref; s->track = "freesound:" + std::to_string(ref.value("id", 0)); }
    onMessageThread(std::move(done), s, err);
  });
}

nlohmann::json SampleLoader::fingerprint(const juce::File& file) {
  constexpr juce::int64 K = 64 * 1024;
  const auto size = file.getSize();
  juce::MemoryBlock both;
  if (auto in = file.createInputStream()) {
    juce::MemoryBlock head, tail;
    in->readIntoMemoryBlock(head, std::min(K, size));
    in->setPosition(std::max<juce::int64>(0, size - K));
    in->readIntoMemoryBlock(tail, std::min(K, size));
    both.append(head.getData(), head.getSize());
    both.append(tail.getData(), tail.getSize());
  }
  return {{"bytes", size}, {"hash", "sha256:" + juce::SHA256(both).toHexString().toStdString()}};
}

juce::File SampleLoader::relink(const nlohmann::json& ref) {
  const juce::File last(juce::String(ref.value("path", std::string{})));
  if (last.existsAsFile()) return last;
  const auto name = juce::String(ref.value("name", std::string{}));
  if (name.isEmpty()) return {};
  for (const auto& dir : {last.getParentDirectory(), last.getParentDirectory().getParentDirectory()}) {
    if (!dir.isDirectory()) continue;
    if (auto f = dir.getChildFile(name); f.existsAsFile()) return f;
    for (const auto& f : dir.findChildFiles(juce::File::findFiles, true, name)) return f;  // nearest match
  }
  return {};
}

}  // namespace blokdust::plugin
