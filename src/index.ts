import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { registerMrkhubPlugin } from "./register.js";

export default definePluginEntry({
  id: "mrkhub",
  name: "Meerkat Skills Hub",
  description: "Search and install Meerkat skills from GitHub via /mrkhub",
  register(api) {
    registerMrkhubPlugin(api);
  },
});
