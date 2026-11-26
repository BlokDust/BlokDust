// Generated catalogue (DATA-0002) is wired into the engine correctly.
#include <catch2/catch_test_macros.hpp>

#include "blokdust/generated/blocks.gen.hpp"
#include "blokdust/world.hpp"

using namespace blokdust;

TEST_CASE("catalogue has every v1 block with kinds and catchments from manifests") {
  STATIC_REQUIRE(
      gen::kBlockTypeCount >=
      33);  // 32 v1 blocks + source.audio-in (PLUGIN-0002) + the post-2.0 blocks (SCOPE-0005)
  int fromV1 = 0;
  for (const auto& b : gen::kBlocks)
    fromV1 += !b.v1Type.empty();
  CHECK(fromV1 == 32);
  CHECK(gen::info(BlockType::SourceTone).kind == BlockKind::AudioSource);
  CHECK(gen::info(BlockType::SourceTone).v1Type == "ToneSource");
  CHECK(gen::info(BlockType::FxFilter).kind == BlockKind::PostEffect);
  CHECK(gen::info(BlockType::FxFilter).catchment == 6.0f);
  CHECK(gen::info(BlockType::FxEnvelope).kind == BlockKind::PreEffect);
  CHECK(gen::info(BlockType::PowerEmitter).kind == BlockKind::PowerSource);
  CHECK(gen::info(BlockType::PowerEmitter).outlineCount == 6);
  CHECK(gen::info(BlockType::PowerVoid).kind == BlockKind::Void);
  CHECK(gen::info(BlockType::PowerToggle).kind == BlockKind::Logic);
  CHECK(gen::info(BlockType::InputComputerKeyboard).kind == BlockKind::Controller);
  BlockType t{};
  REQUIRE(gen::findBlockType("power.void", t));
  CHECK(t == BlockType::PowerVoid);
  CHECK_FALSE(gen::findBlockType("nope", t));
}

TEST_CASE("every effect-side block has a catchment; every source-side block has none") {
  for (const auto& b : gen::kBlocks) {
    INFO(b.id);
    if (isEffectSide(b.kind))
      CHECK(b.catchment > 0.0f);
    if (isSourceSide(b.kind) || b.kind == BlockKind::Void || b.kind == BlockKind::Gate)
      CHECK(b.catchment == 0.0f);
    CHECK(b.outlineCount >= 3);
  }
}

TEST_CASE("SPEC-CONNECTIONS-PROXIMITY R2/R3: kind pairs that may connect") {
  CHECK(kindsMayConnect(BlockKind::AudioSource, BlockKind::PostEffect));
  CHECK(kindsMayConnect(BlockKind::AudioSource, BlockKind::PreEffect));
  CHECK(kindsMayConnect(BlockKind::AudioSource, BlockKind::PowerEffect));
  CHECK(kindsMayConnect(BlockKind::AudioSource, BlockKind::Controller));
  CHECK(kindsMayConnect(BlockKind::PowerSource, BlockKind::PowerEffect));
  CHECK(kindsMayConnect(BlockKind::PowerSource, BlockKind::Logic));
  CHECK_FALSE(kindsMayConnect(BlockKind::PowerSource, BlockKind::PostEffect));
  CHECK(kindsMayConnect(BlockKind::PowerSource,
                        BlockKind::Controller));  // owner review 2: keyboards power Emitters/Lasers
  CHECK_FALSE(kindsMayConnect(BlockKind::AudioSource, BlockKind::AudioSource));
  CHECK_FALSE(kindsMayConnect(BlockKind::PostEffect, BlockKind::PostEffect));
  CHECK_FALSE(kindsMayConnect(BlockKind::Void, BlockKind::PostEffect));
}
