// BlokDust iOS AUv3 test host (CHG-0025 task 2): a Simulator app that loads the BUILT BlokDust AUv3 extension the
// way iPad hosts do (out of process, by component description), renders golden fixtures through it offline, checks
// the state round-trip, then shows the extension's view so its WebView editor builds the stage.
//
// Run by `pnpm bd plugin ios test`, which passes a job file:  BlokDustIOSHost --job <job.json>
//   job: {"component": "aumu,Bdst,Bldt", "fixtures": ["<abs path>", ...], "out": "<abs path>", "editorSeconds": 20}
// Writes {"component", "renders": [{fixture, audioHash, frames, sampleRate, peak, stateRoundTrips}], "view": bool}
// to "out". Simulator apps can read and write the Mac's file system, so paths are the Mac's. The editor's page
// round-trip is read from the plugin's own log line ("page: ready, N blocks", subsystem com.blokdust.plugin):
// environment variables do not reach an extension process.
//
// No audio session is activated: rendering pulls the AU's render block directly (manual rendering), which works in
// the Simulator where a record-capable session deadlocks Core Audio (see CHG-0025 risks).
#import <AVFoundation/AVFoundation.h>
#import <AudioToolbox/AudioToolbox.h>
#import <CoreAudioKit/CoreAudioKit.h>
#import <UIKit/UIKit.h>
#include <os/log.h>

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <string>
#include <vector>

#include "blokdust/hash.hpp"

static os_log_t hostLog() {
  static os_log_t l = os_log_create("com.blokdust.ioshost", "test");
  return l;
}
#define HOSTLOG(...) os_log(hostLog(), "%{public}@", [NSString stringWithFormat:__VA_ARGS__])

static OSType fourCC(NSString* s) {
  const char* c = s.UTF8String;
  return (OSType(c[0]) << 24) | (OSType(c[1]) << 16) | (OSType(c[2]) << 8) | OSType(c[3]);
}

static NSDictionary* renderFixture(AUAudioUnit* au, NSString* path) {
  NSData* raw = [NSData dataWithContentsOfFile:path];
  NSDictionary* fx = raw ? [NSJSONSerialization JSONObjectWithData:raw options:0 error:nil] : nil;
  if (!fx) return @{@"fixture": path, @"error": @"cannot read fixture"};
  NSDictionary* render = fx[@"render"] ?: @{};
  const double sr = render[@"sampleRate"] ? [render[@"sampleRate"] doubleValue] : 48000.0;
  const double seconds = render[@"seconds"] ? [render[@"seconds"] doubleValue] : 5.0;
  const long frames = static_cast<long>(seconds * sr + 0.5);
  constexpr AUAudioFrameCount kBlock = 512;  // as blokdust_host_test (the hash does not depend on it)

  if (au.renderResourcesAllocated) [au deallocateRenderResources];
  NSError* err = nil;
  AVAudioFormat* fmt = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:sr channels:2];
  if (![au.outputBusses[0] setFormat:fmt error:&err]) return @{@"fixture": path, @"error": [NSString stringWithFormat:@"output format: %@", err]};
  for (NSUInteger i = 0; i < au.inputBusses.count; ++i) {  // the instrument's optional side-chain: present, silent
    [au.inputBusses[i] setFormat:fmt error:nil];
  }
  au.maximumFramesToRender = kBlock;

  // The patch as plugin state, wrapped as JUCE's AUv3 wrapper stores it (hosts save fullState in their projects).
  NSData* patch = [NSJSONSerialization dataWithJSONObject:fx[@"patch"] options:0 error:nil];
  au.fullState = @{@"jucePluginState": patch};
  NSDictionary* back = au.fullState;
  BOOL roundTrips = NO;
  if (NSData* d = back[@"jucePluginState"]) {
    NSMutableDictionary* j = [[NSJSONSerialization JSONObjectWithData:d options:NSJSONReadingMutableContainers error:nil] mutableCopy];
    [j removeObjectForKey:@"plugin"];  // plugin-only state (Dust values) beside the patch
    roundTrips = [j isEqual:fx[@"patch"]];
  }

  if (![au allocateRenderResourcesAndReturnError:&err]) return @{@"fixture": path, @"error": [NSString stringWithFormat:@"allocate: %@", err]};
  AURenderBlock renderBlock = au.renderBlock;
  AURenderPullInputBlock silence = ^AUAudioUnitStatus(AudioUnitRenderActionFlags*, const AudioTimeStamp*, AUAudioFrameCount n, NSInteger, AudioBufferList* io) {
    for (UInt32 b = 0; b < io->mNumberBuffers; ++b)
      if (io->mBuffers[b].mData) std::fill_n(static_cast<float*>(io->mBuffers[b].mData), n, 0.0f);
    return noErr;
  };

  std::vector<float> left(static_cast<std::size_t>(frames)), right(static_cast<std::size_t>(frames));
  std::vector<float> l(kBlock), r(kBlock);
  struct { AudioBufferList list; AudioBuffer second; } abl{};
  double peak = 0;
  for (long done = 0; done < frames; done += kBlock) {
    const auto n = static_cast<AUAudioFrameCount>(std::min<long>(kBlock, frames - done));
    abl.list.mNumberBuffers = 2;
    abl.list.mBuffers[0] = {1, n * UInt32(sizeof(float)), l.data()};
    abl.list.mBuffers[1] = {1, n * UInt32(sizeof(float)), r.data()};
    AudioTimeStamp ts{};
    ts.mSampleTime = static_cast<Float64>(done);
    ts.mFlags = kAudioTimeStampSampleTimeValid;
    AudioUnitRenderActionFlags flags = 0;
    const AUAudioUnitStatus st = renderBlock(&flags, &ts, n, 0, &abl.list, silence);
    if (st != noErr) return @{@"fixture": path, @"error": [NSString stringWithFormat:@"render failed at %ld: %d", done, (int)st]};
    // An out-of-process AU may hand back its own buffers instead of filling ours.
    const auto* outL = static_cast<const float*>(abl.list.mBuffers[0].mData);
    const auto* outR = static_cast<const float*>(abl.list.mBuffers[1].mData);
    std::copy(outL, outL + n, left.begin() + done);
    std::copy(outR, outR + n, right.begin() + done);
  }
  for (std::size_t i = 0; i < left.size(); ++i) peak = std::max({peak, std::abs(double(left[i])), std::abs(double(right[i]))});
  [au deallocateRenderResources];
  char hex[17];
  std::snprintf(hex, sizeof hex, "%016llx", static_cast<unsigned long long>(blokdust::hash::stereo(blokdust::hash::audio(left), blokdust::hash::audio(right))));
  return @{@"fixture": path, @"audioHash": @(hex), @"frames": @(frames), @"sampleRate": @(sr), @"peak": @(peak), @"stateRoundTrips": @(roundTrips)};
}

@interface HostDelegate : UIResponder <UIApplicationDelegate>
@property(strong, nonatomic) UIWindow* window;
@property(strong, nonatomic) AUAudioUnit* au;
@property(strong, nonatomic) NSMutableDictionary* result;
@property(copy, nonatomic) NSString* outPath;
@end

@implementation HostDelegate
- (void)finish {
  NSData* d = [NSJSONSerialization dataWithJSONObject:self.result options:NSJSONWritingPrettyPrinted error:nil];
  [d writeToFile:self.outPath atomically:YES];
  HOSTLOG(@"done: %@", self.outPath);
}

- (BOOL)application:(UIApplication*)app didFinishLaunchingWithOptions:(NSDictionary*)opts {
  self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
  UIViewController* root = [[UIViewController alloc] init];
  root.view.backgroundColor = UIColor.darkGrayColor;
  self.window.rootViewController = root;
  [self.window makeKeyAndVisible];

  NSArray* args = NSProcessInfo.processInfo.arguments;
  NSUInteger at = [args indexOfObject:@"--job"];
  if (at == NSNotFound || at + 1 >= args.count) { HOSTLOG(@"error: no --job"); return YES; }
  NSDictionary* job = [NSJSONSerialization JSONObjectWithData:[NSData dataWithContentsOfFile:args[at + 1]] options:0 error:nil];
  self.outPath = job[@"out"];
  self.result = [@{@"component": job[@"component"] ?: @"", @"renders": [NSMutableArray array], @"view": @NO} mutableCopy];
  NSArray* parts = [job[@"component"] componentsSeparatedByString:@","];
  AudioComponentDescription desc{fourCC(parts[0]), fourCC(parts[1]), fourCC(parts[2]), 0, 0};
  const double editorSeconds = job[@"editorSeconds"] ? [job[@"editorSeconds"] doubleValue] : 20.0;

  HOSTLOG(@"instantiating %@", job[@"component"]);
  [AUAudioUnit instantiateWithComponentDescription:desc options:kAudioComponentInstantiation_LoadOutOfProcess
                                 completionHandler:^(AUAudioUnit* au, NSError* err) {
    if (!au) {
      self.result[@"error"] = [NSString stringWithFormat:@"instantiate: %@", err];
      dispatch_async(dispatch_get_main_queue(), ^{ [self finish]; });
      return;
    }
    self.au = au;
    self.result[@"name"] = au.audioUnitName ?: @"";
    self.result[@"manufacturer"] = au.manufacturerName ?: @"";
    NSMutableArray* params = [NSMutableArray array];
    for (AUParameter* p in au.parameterTree.allParameters) [params addObject:p.displayName ?: @""];
    self.result[@"params"] = params;
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
      for (NSString* f in job[@"fixtures"]) {
        HOSTLOG(@"rendering %@", f.lastPathComponent);
        [self.result[@"renders"] addObject:renderFixture(au, f)];
      }
      dispatch_async(dispatch_get_main_queue(), ^{
        // The editor: the host asks for the extension's view controller and shows it (AUM shows it in a window).
        [au requestViewControllerWithCompletionHandler:^(AUViewControllerBase* vc) {
          if (vc) {
            [root addChildViewController:vc];
            vc.view.frame = root.view.bounds;
            vc.view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
            [root.view addSubview:vc.view];
            [vc didMoveToParentViewController:root];
            self.result[@"view"] = @YES;
          }
          HOSTLOG(@"view %@; waiting %.0f s for the editor", vc ? @"shown" : @"missing", editorSeconds);
          dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(editorSeconds * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{ [self finish]; });
        }];
      });
    });
  }];
  return YES;
}
@end

int main(int argc, char* argv[]) {
  @autoreleasepool { return UIApplicationMain(argc, argv, nil, NSStringFromClass([HostDelegate class])); }
}
