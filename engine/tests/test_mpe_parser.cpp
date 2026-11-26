// PLUGIN-0004: the C++ MPE parser (engine/include/blokdust/mpe.hpp, used by the plugin) on the
// shared recorded streams in tests/mpe/*.json; web/src/input/mpe.ts runs the same files
// (tests/mpe/run.ts).
#include <catch2/catch_test_macros.hpp>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <string>

#include <nlohmann/json.hpp>

#include "blokdust/mpe.hpp"

using namespace blokdust;

TEST_CASE(
    "MPE parser (C++): every recorded stream in tests/mpe gives exactly the expected engine "
    "commands") {
  int files = 0;
  for (const auto& f : std::filesystem::directory_iterator(BD_MPE_FIXTURES)) {
    if (f.path().extension() != ".json")
      continue;
    ++files;
    INFO(f.path().filename().string());
    const auto j = nlohmann::json::parse(std::ifstream(f.path()));
    MpeParser p(7);
    p.setSettings({j["settings"].value("mpe", false), 48.0, 2.0});
    std::vector<Command> out;
    for (const auto& m : j["messages"])
      p.message(m[1].get<std::uint8_t>(), m[2].get<std::uint8_t>(), m[3].get<std::uint8_t>(),
                m[0].get<std::int64_t>(), [&](const Command& c) { out.push_back(c); });
    const auto& want = j["expect"];
    REQUIRE(out.size() == want.size());
    for (std::size_t i = 0; i < out.size(); ++i) {
      INFO("command " << i);
      const auto& w = want[i];
      const Command& c = out[i];
      const std::string kind = w[1];
      CHECK(c.id == 7);
      CHECK(c.atSample == w[0].get<std::int64_t>());
      CHECK(c.param == w[2].get<int>());
      CHECK(static_cast<int>(c.x) == w[3].get<int>());
      if (kind == "on") {
        CHECK(c.type == Command::Type::NoteOn);
        CHECK(std::abs(c.value - w[4].get<double>()) < 1e-12);
      } else if (kind == "off")
        CHECK(c.type == Command::Type::NoteOff);
      else {
        CHECK(c.type == Command::Type::NoteExpression);
        CHECK(static_cast<int>(c.y) == (kind == "bend" ? 0 : kind == "pressure" ? 1 : 2));
        CHECK(std::abs(c.value - w[4].get<double>()) < 1e-12);
      }
    }
  }
  CHECK(files >= 3);
}
