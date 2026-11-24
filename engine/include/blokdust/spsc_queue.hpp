#pragma once
// Wait-free single-producer/single-consumer ring buffer (control thread -> audio thread). No
// allocation after construction.
#include <array>
#include <atomic>
#include <cstddef>

namespace blokdust {

template <typename T, std::size_t Capacity>
class SpscQueue {
  static_assert((Capacity & (Capacity - 1)) == 0, "Capacity must be a power of two");

 public:
  bool push(const T& v) noexcept {
    const auto head = head_.load(std::memory_order_relaxed);
    if (head - tail_.load(std::memory_order_acquire) == Capacity)
      return false;
    buf_[head & (Capacity - 1)] = v;
    head_.store(head + 1, std::memory_order_release);
    return true;
  }
  /// Consumer: pointer to the oldest element, or nullptr if empty.
  const T* front() const noexcept {
    const auto tail = tail_.load(std::memory_order_relaxed);
    if (tail == head_.load(std::memory_order_acquire))
      return nullptr;
    return &buf_[tail & (Capacity - 1)];
  }
  void pop() noexcept {
    tail_.store(tail_.load(std::memory_order_relaxed) + 1, std::memory_order_release);
  }
  std::size_t size() const noexcept {
    return head_.load(std::memory_order_acquire) - tail_.load(std::memory_order_acquire);
  }

 private:
  std::array<T, Capacity> buf_{};
  alignas(64) std::atomic<std::size_t> head_{0};
  alignas(64) std::atomic<std::size_t> tail_{0};
};

}  // namespace blokdust
