# BlokDust plugin shell (PLUGIN-0001): JUCE 8 → VST3 / AU / Standalone on macOS and Windows, AUv3 + its container app
# on iPadOS (CHG-0025), WebView editor hosting web/dist.
# Build via `pnpm bd plugin build` (needs `pnpm web:build` first: the web bundle is embedded as BinaryData).
include(FetchContent)
FetchContent_Declare(JUCE GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 8.0.15 GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(JUCE)

set(BLOKDUST_WEB_DIST "${CMAKE_SOURCE_DIR}/web/dist")
# iPad: the App Group the app and its AUv3 extension share (CHG-0025 task 5). Registered in the owner's Apple Developer
# team for device builds; the Simulator does not check it.
set(BLOKDUST_APP_GROUP "group.com.funputs.blokdust")
if(NOT EXISTS "${BLOKDUST_WEB_DIST}/index.html")
  message(FATAL_ERROR "web/dist missing: run `pnpm web:build` before building the plugin")
endif()
# v1 fonts (web/public/fonts, OFL) are embedded too: the editor draws v1 chrome text with them.
file(GLOB BLOKDUST_WEB_ASSETS CONFIGURE_DEPENDS "${BLOKDUST_WEB_DIST}/assets/*.js" "${BLOKDUST_WEB_DIST}/assets/*.css"
     "${BLOKDUST_WEB_DIST}/fonts/*.woff2")
juce_add_binary_data(blokdust_plugin_resources
  SOURCES "${BLOKDUST_WEB_DIST}/index.html" ${BLOKDUST_WEB_ASSETS}
          # Start patches (CHG-0010): the instrument opens an empty scene, FX opens Audio In alone; the standalone app's
          # first launch opens the Rotating Sequencer preset (CHG-0013; later launches restore the last session).
          "${CMAKE_SOURCE_DIR}/web/src/demo/plugin-start.patch.json" "${CMAKE_SOURCE_DIR}/web/src/demo/fx.patch.json"
          "${CMAKE_SOURCE_DIR}/web/src/patch/presets/04-rotating-sequencer.blokdust"
          # The licences travel inside every plugin (CHG-0005 task 11): v1's MIT notice and the others, and the AGPL.
          "${BLOKDUST_WEB_DIST}/NOTICE.txt" "${BLOKDUST_WEB_DIST}/LICENSE.txt")

# Two plugins from one codebase (PLUGIN-0002): BlokDust (instrument) and BlokDust FX (audio effect, Audio In).
function(blokdust_plugin target)
  cmake_parse_arguments(ARG "" "PRODUCT;CODE;FX" "FORMATS" ${ARGN})
  if(ARG_FX)
    set(synth FALSE)
    set(midi_in FALSE)
    set(au_type kAudioUnitType_Effect)
    set(vst3_cat Fx)
  else()
    set(synth TRUE)
    set(midi_in TRUE)
    set(au_type kAudioUnitType_MusicDevice)
    set(vst3_cat Instrument Synth)
  endif()
  # Bundle IDs under Funputs, lowercase like FUNPUTS' plug-ins (owner, 2026-11-15; blokdust.com is not the owner's):
  # com.funputs.blokdust, com.funputs.blokdustfx. Hosts find AUs and VST3s by their codes, which do not change.
  string(TOLOWER "com.funputs.${target}" bundle_id)
  # iPadOS rounds the icon itself and shows transparency as white: a full-bleed square there (CHG-0025).
  if(IOS)
    set(icon "${CMAKE_SOURCE_DIR}/assets/app-icon-ios.png")
  else()
    set(icon "${CMAKE_SOURCE_DIR}/assets/app-icon.png")
  endif()
  if(IOS AND ARG_FX)
    # On iPad FX is a second extension inside the BlokDust app, so its ID must sit under the app's (CHG-0025 task 9):
    # com.funputs.blokdust.fx; JUCE names the extension com.funputs.blokdust.fx.fxAUv3.
    set(bundle_id "com.funputs.blokdust.fx")
  endif()
  if(IOS)
    set(mic FALSE)
    set(app_groups TRUE)
  else()
    set(mic TRUE)
    set(app_groups FALSE)
  endif()
  juce_add_plugin(${target}
    PRODUCT_NAME "${ARG_PRODUCT}"
    COMPANY_NAME "BlokDust"
    BUNDLE_ID "${bundle_id}"
    PLUGIN_MANUFACTURER_CODE Bldt
    PLUGIN_CODE ${ARG_CODE}
    FORMATS ${ARG_FORMATS}
    # The app icon (CHG-0010): the site favicon's style, assets/app-icon.svg; JUCE makes the .icns / .ico from it.
    ICON_BIG "${icon}"
    IS_SYNTH ${synth}
    NEEDS_MIDI_INPUT ${midi_in}
    NEEDS_MIDI_OUTPUT FALSE
    AU_MAIN_TYPE ${au_type}
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    NEEDS_WEBVIEW2 TRUE
    COPY_PLUGIN_AFTER_BUILD FALSE
    HARDENED_RUNTIME_ENABLED TRUE
    # Audio In (FX) in the Standalone uses the microphone/line input: hardened runtime needs the entitlement and
    # macOS needs a usage string, or input is silently denied.
    HARDENED_RUNTIME_OPTIONS com.apple.security.device.audio-input
    # Not on iPad (CHG-0025 task 4): the app plays output only, and an AUv3 hears its host's audio without the mic.
    MICROPHONE_PERMISSION_ENABLED ${mic}
    MICROPHONE_PERMISSION_TEXT "BlokDust FX uses audio input for its Audio In block."
    VST3_CATEGORIES ${vst3_cat}
    # iPadOS (CHG-0025): iPad only (UI-0004); the AUv3 extension lives in the Standalone app. Hosts (AUM, GarageBand,
    # Logic for iPad, Cubasis) list it under the manufacturer name.
    TARGETED_DEVICE_FAMILY 2
    IPAD_SCREEN_ORIENTATIONS UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight
      UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown
    REQUIRES_FULL_SCREEN FALSE
    STATUS_BAR_HIDDEN TRUE
    FILE_SHARING_ENABLED TRUE
    DOCUMENT_BROWSER_ENABLED TRUE
    LAUNCH_STORYBOARD_FILE "${CMAKE_CURRENT_SOURCE_DIR}/ios/LaunchScreen.storyboard"
    # Patches, recordings and SampleGen audio shared by the app and the AUv3 (CHG-0025 task 5; PatchFiles.h).
    APP_GROUPS_ENABLED ${app_groups}
    APP_GROUP_IDS ${BLOKDUST_APP_GROUP})
  if(IOS)
    target_compile_definitions(${target} PUBLIC BLOKDUST_APP_GROUP="${BLOKDUST_APP_GROUP}")
    target_sources(${target} PRIVATE src/ios/NativeSignIn.mm)  # Sign in with Apple and passkeys in the app (SHARING-0011)
    set_source_files_properties(src/ios/NativeSignIn.mm PROPERTIES COMPILE_OPTIONS -fobjc-arc)
    target_link_libraries(${target} PRIVATE "-framework AuthenticationServices")
  endif()
  target_sources(${target} PRIVATE src/PluginProcessor.cpp src/PluginEditor.cpp src/Samples.cpp src/PatchFiles.cpp src/StageWorlds.cpp src/AccountStore.cpp src/Telemetry.cpp)
  if(APPLE)
    target_sources(${target} PRIVATE src/WebViewDrops.mm)
  else()
    target_sources(${target} PRIVATE src/WebViewDrops.cpp)
  endif()
  target_compile_definitions(${target} PUBLIC JUCE_WEB_BROWSER=1 JUCE_USE_CURL=0 JUCE_VST3_CAN_REPLACE_VST2=0
    BLOKDUST_FX=$<BOOL:${ARG_FX}> JUCE_USE_MP3AUDIOFORMAT=1)
  # Windows: the resource provider needs the WebView2 backend, and JUCE must use the *statically linked* loader;
  # otherwise it looks for WebView2Loader.dll beside the host's exe, fails, and silently falls back to Internet
  # Explorer (blank editor, pluginval still passes). Windows compatibility requirement; `bd win plugin` checks it
  # by requiring the web UI's bd_ready round-trip.
  if(WIN32)
    target_compile_definitions(${target} PUBLIC JUCE_USE_WIN_WEBVIEW2=1 JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1)
  endif()
  target_link_libraries(${target}
    PRIVATE blokdust_patch blokdust_plugin_resources juce::juce_audio_utils juce::juce_gui_extra juce::juce_cryptography
    PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_warning_flags)
endfunction()

if(IOS)
  # iPadOS (CHG-0025): the instrument as an AUv3 inside the BlokDust app (JUCE needs the Standalone as its container),
  # and BlokDust FX as a second AUv3 in the same app (task 9): one App Store product holds both.
  blokdust_plugin(BlokDust PRODUCT "BlokDust" CODE Bdst FORMATS AUv3 Standalone)
  blokdust_plugin(BlokDustFX PRODUCT "BlokDust FX" CODE Bdfx FX TRUE FORMATS AUv3)
  add_dependencies(BlokDust_Standalone BlokDustFX_AUv3)
  set_target_properties(BlokDust_Standalone PROPERTIES XCODE_EMBED_APP_EXTENSIONS "BlokDust_AUv3;BlokDustFX_AUv3")
  # The app is our own, output only (CHG-0025 task 4; plugin/src/ios/ContainerApp.mm): JUCE's standalone app opens a
  # play-and-record session at launch (a microphone prompt; a Core Audio deadlock in the Simulator).
  target_compile_definitions(BlokDust_Standalone PRIVATE JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP=1)
  target_sources(BlokDust_Standalone PRIVATE src/ios/ContainerApp.mm)
  set_source_files_properties(src/ios/ContainerApp.mm PROPERTIES COMPILE_OPTIONS -fobjc-arc)
  target_link_libraries(BlokDust_Standalone PRIVATE "-framework AVFoundation")
  # Sign in with Apple and the site's passkeys in the app (SHARING-0011): JUCE's entitlements plus those two, once the
  # App ID has both capabilities (BLOKDUST_IOS_NATIVE_SIGN_IN=1; without them the app signs in with a code only). The
  # sites whose passkeys it may use come from BLOKDUST_WEBCREDENTIALS (hosts, ';'-separated; bd plugin ios device adds
  # the review site from local config); each site serves /.well-known/apple-app-site-association.
  if("$ENV{BLOKDUST_IOS_NATIVE_SIGN_IN}" STREQUAL "1")
  target_compile_definitions(BlokDust PUBLIC BLOKDUST_NATIVE_SIGN_IN=1)
  set(webcredentials "blokdust.funputs.com")
  if(DEFINED ENV{BLOKDUST_WEBCREDENTIALS} AND NOT "$ENV{BLOKDUST_WEBCREDENTIALS}" STREQUAL "")
    set(webcredentials "$ENV{BLOKDUST_WEBCREDENTIALS}")
  endif()
  set(BLOKDUST_DOMAINS "")
  foreach(host IN LISTS webcredentials)
    string(APPEND BLOKDUST_DOMAINS "\t\t<string>webcredentials:${host}</string>\n")
  endforeach()
  set(BLOKDUST_APP_GROUP_ID "${BLOKDUST_APP_GROUP}")
  configure_file(ios/BlokDust_Standalone.entitlements.in "${CMAKE_CURRENT_BINARY_DIR}/BlokDust_Standalone.entitlements" @ONLY)
  set_target_properties(BlokDust_Standalone PROPERTIES XCODE_ATTRIBUTE_CODE_SIGN_ENTITLEMENTS "${CMAKE_CURRENT_BINARY_DIR}/BlokDust_Standalone.entitlements")
  endif()
  # The extension's ID is JUCE's: <app id>.<last part>AUv3 = com.funputs.blokdust.blokdustAUv3 (juceaide writes it into
  # the extension's Info.plist; no CMake property changes it). Users never see it.
  return()
endif()

# BlokDust FX is a plug-in only (CHG-0010): an effect needs a host track, so it has no Standalone app.
blokdust_plugin(BlokDust PRODUCT "BlokDust" CODE Bdst FORMATS VST3 AU Standalone)
blokdust_plugin(BlokDustFX PRODUCT "BlokDust FX" CODE Bdfx FX TRUE FORMATS VST3 AU)

# Headless host test: loads the built plugin binary like a DAW.
juce_add_console_app(blokdust_host_test PRODUCT_NAME "blokdust_host_test")
target_sources(blokdust_host_test PRIVATE tests/host_render.cpp src/PatchFiles.cpp src/StageWorlds.cpp)
target_include_directories(blokdust_host_test PRIVATE src)
target_compile_definitions(blokdust_host_test PRIVATE JUCE_PLUGINHOST_VST3=1 JUCE_PLUGINHOST_AU=1 JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0
  JUCE_MODAL_LOOPS_PERMITTED=1)
target_link_libraries(blokdust_host_test PRIVATE juce::juce_audio_processors juce::juce_audio_utils blokdust_engine blokdust_patch nlohmann_json::nlohmann_json
  juce::juce_recommended_config_flags)
