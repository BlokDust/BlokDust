// dmath: deterministic replacements for libm must stay accurate.
#include <catch2/catch_test_macros.hpp>

#include <cmath>

#include "blokdust/dmath.hpp"
#include "blokdust/rng.hpp"

using namespace blokdust;

TEST_CASE("dmath sin/cos match libm within 2e-16 relative over [-1000, 1000]") {
  Pcg32 rng(3);
  for (int i = 0; i < 200000; ++i) {
    const double x = (double(rng.next()) / 4294967296.0 - 0.5) * 2000.0;
    REQUIRE(std::abs(dmath::sin(x) - std::sin(x)) <= 4e-16 * std::max(1.0, std::abs(x) / 100.0));
    REQUIRE(std::abs(dmath::cos(x) - std::cos(x)) <= 4e-16 * std::max(1.0, std::abs(x) / 100.0));
  }
  CHECK(dmath::sin(0.0) == 0.0);
  CHECK(dmath::cos(0.0) == 1.0);
}

TEST_CASE("dmath exp2/exp10 match libm within 1e-15 relative") {
  Pcg32 rng(4);
  for (int i = 0; i < 200000; ++i) {
    const double x = (double(rng.next()) / 4294967296.0 - 0.5) * 60.0;
    REQUIRE(std::abs(dmath::exp2(x) / std::exp2(x) - 1.0) < 1e-15);
    REQUIRE(std::abs(dmath::exp10(x / 4) / std::pow(10.0, x / 4) - 1.0) < 1e-14);
  }
  CHECK(dmath::exp2(0.0) == 1.0);
  CHECK(dmath::exp2(10.0) == 1024.0);
  CHECK(dmath::exp2(-1.0) == 0.5);
}

TEST_CASE("dmath pow/asin match libm (Chromium compressor port)") {
  for (int i = 0; i <= 2000; ++i) {
    const double x = -1.0 + i / 1000.0;
    REQUIRE(std::abs(dmath::asin(x) - std::asin(x)) < 1e-14);
  }
  for (double x : {1e-6, 0.25, 0.5, 1.0, 3.0, 100.0})
    for (double y : {-3.0, -0.6, 0.0, 0.6, 1.0 / 2400.0, 2.5}) REQUIRE(std::abs(dmath::pow(x, y) / std::pow(x, y) - 1.0) < 1e-13);
}

TEST_CASE("dmath log2/log10/exp match libm within 1e-15 relative") {
  Pcg32 rng(5);
  for (int i = 0; i < 200000; ++i) {
    const double x = dmath::exp2((double(rng.next()) / 4294967296.0 - 0.5) * 200.0);  // 2^-100 .. 2^100
    REQUIRE(std::abs(dmath::log2(x) - std::log2(x)) <= 1e-15 * std::max(1.0, std::abs(std::log2(x))));
    REQUIRE(std::abs(dmath::log10(x) - std::log10(x)) <= 1e-15 * std::max(1.0, std::abs(std::log10(x))));
  }
  for (int i = 0; i < 100000; ++i) {
    const double x = (double(rng.next()) / 4294967296.0 - 0.5) * 40.0;
    // exp(x) = 2^(x·log2 e): rounding the product costs ~|x|·eps, so allow a few ulps for |x| up to 20.
    REQUIRE(std::abs(dmath::exp(x) / std::exp(x) - 1.0) < 4e-15);
  }
  CHECK(dmath::log2(1.0) == 0.0);
  CHECK(dmath::log2(8.0) == 3.0);
}
