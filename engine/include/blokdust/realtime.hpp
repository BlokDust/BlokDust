// Real-time safety (CHG-0045): code that runs on the audio thread may not allocate, lock, block or
// throw. BLOKDUST_NONBLOCKING marks it; Clang proves it while compiling (-Wfunction-effects) and
// the rtsan preset checks it while the tests run. Other compilers ignore the mark.
#pragma once

#if defined(__clang__) && defined(__has_cpp_attribute)
#if __has_cpp_attribute(clang::nonblocking)
#define BLOKDUST_NONBLOCKING [[clang::nonblocking]]
#endif
#endif
#ifndef BLOKDUST_NONBLOCKING
#define BLOKDUST_NONBLOCKING
#endif
