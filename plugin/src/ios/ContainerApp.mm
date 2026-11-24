// The BlokDust iPad app (CHG-0025 task 4): the container of the AUv3 extension, and a playable
// BlokDust on its own.
//
// JUCE's own standalone app opens a play-and-record audio session as soon as it starts
// (juce_Audio_ios.cpp), which asks for the microphone and, in the iOS Simulator, deadlocks Core
// Audio. This app replaces it (JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP): output only. An
// AVAudioEngine source node on a Playback session pulls the processor; MIDI comes from every
// connected MIDI input (as JUCE's standalone does on mobile). The Audio In block stays silent here
// (no input); in a host it hears the host's side-chain as before.
//
// The patch is kept between launches like the desktop standalone (the processor's state, saved when
// the app leaves the foreground and restored at launch), so the Rotating Sequencer start patch only
// shows on the first launch. Compiled with ARC (plugin/CMakeLists.txt), into the app only: the
// extension never links it.
#import <AVFoundation/AVFoundation.h>

#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>

#include <algorithm>
#include <atomic>
#include <cmath>
#include <memory>

#include "../PatchFiles.h"
#include "../WebViewDrops.h"

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter();
#include <juce_audio_plugin_client/detail/juce_CreatePluginFilter.h>  // needs the two above

namespace blokdust::plugin {
namespace {

/// Runs the processor on the device's output. Owned by the app; the render block only touches
/// `proc_` (under its callback lock, as JUCE's AudioProcessorPlayer does) and the MIDI collector.
class OutputOnlyAudio {
 public:
  explicit OutputOnlyAudio(juce::AudioProcessor& p) : proc_(p) {}
  ~OutputOnlyAudio() { stop(); }

  /// Sets up the Playback session and starts the engine at the hardware's rate. Safe to call again
  /// (restarts).
  bool start() {
    stop();
    NSError* err = nil;
    AVAudioSession* s = AVAudioSession.sharedInstance;
    // Playback: output only, keeps playing with the ring/silent switch on; mixes with other apps'
    // audio.
    if (![s setCategory:AVAudioSessionCategoryPlayback
                   mode:AVAudioSessionModeDefault
                options:AVAudioSessionCategoryOptionMixWithOthers
                  error:&err])
      return fail("category", err);
    [s setPreferredIOBufferDuration:256.0 / 48000.0 error:nil];
    if (![s setActive:YES error:&err])
      return fail("activate", err);

    engine_ = [[AVAudioEngine alloc] init];
    const double sr = [engine_.outputNode outputFormatForBus:0].sampleRate > 0
                          ? [engine_.outputNode outputFormatForBus:0].sampleRate
                          : s.sampleRate;
    // The processor sees the session's buffer size; the source node may ask for more frames at
    // once, so it renders in slices of at most this many (prepareToPlay's promise).
    block_ = std::clamp(static_cast<int>(std::lround(s.IOBufferDuration * sr)), 64, 4096);
    proc_.setPlayConfigDetails(0, 2, sr, block_);
    proc_.prepareToPlay(sr, block_);
    buffer_.setSize(2, block_);
    midi_.ensureSize(2048);
    collector_.reset(sr);
    rendered_ = 0;
    peak_ = 0.0f;
    reported_ = false;

    AVAudioFormat* fmt = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:sr channels:2];
    OutputOnlyAudio* self = this;
    source_ = [[AVAudioSourceNode alloc]
        initWithFormat:fmt
           renderBlock:^OSStatus(BOOL*, const AudioTimeStamp*, AVAudioFrameCount n,
                                 AudioBufferList* out) {
             self->render(static_cast<int>(n), out);
             return noErr;
           }];
    [engine_ attachNode:source_];
    [engine_ connect:source_ to:engine_.mainMixerNode format:fmt];
    [engine_ prepare];
    if (![engine_ startAndReturnError:&err])
      return fail("engine start", err);
    systemLog(juce::String("container: audio started (") + juce::String(s.category.UTF8String) +
              ", " + juce::String(sr) + " Hz, " + juce::String(block_) + " frames)");
    return true;
  }

  void stop() {
    if (engine_ == nil)
      return;
    [engine_ stop];
    engine_ = nil;
    source_ = nil;
    proc_.releaseResources();
  }

  bool running() const { return engine_ != nil && engine_.isRunning; }
  juce::MidiMessageCollector& midiCollector() { return collector_; }

  /// One log line after the first two seconds of audio: rate and peak, so the test can tell sound
  /// reached the output.
  void reportOnce() {
    if (reported_ || rendered_.load() < static_cast<long>(proc_.getSampleRate() * 2))
      return;
    reported_ = true;
    systemLog("container: audio running, peak " + juce::String(peak_.load(), 4) + " after " +
              juce::String(rendered_.load()) + " frames");
  }

 private:
  bool fail(const char* what, NSError* err) {
    systemLog(juce::String("container: audio ") + what +
              " failed: " + juce::String(err.localizedDescription.UTF8String ?: "?"));
    engine_ = nil;
    source_ = nil;
    return false;
  }

  void render(int frames, AudioBufferList* out) {
    for (int done = 0; done < frames;) {
      const int n = std::min(block_, frames - done);
      juce::AudioBuffer<float> slice(buffer_.getArrayOfWritePointers(), 2, n);
      midi_.clear();
      collector_.removeNextBlockOfMessages(midi_, n);
      {
        const juce::ScopedLock sl(proc_.getCallbackLock());
        if (proc_.isSuspended())
          slice.clear();
        else {
          slice.clear();
          proc_.processBlock(slice, midi_);
        }
      }
      float peak = peak_.load(std::memory_order_relaxed);
      for (UInt32 b = 0; b < out->mNumberBuffers; ++b) {
        auto* dst = static_cast<float*>(out->mBuffers[b].mData);
        if (dst == nullptr)
          continue;
        const float* src = slice.getReadPointer(static_cast<int>(std::min<UInt32>(b, 1)));
        std::copy(src, src + n, dst + done);
        for (int i = 0; i < n; ++i)
          peak = std::max(peak, std::abs(src[i]));
      }
      peak_.store(peak, std::memory_order_relaxed);
      rendered_.fetch_add(n, std::memory_order_relaxed);
      done += n;
    }
  }

  juce::AudioProcessor& proc_;
  AVAudioEngine* engine_ = nil;
  AVAudioSourceNode* source_ = nil;
  int block_ = 256;
  juce::AudioBuffer<float> buffer_;
  juce::MidiBuffer midi_;
  juce::MidiMessageCollector collector_;
  std::atomic<long> rendered_{0};
  std::atomic<float> peak_{0.0f};
  bool reported_ = false;
};

/// The editor, inset from the screen's safe area (rounded corners, the home indicator).
class Stage : public juce::Component {
 public:
  explicit Stage(juce::AudioProcessorEditor& e) : editor_(e) {
    setOpaque(true);
    addAndMakeVisible(editor_);
  }
  void paint(juce::Graphics& g) override { g.fillAll(juce::Colours::black); }
  void resized() override {
    auto area = getLocalBounds();
    if (const auto* d = juce::Desktop::getInstance().getDisplays().getPrimaryDisplay())
      area = d->safeAreaInsets.subtractedFrom(area);
    editor_.setBounds(area);
  }

 private:
  juce::AudioProcessorEditor& editor_;
};

class ContainerApp : public juce::JUCEApplication, private juce::Timer {
 public:
  const juce::String getApplicationName() override { return JucePlugin_Name; }
  const juce::String getApplicationVersion() override { return JucePlugin_VersionString; }
  bool moreThanOneInstanceAllowed() override { return false; }

  void initialise(const juce::String&) override {
    mirrorLogs();
    juce::PropertiesFile::Options
        o;  // as JUCE's standalone app, so the saved patch has the same home
    o.applicationName = JucePlugin_Name;
    o.filenameSuffix = ".settings";
    o.osxLibrarySubFolder = "Application Support";
    settings_ = std::make_unique<juce::PropertiesFile>(o);

    processor_ = juce::createPluginFilterOfType(juce::AudioProcessor::wrapperType_Standalone);
    processor_->disableNonMainBuses();
    if (auto layout = processor_->getBusesLayout();
        !layout.inputBuses.isEmpty()) {  // no input on iPad: Audio In is silent
      layout.inputBuses.getReference(0) = juce::AudioChannelSet::disabled();
      processor_->setBusesLayout(layout);
    }
    juce::MemoryBlock state;
    if (state.fromBase64Encoding(settings_->getValue("filterState")) && state.getSize() > 0) {
      processor_->setStateInformation(state.getData(), static_cast<int>(state.getSize()));
      systemLog("container: patch restored (" + juce::String(static_cast<int>(state.getSize())) +
                " bytes)");
    }

    audio_ = std::make_unique<OutputOnlyAudio>(*processor_);
    observeSession();
    audio_->start();

    editor_.reset(processor_->createEditorIfNeeded());
    stage_ = std::make_unique<Stage>(*editor_);
    window_ =
        std::make_unique<juce::DocumentWindow>(getApplicationName(), juce::Colours::black, 0, true);
    window_->setUsingNativeTitleBar(true);
    window_->setContentNonOwned(stage_.get(), false);
    window_->setFullScreen(true);
    // Kiosk mode is how JUCE hides the status bar and the home indicator (its view controller asks
    // for it).
    juce::Desktop::getInstance().setKioskModeComponent(window_.get(), false);
    window_->setVisible(true);
    startTimer(500);
  }

  void shutdown() override {
    stopTimer();
    save();
    for (id o : observers_)
      [NSNotificationCenter.defaultCenter removeObserver:o];
    observers_.clear();
    audio_ = nullptr;
    juce::Desktop::getInstance().setKioskModeComponent(nullptr, false);
    window_ = nullptr;
    stage_ = nullptr;
    editor_ = nullptr;  // before the processor (its destructor tells the processor)
    midiIns_.clear();
    processor_ = nullptr;
  }

  void systemRequestedQuit() override {
    save();
    quit();
  }
  void anotherInstanceStarted(const juce::String&) override {}
  // iOS may end a backgrounded app without calling shutdown(): keep the patch whenever the app
  // leaves the foreground.
  void suspended() override { save(); }
  void resumed() override {
    mirrorLogs();
    if (audio_ != nullptr && !audio_->running())
      audio_->start();
  }

  // The plugin's log (the app's and the extensions', WebViewDrops.mm) is in the App Group, which
  // devicectl cannot read on an iPad; a copy in the app's own container can be (`bd plugin ios
  // log`, CHG-0025).
  static void mirrorLogs() {
    const auto from = blokdust::plugin::patchfiles::root().getChildFile("Logs");
    const auto to = juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory)
                        .getChildFile("Logs");
    to.createDirectory();
    for (const auto& f : from.findChildFiles(juce::File::findFiles, false, "*.log"))
      f.copyFileTo(to.getChildFile(f.getFileName()));
  }

 private:
  void save() {
    if (processor_ == nullptr || settings_ == nullptr)
      return;
    juce::MemoryBlock state;
    processor_->getStateInformation(state);
    settings_->setValue("filterState", state.toBase64Encoding());
    systemLog(juce::String("container: patch ") +
              (settings_->saveIfNeeded() ? "saved (" : "NOT saved (") +
              juce::String(static_cast<int>(state.getSize())) + " bytes)");
  }

  /// Interruptions (a call, Siri) and route or rate changes (headphones, AirPlay) stop the engine:
  /// start it again.
  void observeSession() {
    auto* nc = NSNotificationCenter.defaultCenter;
    auto restart = [this] {
      juce::MessageManager::callAsync([this] {
        if (audio_ != nullptr)
          audio_->start();
      });
    };
    observers_.push_back([nc
        addObserverForName:AVAudioSessionInterruptionNotification
                    object:nil
                     queue:nil
                usingBlock:^(NSNotification* n) {
                  if ([n.userInfo[AVAudioSessionInterruptionTypeKey] unsignedIntegerValue] ==
                      AVAudioSessionInterruptionTypeEnded)
                    restart();
                }]);
    observers_.push_back([nc addObserverForName:AVAudioEngineConfigurationChangeNotification
                                         object:nil
                                          queue:nil
                                     usingBlock:^(NSNotification*) {
                                       restart();
                                     }]);
    observers_.push_back([nc addObserverForName:AVAudioSessionMediaServicesWereResetNotification
                                         object:nil
                                          queue:nil
                                     usingBlock:^(NSNotification*) {
                                       restart();
                                     }]);
  }

  /// Opens MIDI inputs as they appear (keyboards, Bluetooth MIDI once paired in Settings).
  void timerCallback() override {
    if (audio_ != nullptr)
      audio_->reportOnce();
    for (const auto& d : juce::MidiInput::getAvailableDevices()) {
      if (std::any_of(midiIns_.begin(), midiIns_.end(),
                      [&](const auto& m) { return m->getIdentifier() == d.identifier; }))
        continue;
      if (auto in = juce::MidiInput::openDevice(d.identifier, &audio_->midiCollector())) {
        in->start();
        systemLog("container: MIDI input " + d.name);
        midiIns_.push_back(std::move(in));
      }
    }
  }

  std::unique_ptr<juce::PropertiesFile> settings_;
  std::unique_ptr<juce::AudioProcessor> processor_;
  std::unique_ptr<OutputOnlyAudio> audio_;
  std::unique_ptr<juce::AudioProcessorEditor> editor_;
  std::unique_ptr<Stage> stage_;
  std::unique_ptr<juce::DocumentWindow> window_;
  std::vector<std::unique_ptr<juce::MidiInput>> midiIns_;
  std::vector<id> observers_;
};

}  // namespace
}  // namespace blokdust::plugin

JUCE_CREATE_APPLICATION_DEFINE(blokdust::plugin::ContainerApp)
