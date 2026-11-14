# BlokDust engine: portable C++20, no framework dependencies (ARCHITECTURE-0001).
add_library(blokdust_engine STATIC
  src/connections.cpp
  src/convolver.cpp
  src/engine.cpp
  src/wavetable.cpp
)
target_include_directories(blokdust_engine PUBLIC include)
target_compile_features(blokdust_engine PUBLIC cxx_std_20)

# Determinism (SIMULATION-0001): never enable fast-math; keep IEEE semantics everywhere.
if(MSVC)
  target_compile_options(blokdust_engine PRIVATE /W4 /permissive- /fp:precise)
else()
  target_compile_options(blokdust_engine PRIVATE -Wall -Wextra -Wpedantic -Wshadow -Wconversion -Wno-sign-conversion
    -fno-fast-math -ffp-contract=off)
endif()

# ---- WebAssembly build (Emscripten): standalone .wasm with a flat C API (wasm/bindings.cpp) ----
if(EMSCRIPTEN)
  add_executable(blokdust_wasm wasm/bindings.cpp)
  target_link_libraries(blokdust_wasm PRIVATE blokdust_engine)
  set_target_properties(blokdust_wasm PROPERTIES OUTPUT_NAME blokdust SUFFIX ".wasm")
  target_compile_options(blokdust_wasm PRIVATE -fno-exceptions -ffp-contract=off)
  target_link_options(blokdust_wasm PRIVATE -sSTANDALONE_WASM=1 --no-entry -sFILESYSTEM=0 -sINITIAL_MEMORY=67108864
    -sALLOW_MEMORY_GROWTH=1 -sSTACK_SIZE=1048576 -fno-exceptions)
  return()
endif()

# ---- patch loader (JSON → commands) + offline renderer: tooling and plugin, never the audio thread ----
option(BLOKDUST_BUILD_TOOLS "Build patch loader and render CLI" ON)
if(BLOKDUST_BUILD_TOOLS)
  include(FetchContent)
  FetchContent_Declare(nlohmann_json
    URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
    URL_HASH SHA256=d6c65aca6b1ed68e7a182f4757257b107ae403032760ed6ef121c9d55e81757d)
  FetchContent_MakeAvailable(nlohmann_json)

  add_library(blokdust_patch STATIC patch/src/patch_loader.cpp)
  target_include_directories(blokdust_patch PUBLIC patch/include)
  target_link_libraries(blokdust_patch PUBLIC blokdust_engine nlohmann_json::nlohmann_json)

  add_executable(blokdust_render tools/render/main.cpp)
  target_link_libraries(blokdust_render PRIVATE blokdust_patch)
endif()

if(BLOKDUST_BUILD_TESTS)
  include(FetchContent)
  FetchContent_Declare(Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG v3.8.1
    GIT_SHALLOW TRUE)
  FetchContent_MakeAvailable(Catch2)

  add_executable(blokdust_engine_tests
    tests/test_catalogue.cpp
    tests/test_dmath.cpp
    tests/test_ftz.cpp
    tests/test_lasers.cpp
    tests/test_audio_graph.cpp
    tests/test_controllers.cpp
    tests/test_queue.cpp
    tests/test_connections.cpp
    tests/test_simulation.cpp
    tests/test_audio.cpp
    tests/test_determinism.cpp
    tests/test_review_fixes.cpp
    tests/test_mpe.cpp
    tests/test_tempo.cpp
    tests/test_world_power.cpp
    tests/test_emitter_hit.cpp
    tests/test_granular.cpp
    tests/test_compressor.cpp
    tests/test_gates.cpp
    tests/test_sound_laser.cpp
  )
  target_link_libraries(blokdust_engine_tests PRIVATE blokdust_engine Catch2::Catch2WithMain)
  # Shared MIDI/MPE streams (tests/mpe/*.json), also run by the web parser (PLUGIN-0004).
  if(BLOKDUST_BUILD_TOOLS)
    target_sources(blokdust_engine_tests PRIVATE tests/test_mpe_parser.cpp)
    target_link_libraries(blokdust_engine_tests PRIVATE nlohmann_json::nlohmann_json)
    target_compile_definitions(blokdust_engine_tests PRIVATE BD_MPE_FIXTURES="${CMAKE_CURRENT_SOURCE_DIR}/../tests/mpe")
  endif()
  if(NOT MSVC)
    target_compile_options(blokdust_engine_tests PRIVATE -ffp-contract=off)
  endif()

  list(APPEND CMAKE_MODULE_PATH ${catch2_SOURCE_DIR}/extras)
  include(Catch)
  catch_discover_tests(blokdust_engine_tests)
endif()
