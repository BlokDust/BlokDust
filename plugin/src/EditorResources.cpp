// The editor's page (PLUGIN-0001): the web build, embedded as BinaryData (plugin/CMakeLists.txt), served to the
// WebView through JUCE's resource provider.
#include "PluginEditor.h"

#include <BinaryData.h>

namespace blokdust::plugin {

namespace {
juce::String mimeFor(const juce::String& name) {
  if (name.endsWithIgnoreCase(".html")) return "text/html";
  if (name.endsWithIgnoreCase(".js")) return "text/javascript";
  if (name.endsWithIgnoreCase(".css")) return "text/css";
  if (name.endsWithIgnoreCase(".json")) return "application/json";
  if (name.endsWithIgnoreCase(".png")) return "image/png";
  if (name.endsWithIgnoreCase(".woff2")) return "font/woff2";
  if (name.endsWithIgnoreCase(".wasm")) return "application/wasm";
  return "application/octet-stream";
}
}  // namespace

std::optional<juce::WebBrowserComponent::Resource> BlokDustEditor::resource(const juce::String& url) {
  // Web assets are embedded as BinaryData keyed by original file name (Vite asset names are content-hashed, so unique).
  auto name = url.fromLastOccurrenceOf("/", false, false).upToFirstOccurrenceOf("?", false, false);
  if (name.isEmpty()) name = "index.html";
  for (int i = 0; i < BinaryData::namedResourceListSize; ++i) {
    if (name != BinaryData::originalFilenames[i]) continue;
    int size = 0;
    const char* data = BinaryData::getNamedResource(BinaryData::namedResourceList[i], size);
    std::vector<std::byte> bytes(static_cast<std::size_t>(size));
    std::memcpy(bytes.data(), data, static_cast<std::size_t>(size));
    return juce::WebBrowserComponent::Resource{std::move(bytes), mimeFor(name)};
  }
  return std::nullopt;
}

}  // namespace blokdust::plugin
