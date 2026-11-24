#include "Telemetry.h"

#include "PatchFiles.h"    // the App Group on iPad
#include "WebViewDrops.h"  // systemLog

#include <atomic>

#if JUCE_MAC || JUCE_IOS
#include <CoreFoundation/CoreFoundation.h>
#include <TargetConditionals.h>
#include <fcntl.h>
#include <sys/file.h>
#include <unistd.h>
#elif JUCE_WINDOWS
#include <windows.h>
#if JUCE_MSVC
#pragma comment(lib, "version.lib")
#endif
#endif

namespace blokdust::plugin::telemetry {

namespace {
// The public site, which the plugin's page already uses for Freesound search
// (web/src/patch/samples.ts PUBLIC_SITE).
constexpr const char* kEventsUrl = "https://blokdust.funputs.com/api/events";

/** On iPad (CHG-0025): the App Group the app and both extensions share, so one switch and one
 * install id cover the iPad; each would otherwise keep its own. Empty elsewhere, or when the group
 * is missing (unsigned builds). */
juce::File sharedDir() {
#if JUCE_IOS
  if (juce::String(patchfiles::rootKind()) == "app group")
    return patchfiles::root().getParentDirectory();
#endif
  return {};
}

std::unique_ptr<juce::PropertiesFile> settings() {
  juce::PropertiesFile::Options o;
  o.applicationName = "BlokDust";
  o.filenameSuffix = "settings";
  o.folderName = "BlokDust";
  o.osxLibrarySubFolder = "Application Support";
  o.commonToAllUsers = false;
  o.processLock = nullptr;
  if (const auto dir = sharedDir(); dir != juce::File{})
    return std::make_unique<juce::PropertiesFile>(dir.getChildFile("usage-stats.settings"), o);
  return std::make_unique<juce::PropertiesFile>(o);
}

const char* storeKind() {
  return sharedDir() != juce::File{} ? "app group" : "settings file";
}

/** One settings file is shared by every BlokDust in every DAW (on iPad: the app and its
 * extensions): guard read-modify-write across processes. JUCE's InterProcessLock keeps its lock
 * file inside each sandbox's own container on iPad, so there the lock is a file in the App Group.
 */
class SettingsLock {
 public:
  SettingsLock() {
#if JUCE_IOS
    if (const auto dir = sharedDir(); dir != juce::File{}) {
      fd_ = ::open(dir.getChildFile("usage-stats.lock").getFullPathName().toRawUTF8(),
                   O_RDWR | O_CREAT, 0600);
      if (fd_ >= 0)
        ::flock(fd_, LOCK_EX);
      return;
    }
#endif
    lock_ = std::make_unique<juce::InterProcessLock::ScopedLockType>(processLock());
  }
  ~SettingsLock() {
#if JUCE_IOS
    if (fd_ >= 0) {
      ::flock(fd_, LOCK_UN);
      ::close(fd_);
    }
#endif
  }
  SettingsLock(const SettingsLock&) = delete;
  SettingsLock& operator=(const SettingsLock&) = delete;

 private:
  static juce::InterProcessLock& processLock() {
    static juce::InterProcessLock lock("BlokDustSettings");
    return lock;
  }
  std::unique_ptr<juce::InterProcessLock::ScopedLockType> lock_;
  [[maybe_unused]] int fd_ = -1;
};

/** Where the ping goes: BLOKDUST_EVENTS_URL (local Worker tests), else the server the page itself
 * uses (review builds: staging; installers: the live site; tools/plugin/web.ts), else the live
 * site. */
juce::String eventsUrl(const juce::String& fromPage) {
  if (const auto env = juce::SystemStats::getEnvironmentVariable("BLOKDUST_EVENTS_URL", {});
      env.isNotEmpty())
    return env;
  if (fromPage.startsWith("https://") && fromPage.endsWith("/api/events") &&
      !fromPage.containsAnyOf("?#@ "))
    return fromPage;
  return kEventsUrl;
}

juce::String today() {
  return juce::Time::getCurrentTime().formatted("%Y-%m-%d");
}  // local date

/** Keep only what the Worker accepts in a token (server/src/events.ts): letters, digits and a few
 * separators, ≤ 48. */
juce::String token(juce::String s) {
  s = s.retainCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ._:+()/-")
          .trim();
  while (s.isNotEmpty() && !juce::CharacterFunctions::isLetterOrDigit(s[0]))
    s = s.substring(1);
  return s.substring(0, 48);
}

juce::String surfaceOf(juce::AudioProcessor::WrapperType w) {
  switch (w) {
    case juce::AudioProcessor::wrapperType_VST3:
      return "vst3";
    case juce::AudioProcessor::wrapperType_AudioUnit:
      return "au";
    case juce::AudioProcessor::wrapperType_AudioUnitv3:
      return "auv3";
    case juce::AudioProcessor::wrapperType_Standalone:
      return "standalone";
    case juce::AudioProcessor::wrapperType_Undefined:
    case juce::AudioProcessor::wrapperType_VST:
    case juce::AudioProcessor::wrapperType_AAX:
    case juce::AudioProcessor::wrapperType_Unity:
    case juce::AudioProcessor::wrapperType_LV2:
      return {};
  }
}

std::atomic<bool> busy{false};
}  // namespace

bool enabled() {
  SettingsLock l;
  return settings()->getBoolValue("usageStats", true);
}

void setEnabled(bool on) {
  SettingsLock l;
  auto s = settings();
  s->setValue("usageStats", on);
  // Off: forget the install id too; a new one is made if it's turned back on.
  if (!on)
    s->removeValue("installId");
  s->saveIfNeeded();
  systemLog(juce::String("usage stats ") + (on ? "on" : "off"));
}

juce::String hostVersion() {
  const auto exe = juce::File::getSpecialLocation(juce::File::hostApplicationPath);
#if JUCE_MAC || JUCE_IOS
  // …/Ableton Live 12.app/Contents/MacOS/Live → the .app bundle's CFBundleShortVersionString.
  for (auto f = exe; f.getFullPathName().length() > 1; f = f.getParentDirectory()) {
    if (!f.hasFileExtension("app"))
      continue;
    juce::String out;
    if (auto url = CFURLCreateWithFileSystemPath(nullptr, f.getFullPathName().toCFString(),
                                                 kCFURLPOSIXPathStyle, true)) {
      if (auto bundle = CFBundleCreate(nullptr, url)) {
        if (auto v =
                CFBundleGetValueForInfoDictionaryKey(bundle, CFSTR("CFBundleShortVersionString"));
            v && CFGetTypeID(v) == CFStringGetTypeID())
          out = juce::String::fromCFString(static_cast<CFStringRef>(v));
        CFRelease(bundle);
      }
      CFRelease(url);
    }
    return token(out);
  }
  return {};
#elif JUCE_WINDOWS
  const auto path = exe.getFullPathName();
  DWORD ignored = 0;
  const DWORD size = GetFileVersionInfoSizeW(path.toWideCharPointer(), &ignored);
  if (size == 0)
    return {};
  juce::HeapBlock<char> data(size);
  if (!GetFileVersionInfoW(path.toWideCharPointer(), 0, size, data.get()))
    return {};
  VS_FIXEDFILEINFO* info = nullptr;
  UINT len = 0;
  if (!VerQueryValueW(data.get(), L"\\", reinterpret_cast<void**>(&info), &len) || info == nullptr)
    return {};
  return juce::String(HIWORD(info->dwProductVersionMS)) + "." +
         juce::String(LOWORD(info->dwProductVersionMS)) + "." +
         juce::String(HIWORD(info->dwProductVersionLS));
#else
  juce::ignoreUnused(exe);
  return {};
#endif
}

juce::String pingBody(juce::AudioProcessor::WrapperType format, bool fx,
                      const juce::String& installId) {
  const auto surface = surfaceOf(format);
  if (surface.isEmpty())
    return {};
  const bool standalone = format == juce::AudioProcessor::wrapperType_Standalone;
  auto* s = new juce::DynamicObject();
  s->setProperty("kind", fx ? "fx" : "instrument");
  s->setProperty("host", standalone ? juce::String("Standalone")
                                    : token(juce::PluginHostType().getHostDescription()));
  s->setProperty("host_version",
                 standalone ? juce::String(JucePlugin_VersionString) : hostVersion());
#if JUCE_ARM
  s->setProperty("arch", "arm64");
#elif JUCE_64BIT
  s->setProperty("arch", "x64");
#else
  s->setProperty("arch", "x86");
#endif
  auto* e = new juce::DynamicObject();
  e->setProperty("e", "plugin_active");
  e->setProperty("s", juce::var(s));
  juce::Array<juce::var> events;
  events.add(juce::var(e));
  auto* body = new juce::DynamicObject();
  body->setProperty("surface", surface);
  body->setProperty("v", JucePlugin_VersionString);
  body->setProperty("install", installId);
  body->setProperty("os", token(juce::SystemStats::getOperatingSystemName()));
  body->setProperty("events", events);
  return juce::JSON::toString(juce::var(body), true);
}

void dailyPing(juce::ThreadPool& pool, juce::AudioProcessor::WrapperType format, bool fx,
               const juce::String& pageEventsUrl) {
  if (surfaceOf(format).isEmpty())
    return;
  if (busy.exchange(true))
    return;  // another BlokDust in this process is already sending today's
  juce::String installId, body;
  {
    SettingsLock l;
    auto s = settings();
    const bool on = s->getBoolValue("usageStats", true);
    systemLog(juce::String("usage stats: ") + storeKind() + ", " + (on ? "on" : "off"));
    // Never from tests: validators and test hosts (BLOKDUST_NO_TELEMETRY), and the iPad Simulator,
    // whose extensions never see environment variables.
    bool test = juce::SystemStats::getEnvironmentVariable("BLOKDUST_NO_TELEMETRY", {}) == "1";
#if TARGET_OS_SIMULATOR
    test = true;
#endif
    if (test || !on || s->getValue("lastPing") == today()) {
      busy = false;
      return;
    }
    installId = s->getValue("installId");
    if (installId.isEmpty()) {
      installId = juce::Uuid().toDashedString();
      s->setValue("installId", installId);
      s->saveIfNeeded();
    }
  }
  body = pingBody(format, fx, installId);
  const auto url = eventsUrl(pageEventsUrl);
  pool.addJob([body, url] {
    int status = 0;
    auto in = juce::URL(url).withPOSTData(body).createInputStream(
        juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
            .withExtraHeaders("Content-Type: application/json")
            .withConnectionTimeoutMs(4000)
            .withNumRedirectsToFollow(0)
            .withStatusCode(&status));
    // The reply is ignored beyond its status: the server can't make the plugin do anything
    // (security review).
    if (in != nullptr && status >= 200 && status < 300) {
      SettingsLock l;
      auto s = settings();
      s->setValue("lastPing", today());
      s->saveIfNeeded();
      systemLog("usage stats: sent today's ping");
    } else {
      systemLog("usage stats: ping not sent (" + juce::String(status) + ")");
    }
    busy = false;
  });
}

}  // namespace blokdust::plugin::telemetry
