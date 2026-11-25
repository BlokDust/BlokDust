#include "Samples.h"

namespace blokdust::plugin {

namespace {
void onMessageThread(SampleResult done, std::shared_ptr<LoadedSample> s, std::string err) {
  juce::MessageManager::callAsync([onDone = std::move(done), sample = std::move(s),
                                   error = std::move(err)] { onDone(sample, error); });
}
}  // namespace

std::shared_ptr<LoadedSample> SampleLoader::decode(std::unique_ptr<juce::InputStream> in,
                                                   std::string& error) {
  if (!in) {
    error = "cannot read";
    return nullptr;
  }
  std::unique_ptr<juce::AudioFormatReader> reader(formats_.createReaderFor(std::move(in)));
  if (!reader || reader->lengthInSamples <= 0) {
    error = "not an audio file BlokDust can read";
    return nullptr;
  }
  constexpr juce::int64 kMaxFrames =
      48000LL * 60 * 10;  // 10 minutes at 48 kHz: plenty for a stem, bounded memory
  const auto frames = static_cast<int>(std::min(reader->lengthInSamples, kMaxFrames));
  auto s = std::make_shared<LoadedSample>();
  const int ch = std::min<int>(2, static_cast<int>(reader->numChannels));
  s->audio.setSize(ch, frames);
  reader->read(&s->audio, 0, frames, 0, true, ch > 1);
  s->sampleRate = reader->sampleRate;
  s->duration = frames / reader->sampleRate;
  // The loudest |sample| of each of up to 4000 equal stretches (the page draws v1's 200-point
  // waveform from it, 20 to a point, and zooms into it: web/src/v1ui/waveZoom.ts). One sample per
  // stretch, as it was, missed the peaks.
  const int points = std::min(frames, 4000);
  s->preview.resize(static_cast<std::size_t>(points));
  for (int i = 0; i < points; ++i) {
    const auto from = static_cast<int>(static_cast<juce::int64>(i) * frames / points);
    const auto to =
        std::max(from + 1, static_cast<int>(static_cast<juce::int64>(i + 1) * frames / points));
    float v = 0.0f;
    for (int c = 0; c < ch; ++c)
      v = std::max(v, s->audio.getMagnitude(c, from, to - from));
    s->preview[static_cast<std::size_t>(i)] = v;
  }
  return s;
}

void SampleLoader::loadFile(const juce::File& file, SampleResult done) {
  pool_.addJob([this, file, done]() mutable {
    std::string err;
    auto sample = decode(file.createInputStream(), err);
    if (sample) {
      sample->track = "file:" + file.getFileName().toStdString();
      sample->ref = {{"provider", "file"},
                     {"name", file.getFileName().toStdString()},
                     {"path", file.getFullPathName().toStdString()},
                     {"durationSec", std::round(sample->duration * 1000.0) / 1000.0}};
      for (auto& [k, v] : fingerprint(file).items())
        sample->ref[k] = v;
    }
    onMessageThread(std::move(done), sample, err.empty() && !sample ? "decode failed" : err);
  });
}

void SampleLoader::loadUrl(const std::string& url, nlohmann::json ref, std::int64_t maxBytes,
                           SampleResult done) {
  pool_.addJob(
      // NOLINTNEXTLINE(bugprone-exception-escape): copying its strings throws only out of memory
      [this, url, sampleRef = std::move(ref), maxBytes, onDone = std::move(done)]() mutable {
        const auto opts =
            juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress)
                .withConnectionTimeoutMs(20000)
                .withExtraHeaders(maxBytes > 0 ? "Range: bytes=0-" + juce::String(maxBytes)
                                               : juce::String());
        juce::MemoryBlock bytes;
        std::string err;
        if (auto in = juce::URL(juce::String(url)).createInputStream(opts))
          in->readIntoMemoryBlock(bytes);
        std::shared_ptr<LoadedSample> sample;
        if (bytes.getSize() == 0)
          err = "download failed";
        else
          sample = decode(std::make_unique<juce::MemoryInputStream>(bytes, true), err);
        if (sample) {
          sample->ref = sampleRef;
          sample->track = "freesound:" + std::to_string(sampleRef.value("id", 0));
        }
        onMessageThread(std::move(onDone), sample, err);
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

void SampleLoader::copyIn(const juce::URL& url, const juce::File& dir,
                          std::function<void(juce::File, std::string)> done) {
  pool_.addJob([url, dir, done]() mutable {
    juce::File result;
    std::string err;
    const auto name =
        juce::File::createLegalFileName(juce::URL::removeEscapeChars(url.getFileName()));
    dir.createDirectory();
    const auto tmp = dir.getNonexistentChildFile(".incoming", ".part", false);
    {
      // JUCE's iOS stream keeps the picked file's security-scoped access open while it reads.
      auto in = url.createInputStream(
          juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress));
      juce::FileOutputStream out(tmp);
      if (!in || !out.openedOk() || out.writeFromInputStream(*in, -1) <= 0)
        err = "cannot copy the picked file";
    }
    if (err.empty()) {
      const auto same = dir.getChildFile(name.isEmpty() ? "Sample" : name);
      if (same.existsAsFile() && fingerprint(same) == fingerprint(tmp)) {
        tmp.deleteFile();
        result = same;
      } else {
        result = same.existsAsFile()
                     ? dir.getNonexistentChildFile(same.getFileNameWithoutExtension(),
                                                   same.getFileExtension(), false)
                     : same;
        if (!tmp.moveFileTo(result)) {
          err = "cannot keep the copy";
          result = juce::File();
        }
      }
    }
    if (!err.empty())
      tmp.deleteFile();
    juce::MessageManager::callAsync(
        [onDone = std::move(done), result, err] { onDone(result, err); });
  });
}

juce::File SampleLoader::relink(const nlohmann::json& ref, const juce::File& samplesDir) {
  juce::File last(juce::String(ref.value("path", std::string{})));
  if (last.existsAsFile())
    return last;
  const auto name = juce::String(ref.value("name", std::string{}));
  if (name.isEmpty())
    return {};
  for (const auto& dir :
       {last.getParentDirectory(), last.getParentDirectory().getParentDirectory()}) {
    if (!dir.isDirectory())
      continue;
    if (auto f = dir.getChildFile(name); f.existsAsFile())
      return f;
    if (const auto found = dir.findChildFiles(juce::File::findFiles, true, name); !found.isEmpty())
      return found.getFirst();  // nearest match
  }
  if (samplesDir.isDirectory())
    if (auto f = samplesDir.getChildFile(name); f.existsAsFile())
      return f;
  return {};
}

nlohmann::json defaultSound(const std::string& type) {
  if (type == "source.sample")
    return {{"provider", "freesound"},
            {"id", 223835},
            {"name", "[Synth] ambient key"},
            {"username", "waveplaySFX"},
            {"license", "CC0"},
            {"licenseUrl", "http://creativecommons.org/publicdomain/zero/1.0/"},
            {"duration", 7.68},
            {"preview", "https://cdn.freesound.org/previews/223/223835_1676145-hq.mp3"},
            {"url", "https://freesound.org/people/waveplaySFX/sounds/223835/"}};
  if (type == "source.granular")
    return {{"provider", "freesound"},
            {"id", 191167},
            {"name", "Piano drone"},
            {"username", "laserlife"},
            {"license", "CC0"},
            {"licenseUrl", "http://creativecommons.org/publicdomain/zero/1.0/"},
            {"duration", 14.8608},
            {"preview", "https://cdn.freesound.org/previews/191/191167_2372469-hq.mp3"},
            {"url", "https://freesound.org/people/laserlife/sounds/191167/"}};
  return nullptr;
}

}  // namespace blokdust::plugin
