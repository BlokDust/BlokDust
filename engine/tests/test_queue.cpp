#include <catch2/catch_test_macros.hpp>

#include "blokdust/spsc_queue.hpp"

TEST_CASE("SPSC queue preserves FIFO order and reports full/empty") {
  blokdust::SpscQueue<int, 8> q;
  CHECK(q.front() == nullptr);
  for (int i = 0; i < 8; ++i)
    REQUIRE(q.push(i));
  CHECK_FALSE(q.push(99));
  CHECK(q.size() == 8);
  for (int i = 0; i < 8; ++i) {
    REQUIRE(q.front() != nullptr);
    CHECK(*q.front() == i);
    q.pop();
  }
  CHECK(q.front() == nullptr);
  REQUIRE(q.push(42));  // wraps around
  CHECK(*q.front() == 42);
}
