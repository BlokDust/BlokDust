#pragma once
// Deterministic transcendental functions (SIMULATION-0001).
// libm implementations (Apple, glibc, musl/Emscripten) differ in the last ulp, which breaks
// bit-identical output across platforms. These use only IEEE-754 basic operations (+ − × ÷, floor,
// ldexp, sqrt — all exactly specified), so with -ffp-contract=off and no fast-math they produce
// identical bits everywhere. Accuracy ≈ 1 ulp, plenty for audio.
#include <cmath>

namespace blokdust::dmath {

inline constexpr double kPi = 3.14159265358979323846;
inline constexpr double kTwoPi = 6.28318530717958647692;

namespace detail {
// fdlibm __kernel_sin / __kernel_cos minimax coefficients, valid for |x| <= pi/4.
inline double kernelSin(double x) noexcept {
  constexpr double S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03,
                   S3 = -1.98412698298579493134e-04, S4 = 2.75573137070700676789e-06,
                   S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
  const double z = x * x;
  return x + x * z * (S1 + z * (S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)))));
}
inline double kernelCos(double x) noexcept {
  constexpr double C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03,
                   C3 = 2.48015872894767294178e-05, C4 = -2.75573143513906633035e-07,
                   C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
  const double z = x * x;
  return 1.0 - 0.5 * z + z * z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
}
/// Cody–Waite reduction: x = n·(π/2) + r, |r| <= π/4. Accurate for |x| < ~1e6 (all our arguments
/// are small).
inline double reduce(double x, int& quadrant) noexcept {
  constexpr double kInvPio2 = 6.36619772367581382433e-01, kPio2Hi = 1.57079632673412561417e+00,
                   kPio2Lo = 6.07710050650619224932e-11;
  const double n = std::floor(x * kInvPio2 + 0.5);
  quadrant = static_cast<int>(static_cast<long long>(n) & 3);
  return (x - n * kPio2Hi) - n * kPio2Lo;
}
}  // namespace detail

inline double sin(double x) noexcept {
  int q = 0;
  const double r = detail::reduce(x, q);
  switch (q) {
    case 0:
      return detail::kernelSin(r);
    case 1:
      return detail::kernelCos(r);
    case 2:
      return -detail::kernelSin(r);
    default:
      return -detail::kernelCos(r);
  }
}
inline double cos(double x) noexcept {
  int q = 0;
  const double r = detail::reduce(x, q);
  switch (q) {
    case 0:
      return detail::kernelCos(r);
    case 1:
      return -detail::kernelSin(r);
    case 2:
      return -detail::kernelCos(r);
    default:
      return detail::kernelSin(r);
  }
}

/// 2^x: round to nearest integer n, 2^f for f in [-0.5, 0.5] by Taylor series of e^(f·ln2) (error <
/// 2e-16), then exact ldexp.
inline double exp2(double x) noexcept {
  constexpr double kLn2 = 6.93147180559945309417e-01;
  const double n = std::floor(x + 0.5);
  const double t = (x - n) * kLn2;
  double p = 1.0 / 6227020800.0;  // 1/13!
  constexpr double kInvFact[] = {1.0 / 479001600.0,
                                 1.0 / 39916800.0,
                                 1.0 / 3628800.0,
                                 1.0 / 362880.0,
                                 1.0 / 40320.0,
                                 1.0 / 5040.0,
                                 1.0 / 720.0,
                                 1.0 / 120.0,
                                 1.0 / 24.0,
                                 1.0 / 6.0,
                                 0.5,
                                 1.0,
                                 1.0};
  for (double c : kInvFact)
    p = p * t + c;
  return std::ldexp(p, static_cast<int>(n));
}

/// 10^x via 2^(x·log2 10).
inline double exp10(double x) noexcept {
  return exp2(x * 3.32192809488736234787);
}
/// e^x via 2^(x·log2 e).
inline double exp(double x) noexcept {
  return exp2(x * 1.44269504088896340736);
}

/// log2(x) for x > 0: exact frexp split, mantissa folded into [√½, √2), then 2·atanh(s) series (|s|
/// < 0.172).
inline double log2(double x) noexcept {
  int e = 0;
  double m = std::frexp(x, &e);  // x = m · 2^e, m in [0.5, 1)
  if (m < 0.70710678118654752440) {
    m *= 2.0;
    --e;
  }
  const double s = (m - 1.0) / (m + 1.0), s2 = s * s;
  double p = 1.0 / 21.0;
  constexpr double kInvOdd[] = {1.0 / 19.0, 1.0 / 17.0, 1.0 / 15.0, 1.0 / 13.0, 1.0 / 11.0,
                                1.0 / 9.0,  1.0 / 7.0,  1.0 / 5.0,  1.0 / 3.0,  1.0};
  for (double c : kInvOdd)
    p = p * s2 + c;
  return static_cast<double>(e) + 2.0 * s * p * 1.44269504088896340736;
}
/// log10(x) for x > 0.
inline double log10(double x) noexcept {
  return log2(x) * 0.30102999566398119521;
}

/// x^y for x > 0 (0 for x == 0).
inline double pow(double x, double y) noexcept {
  return x > 0.0 ? exp2(y * log2(x)) : 0.0;
}

/// asin(x) for x in [-1, 1]: Newton iterations on dmath::sin (basic ops only, so deterministic).
/// Near |x| = 1 it uses asin(x) = π/2 − 2·asin(√((1−x)/2)) to keep the derivative away from zero.
inline double asin(double x) noexcept {
  if (x < 0.0)
    return -asin(-x);
  if (x >= 1.0)
    return kPi / 2.0;
  if (x > 0.5)
    return kPi / 2.0 - 2.0 * asin(std::sqrt((1.0 - x) * 0.5));
  double y = x + x * x * x / 6.0;  // series start, |x| <= 0.5
  for (int i = 0; i < 6; ++i)
    y -= (sin(y) - x) / cos(y);
  return y;
}

}  // namespace blokdust::dmath
