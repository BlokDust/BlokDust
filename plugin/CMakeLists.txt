# BlokDust plugin shell (PLUGIN-0001): JUCE 8 → VST3 / AU / Standalone, WebView editor hosting web/dist.
# Build via `pnpm bd plugin build` (needs `pnpm web:build` first: the web bundle is embedded as BinaryData).
include(FetchContent)
FetchContent_Declare(JUCE GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 8.0.15 GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(JUCE)

set(BLOKDUST_WEB_DIST "${CMAKE_SOURCE_DIR}/web/dist")
if(NOT EXISTS "${BLOKDUST_WEB_DIST}/index.html")
  message(FATAL_ERROR "web/dist missing: run `pnpm web:build` before building the plugin")
endif()
# v1 fonts (web/public/fonts, OFL) are embedded too: the editor draws v1 chrome text with them.
file(GLOB BLOKDUST_WEB_ASSETS CONFIGURE_DEPENDS "${BLOKDUST_WEB_DIST}/assets/*.js" "${BLOKDUST_WEB_DIST}/assets/*.css"
     "${BLOKDUST_WEB_DIST}/fonts/*.woff2")
juce_add_binary_data(blokdust_plugin_resources
  SOURCES "${BLOKDUST_WEB_DIST}/index.html" ${BLOKDUST_WEB_ASSETS}
          # Start patches (CHG-0010): the instrument opens an empty scene, FX opens Audio In alone.
          "${CMAKE_SOURCE_DIR}/web/src/demo/plugin-start.patch.json" "${CMAKE_SOURCE_DIR}/web/src/demo/fx.patch.json"
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
  juce_add_plugin(${target}
    PRODUCT_NAME "${ARG_PRODUCT}"
    COMPANY_NAME "BlokDust"
    BUNDLE_ID "com.blokdust.${target}"
    PLUGIN_MANUFACTURER_CODE Bldt
    PLUGIN_CODE ${ARG_CODE}
    FORMATS ${ARG_FORMATS}
    # The app icon (CHG-0010): the site favicon's style, assets/app-icon.svg; JUCE makes the .icns / .ico from it.
    ICON_BIG "${CMAKE_SOURCE_DIR}/assets/app-icon.png"
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
    MICROPHONE_PERMISSION_ENABLED TRUE
    MICROPHONE_PERMISSION_TEXT "BlokDust FX uses audio input for its Audio In block."
    VST3_CATEGORIES ${vst3_cat})
  target_sources(${target} PRIVATE src/PluginProcessor.cpp src/PluginEditor.cpp src/Samples.cpp src/PatchFiles.cpp)
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

# BlokDust FX is a plug-in only (CHG-0010): an effect needs a host track, so it has no Standalone app.
blokdust_plugin(BlokDust PRODUCT "BlokDust" CODE Bdst FORMATS VST3 AU Standalone)
blokdust_plugin(BlokDustFX PRODUCT "BlokDust FX" CODE Bdfx FX TRUE FORMATS VST3 AU)

# Headless host test: loads the built plugin binary like a DAW.
juce_add_console_app(blokdust_host_test PRODUCT_NAME "blokdust_host_test")
target_sources(blokdust_host_test PRIVATE tests/host_render.cpp src/PatchFiles.cpp)
target_include_directories(blokdust_host_test PRIVATE src)
target_compile_definitions(blokdust_host_test PRIVATE JUCE_PLUGINHOST_VST3=1 JUCE_PLUGINHOST_AU=1 JUCE_WEB_BROWSER=0 JUCE_USE_CURL=0
  JUCE_MODAL_LOOPS_PERMITTED=1)
target_link_libraries(blokdust_host_test PRIVATE juce::juce_audio_processors juce::juce_audio_utils blokdust_engine nlohmann_json::nlohmann_json
  juce::juce_recommended_config_flags)
