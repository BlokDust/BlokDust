// blokdust_host_test — load the BUILT plugin binary like a DAW would, with no editor, render a golden fixture and
// print hashes (must equal tests/golden/expected). With --editor, also open the real WebView editor and wait for the
// web UI to report it built the stage from the plugin's patch (bridge round-trip).
//   blokdust_host_test <BlokDust.vst3 | AudioUnit:Synths/aumu,Bdst,Bldt> <fixture.json> [--no-state] [--editor <diag.json>]
//                      [--state <patch.json>] [--param <index>=<0..1>]... [--midi on:60@4800,off:60@48000,...]
// The fixture's "input" (test sine) is fed to plugins with an input bus (BlokDust FX). --state overrides the patch
// sent as state (e.g. one with an "automation" list); --param sets host parameters (Dust 1–8) before rendering.
// --no-state renders the plugin's built-in default patch (used for AU, whose hosts wrap state as a property list).
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>

#include <cstdio>
#include <fstream>
#include <iostream>
#include <vector>

#include <nlohmann/json.hpp>

#include "blokdust/hash.hpp"
#include "blokdust/test_signal.hpp"
#include "PatchFiles.h"

// --selftest-patches (CHG-0005): the plugin's patch files and Open/Insert merge, without a plugin. Prints JSON.
static int selftestPatches() {
  using namespace blokdust::plugin::patchfiles;
  const auto dir = juce::File::createTempFile("bd-patches");
  dir.createDirectory();
  nlohmann::json checks = nlohmann::json::object();
  const nlohmann::json scene = {{"format", "blokdust.patch"}, {"version", 2}, {"seed", 7},
    {"blocks", {{{"id", "a"}, {"type", "source.tone"}, {"x", 0}, {"y", 0}}, {{"id", "s"}, {"type", "source.sample"}, {"x", 3}, {"y", 0}, {"params", {{"track", "file:kick.wav"}}}}}},
    {"refs", {{"file:kick.wav", {{"provider", "file"}, {"name", "kick.wav"}, {"path", "/x/kick.wav"}}}}},
    {"automation", {{{"slot", 1}, {"block", "a"}, {"param", "fine"}}}}, {"plugin", {{"dust", {0.5}}}}};
  // save: one file per title, title kept inside, unsafe characters stripped, "plugin" state left out
  const auto f1 = save(dir, "Keys: big/small?", scene);
  const auto f2 = save(dir, "Keys: big/small?", scene);
  const auto j = nlohmann::json::parse(f1.loadFileAsString().toStdString());
  checks["saveName"] = f1.getFileName() == "Keys bigsmall.blokdust" && f1 == f2;
  checks["saveTitle"] = j["meta"]["title"] == "Keys: big/small?" && !j.contains("plugin") && j["blocks"].size() == 2;
  save(dir, "Second", scene);
  f1.setLastModificationTime(juce::Time::getCurrentTime() - juce::RelativeTime::hours(1));
  const auto l = list(dir);
  checks["list"] = l.size() == 2 && l[0]["name"] == "Second" && l[1]["name"] == "Keys: big/small?";
  // insert: blocks and refs added, the scene's own blocks, refs, automation, seed and plugin state kept
  const nlohmann::json part = {{"blocks", {{{"id", "b1"}, {"type", "fx.filter"}, {"x", 9}, {"y", 9}}}},
    {"refs", {{"freesound:1", {{"provider", "freesound"}, {"id", 1}}}}}};
  const auto ins = merge(scene, part, false);
  checks["insert"] = ins["blocks"].size() == 3 && ins["blocks"][2]["id"] == "b1" && ins["refs"].size() == 2 && ins["automation"].size() == 1 && ins["seed"] == 7 && ins.contains("plugin");
  // open: blocks, refs and tempo replaced; automation dropped (it named the old blocks)
  auto openPart = part; openPart["tempo"] = 96;
  const auto op = merge(scene, openPart, true);
  checks["open"] = op["blocks"].size() == 1 && op["refs"].size() == 1 && !op.contains("automation") && op["tempo"] == 96 && op["seed"] == 7;
  dir.deleteRecursively();
  // saveTo (the save dialog's choice): anywhere, any name ("+" kept), given the .blokdust extension
  const auto elsewhere = juce::File::createTempFile("").getSiblingFile("bd-elsewhere");
  elsewhere.createDirectory();
  const auto f3 = saveTo(elsewhere.getChildFile("Bass + Bells.json"), "Bass + Bells", scene);
  checks["saveTo"] = f3.getFileName() == "Bass + Bells.blokdust" && nlohmann::json::parse(f3.loadFileAsString().toStdString())["meta"]["title"] == "Bass + Bells";
  elsewhere.deleteRecursively();
  bool ok = true;
  for (const auto& [k, v] : checks.items()) ok = ok && v.get<bool>();
  std::cout << nlohmann::json{{"selftest", "patches"}, {"ok", ok}, {"checks", checks}}.dump() << "\n";
  return ok ? 0 : 1;
}

int main(int argc, char** argv) {
  if (argc >= 2 && juce::String(argv[1]) == "--selftest-patches") { juce::ScopedJuceInitialiser_GUI juceInit; return selftestPatches(); }
  if (argc < 3) { std::cerr << "usage: blokdust_host_test <plugin> <fixture.json> [--editor <diag.json>]\n"; return 2; }
  juce::ScopedJuceInitialiser_GUI juceInit;
  const juce::String arg1 = argv[1];
  const juce::String pluginPath = arg1.startsWith("AudioUnit:") ? arg1 : juce::File::getCurrentWorkingDirectory().getChildFile(arg1).getFullPathName();
  bool noState = false;
  juce::String editorDiag, stateFile;
  std::vector<std::pair<int, float>> params;
  struct MidiEvent { long sample; juce::MidiMessage msg; };
  std::vector<MidiEvent> midiEvents;
  bool sidechain = false;
  double hostBpm = 0.0;
  int settleMs = 0;
  long bypassUntil = 0;  // --bypass-until: the host bypasses the plugin before this sample (Logic's power button)
  long tailFrom = -1;    // --tail-from: also hash the render from this sample on ("tailHash")
  long stopFrom = -1, playAgainAt = -1;  // --stopped a:b: the transport stops at a, and plays again from bar 1 at b
  bool idle = false;     // --idle: never process audio (a disabled plugin); with --editor, the UI must still update
  bool reload = false;  // --reload: save state, zero the parameters, restore the state, report their values
  juce::String wavOut;  // --wav: write the render (diagnosis)  // --settle: let the plugin finish async work (sample loading) on the message thread  // --tempo: a playing host transport from beat 0 (CHG-0004 3.5)
  for (int i = 3; i < argc; ++i) {
    const juce::String a = argv[i];
    if (a == "--no-state") noState = true;
    else if (a == "--sidechain") sidechain = true;
    else if (a == "--wav" && i + 1 < argc) wavOut = argv[++i];
    else if (a == "--reload") reload = true;
    else if (a == "--idle") idle = true;
    else if (a == "--stopped" && i + 1 < argc) { const juce::String r = argv[++i]; stopFrom = r.upToFirstOccurrenceOf(":", false, false).getLargeIntValue(); playAgainAt = r.fromFirstOccurrenceOf(":", false, false).getLargeIntValue(); }
    else if (a == "--bypass-until" && i + 1 < argc) bypassUntil = juce::String(argv[++i]).getLargeIntValue();
    else if (a == "--tail-from" && i + 1 < argc) tailFrom = juce::String(argv[++i]).getLargeIntValue();
    else if (a == "--settle" && i + 1 < argc) settleMs = juce::String(argv[++i]).getIntValue();
    else if (a == "--tempo" && i + 1 < argc) hostBpm = juce::String(argv[++i]).getDoubleValue();
    else if (a == "--editor" && i + 1 < argc) editorDiag = argv[++i];
    else if (a == "--state" && i + 1 < argc) stateFile = argv[++i];
    else if (a == "--midi" && i + 1 < argc) {
      for (const auto& e : juce::StringArray::fromTokens(argv[++i], ",", "")) {
        const auto kind = e.upToFirstOccurrenceOf(":", false, false);
        const auto noteVel = e.fromFirstOccurrenceOf(":", false, false).upToFirstOccurrenceOf("@", false, false);  // "67" or "67/76" (7-bit)
        const int note = noteVel.upToFirstOccurrenceOf("/", false, false).getIntValue();
        const auto vel = static_cast<juce::uint8>(noteVel.containsChar('/') ? noteVel.fromFirstOccurrenceOf("/", false, false).getIntValue() : 127);
        const long at = e.fromFirstOccurrenceOf("@", false, false).getLargeIntValue();
        midiEvents.push_back({at, kind == "on" ? juce::MidiMessage::noteOn(1, note, vel) : juce::MidiMessage::noteOff(1, note)});
      }
    }
    else if (a == "--midi-raw" && i + 1 < argc) {  // "at:status,d1,d2;…" (MPE streams, PLUGIN-0004)
      for (const auto& e : juce::StringArray::fromTokens(argv[++i], ";", "")) {
        const long at = e.upToFirstOccurrenceOf(":", false, false).getLargeIntValue();
        const auto b = juce::StringArray::fromTokens(e.fromFirstOccurrenceOf(":", false, false), ",", "");
        if (b.size() >= 3) midiEvents.push_back({at, juce::MidiMessage(b[0].getIntValue(), b[1].getIntValue(), b[2].getIntValue())});
      }
    }
    else if (a == "--param" && i + 1 < argc) { const juce::String p = argv[++i]; params.emplace_back(p.upToFirstOccurrenceOf("=", false, false).getIntValue(), p.fromFirstOccurrenceOf("=", false, false).getFloatValue()); }
  }
  nlohmann::json fx;
  { std::ifstream in(argv[2]); fx = nlohmann::json::parse(in); }
  const double sr = fx["render"].value("sampleRate", 48000);
  const auto frames = static_cast<long>(fx["render"].value("seconds", 5.0) * sr + 0.5);
  const nlohmann::json statePatch = stateFile.isNotEmpty() ? nlohmann::json::parse(juce::File(stateFile).loadFileAsString().toStdString()) : fx["patch"];
  const std::string state = statePatch.dump();

  juce::AudioPluginFormatManager formats;
  formats.addFormat(std::make_unique<juce::VST3PluginFormat>());
#if JUCE_MAC
  formats.addFormat(std::make_unique<juce::AudioUnitPluginFormat>());
#endif
  juce::OwnedArray<juce::PluginDescription> types;
  for (auto* f : formats.getFormats()) if (f->fileMightContainThisPluginType(pluginPath)) f->findAllTypesForFile(types, pluginPath);
  if (types.isEmpty()) { std::cerr << "error: no plugin found in " << pluginPath << "\n"; return 1; }

  juce::String err;
  constexpr int kBlock = 512;
  auto plugin = formats.createPluginInstance(*types[0], sr, kBlock, err);
  if (!plugin) { std::cerr << "error: " << err << "\n"; return 1; }
  // Hosts wrap VST3 state as XML with a base64 "IComponent" chunk (juce_VST3PluginFormatImpl.h); the chunk is
  // exactly what the plugin's getStateInformation produced, i.e. our patch JSON. Wrap it the same way a DAW would.
  const bool isVst3 = types[0]->pluginFormatName == "VST3";
  auto setPatch = [&](const std::string& json) {
    if (!isVst3) { plugin->setStateInformation(json.data(), static_cast<int>(json.size())); return; }
    juce::XmlElement xml("VST3PluginState");
    xml.createNewChildElement("IComponent")->addTextElement(juce::MemoryBlock(json.data(), json.size()).toBase64Encoding());
    juce::MemoryBlock blob;
    juce::AudioProcessor::copyXmlToBinary(xml, blob);
    plugin->setStateInformation(blob.getData(), static_cast<int>(blob.getSize()));
  };
  auto getPatch = [&]() -> std::string {
    juce::MemoryBlock blob;
    plugin->getStateInformation(blob);
    if (!isVst3) return blob.toString().toStdString();
    auto xml = juce::AudioProcessor::getXmlFromBinary(blob.getData(), static_cast<int>(blob.getSize()));
    juce::MemoryBlock chunk;
    if (!xml || !xml->getChildByName("IComponent") || !chunk.fromBase64Encoding(xml->getChildByName("IComponent")->getAllSubText())) return {};
    return chunk.toString().toStdString();
  };
  bool stateRoundTrips = false;
  if (!noState) {
    setPatch(state);
    const auto roundTrip = getPatch();
    auto back = nlohmann::json::parse(roundTrip, nullptr, false);
    if (back.is_object()) back.erase("plugin");  // plugin-only state (Dust values) beside the patch
    stateRoundTrips = !roundTrip.empty() && back == statePatch;
  }
  if (settleMs > 0) juce::MessageManager::getInstance()->runDispatchLoopUntil(settleMs);
  for (const auto& [index, value] : params) plugin->getParameters()[index]->setValueNotifyingHost(value);
  nlohmann::json reloadedValues = nullptr;
  if (reload) {  // a DAW saving the project, then opening it (CHG-0004 3.10: Dust values must survive)
    juce::MemoryBlock blob;
    plugin->getStateInformation(blob);
    for (auto* p : plugin->getParameters()) p->setValueNotifyingHost(0.0f);
    plugin->setStateInformation(blob.getData(), static_cast<int>(blob.getSize()));
    reloadedValues = nlohmann::json::array();
    for (auto* p : plugin->getParameters()) reloadedValues.push_back(p->getValue());
  }
  if (sidechain) {  // as a host does when the user routes a side-chain into the instrument
    auto layout = plugin->getBusesLayout();
    if (!layout.inputBuses.isEmpty()) layout.inputBuses.getReference(0) = juce::AudioChannelSet::stereo();
    if (!plugin->setBusesLayout(layout)) { std::fprintf(stderr, "side-chain layout refused\n"); return 1; }
  }
  const int numIn = plugin->getTotalNumInputChannels();
  plugin->setPlayConfigDetails(numIn, 2, sr, kBlock);
  plugin->prepareToPlay(sr, kBlock);
  const auto input = fx.value("input", nlohmann::json());

  // A DAW transport playing from bar 1 at `hostBpm`: tempo and beat position each block, as hosts report them.
  struct HostTransport : juce::AudioPlayHead {
    double bpm = 120.0, sr = 48000.0; long sample = 0, stopFrom = -1, playAgainAt = -1;
    juce::Optional<PositionInfo> getPosition() const override {
      const bool stopped = stopFrom >= 0 && sample >= stopFrom && sample < playAgainAt;
      const long from = stopFrom >= 0 && sample >= playAgainAt ? playAgainAt : 0;  // played again from bar 1
      PositionInfo p; p.setBpm(bpm); p.setIsPlaying(!stopped); p.setTimeInSamples(sample - from);
      p.setPpqPosition(static_cast<double>(sample - from) / sr * bpm / 60.0);
      return p;
    }
  } transport;
  transport.bpm = hostBpm; transport.sr = sr; transport.stopFrom = stopFrom; transport.playAgainAt = playAgainAt;
  if (hostBpm > 0) plugin->setPlayHead(&transport);
  juce::AudioBuffer<float> buf(2, kBlock);
  juce::MidiBuffer midi;
  std::vector<float> left(static_cast<std::size_t>(frames)), right(static_cast<std::size_t>(frames));
  for (long done = 0; done < (idle ? 0 : frames); done += kBlock) {
    const int n = static_cast<int>(std::min<long>(kBlock, frames - done));
    juce::AudioBuffer<float> view(buf.getArrayOfWritePointers(), 2, n);
    view.clear();
    midi.clear();
    for (const auto& ev : midiEvents) if (ev.sample >= done && ev.sample < done + n) midi.addEvent(ev.msg, static_cast<int>(ev.sample - done));
    if (numIn > 0 && input.is_object())
      for (int i = 0; i < n; ++i)
        view.setSample(0, i, blokdust::testsignal::sine(done + i, static_cast<int>(sr), input.value("frequency", 440.0), input.value("gain", 0.25))),
        view.setSample(1, i, view.getSample(0, i));
    transport.sample = done;
    if (done < bypassUntil) plugin->processBlockBypassed(view, midi);
    else plugin->processBlock(view, midi);
    std::copy(view.getReadPointer(0), view.getReadPointer(0) + n, left.begin() + done);
    std::copy(view.getReadPointer(1), view.getReadPointer(1) + n, right.begin() + done);
  }
  char hex[17];
  std::snprintf(hex, sizeof hex, "%016llx", static_cast<unsigned long long>(blokdust::hash::stereo(blokdust::hash::audio(left), blokdust::hash::audio(right))));
  std::string tailHex;
  if (tailFrom >= 0 && tailFrom < frames) {
    const std::vector<float> tl(left.begin() + tailFrom, left.end()), tr(right.begin() + tailFrom, right.end());
    char t[17];
    std::snprintf(t, sizeof t, "%016llx", static_cast<unsigned long long>(blokdust::hash::stereo(blokdust::hash::audio(tl), blokdust::hash::audio(tr))));
    tailHex = t;
  }
  if (wavOut.isNotEmpty()) {
    juce::WavAudioFormat wav;
    juce::AudioBuffer<float> all(2, static_cast<int>(frames));
    all.copyFrom(0, 0, left.data(), static_cast<int>(frames)); all.copyFrom(1, 0, right.data(), static_cast<int>(frames));
    if (auto w = std::unique_ptr<juce::AudioFormatWriter>(wav.createWriterFor(new juce::FileOutputStream(juce::File(wavOut)), sr, 2, 32, {}, 0))) w->writeFromAudioSampleBuffer(all, 0, all.getNumSamples());
  }
  // The patch the host would save now (Dust moves block params: the saved patch must follow, owner 2026-11-12).
  nlohmann::json stateAfter = nullptr;
  if (!noState) stateAfter = nlohmann::json::parse(getPatch(), nullptr, false);
  nlohmann::json paramNames = nlohmann::json::array();
  for (auto* p : plugin->getParameters()) paramNames.push_back(p->getName(64).toStdString());
  double peak = 0; for (std::size_t i = 0; i < left.size(); ++i) peak = std::max({peak, std::abs(double(left[i])), std::abs(double(right[i]))});
  nlohmann::json out = {{"format", types[0]->pluginFormatName.toStdString()}, {"name", types[0]->name.toStdString()}, {"peak", peak}, {"params", paramNames}, {"reloadedValues", reloadedValues},
                        {"audioHash", hex}, {"tailHash", tailHex}, {"frames", frames}, {"sampleRate", sr}, {"stateRoundTrips", stateRoundTrips}, {"stateAfter", stateAfter}};

  if (editorDiag.isNotEmpty()) {
    const juce::File diag(editorDiag);
    diag.deleteFile();
    std::unique_ptr<juce::AudioProcessorEditor> editor(plugin->createEditorAndMakeActive());
    if (!editor) { std::cerr << "error: no editor\n"; return 1; }
    editor->setOpaque(true);
    editor->addToDesktop(juce::ComponentPeer::windowHasTitleBar);
    editor->setVisible(true);
    for (int i = 0; i < 150 && !diag.existsAsFile(); ++i) juce::MessageManager::getInstance()->runDispatchLoopUntil(100);
    out["editor"] = diag.existsAsFile() ? nlohmann::json::parse(diag.loadFileAsString().toStdString()) : nlohmann::json("timeout");
    plugin->editorBeingDeleted(editor.get());
    editor.reset();
  }
  plugin->releaseResources();
  std::cout << out.dump() << "\n";
  return 0;
}
