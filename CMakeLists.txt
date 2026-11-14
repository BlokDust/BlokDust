cmake_minimum_required(VERSION 3.28)

# macOS: the minimum version and architectures, BEFORE project() (CHG-0005 task 12). project() creates
# CMAKE_OSX_DEPLOYMENT_TARGET as an empty cache entry, and a later set() without FORCE does nothing: every binary then
# silently requires the build machine's macOS (the host version). Overwrite an empty
# value, leave a deliberate one alone. Check: `vtool -show-build <binary>` shows minos 11.0.
if(APPLE)
  if(NOT CMAKE_OSX_DEPLOYMENT_TARGET)
    set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS version" FORCE)
  endif()
  option(BLOKDUST_UNIVERSAL "Build arm64 + x86_64 (release installers)" OFF)
  if(BLOKDUST_UNIVERSAL)
    set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "" FORCE)
  endif()
endif()
# One version for everything (CHG-0005 task 12): the root package.json's "version" (the web app reads it too).
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/package.json" BLOKDUST_PACKAGE_JSON)
string(JSON BLOKDUST_VERSION GET "${BLOKDUST_PACKAGE_JSON}" version)
project(blokdust LANGUAGES C CXX VERSION ${BLOKDUST_VERSION})

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
option(BLOKDUST_BUILD_TESTS "Build engine tests" ON)

if(BLOKDUST_BUILD_TESTS)
  enable_testing()
endif()

add_subdirectory(engine)

option(BLOKDUST_BUILD_PLUGIN "Build the JUCE plugin (VST3/AU/Standalone)" OFF)
if(BLOKDUST_BUILD_PLUGIN)
  add_subdirectory(plugin)
endif()
