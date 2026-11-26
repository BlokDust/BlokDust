# CHG-0045: one warning set for all of our C++ (engine, its tests and tools, the plugin's own sources).
# The dev, release, asan, wasm and plugin presets turn BLOKDUST_WARNINGS_AS_ERRORS on, so a warning fails the build.
option(BLOKDUST_WARNINGS_AS_ERRORS "Fail the build on any compiler warning" OFF)

if(MSVC)
  set(BLOKDUST_WARNING_FLAGS /W4 /permissive-)
  set(BLOKDUST_ERROR_FLAG /WX)
else()
  set(BLOKDUST_WARNING_FLAGS -Wall -Wextra -Wpedantic -Wshadow -Wconversion -Wno-sign-conversion
    -Wold-style-cast -Wimplicit-fallthrough -Wnull-dereference)
  set(BLOKDUST_ERROR_FLAG -Werror)
endif()
include(CheckCXXCompilerFlag)
# Clang 22+ calls __COUNTER__ (used by Catch2's TEST_CASE) a C2y extension under -Wpedantic.
check_cxx_compiler_flag(-Wc2y-extensions BLOKDUST_HAS_WC2Y_EXTENSIONS)
if(BLOKDUST_HAS_WC2Y_EXTENSIONS)
  list(APPEND BLOKDUST_WARNING_FLAGS -Wno-c2y-extensions)
endif()
if(BLOKDUST_WARNINGS_AS_ERRORS)
  list(APPEND BLOKDUST_WARNING_FLAGS ${BLOKDUST_ERROR_FLAG})
endif()

# Every source of `target` (for our own libraries, tests and tools).
function(blokdust_strict_warnings target)
  target_compile_options(${target} PRIVATE ${BLOKDUST_WARNING_FLAGS})
endfunction()

# Only the listed sources (a JUCE target also compiles JUCE's own modules, which keep JUCE's warnings).
# JUCE's recommended flags add -Wfloat-equal; the engine compares floats exactly on purpose
# (SIMULATION-0001: settled values and sentinels are exact), so it stays off.
function(blokdust_strict_warnings_for_sources)
  set(flags ${BLOKDUST_WARNING_FLAGS})
  if(NOT MSVC)
    list(APPEND flags -Wno-float-equal)
  endif()
  set_property(SOURCE ${ARGN} APPEND PROPERTY COMPILE_OPTIONS ${flags})
endfunction()

# Real-time safety (CHG-0045): functions marked BLOKDUST_NONBLOCKING ([[clang::nonblocking]]) may not allocate, lock,
# throw or call anything that might; Clang checks it while compiling (-Wfunction-effects).
function(blokdust_realtime_checks target)
  if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    target_compile_options(${target} PRIVATE -Wfunction-effects)
  endif()
endfunction()
