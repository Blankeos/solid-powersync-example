import type { Config } from "vike/types"
import config from "vike-solid/config"
import { serverEnv } from "@/env.server"

// Default config (can be overridden by pages)
export default {
  extends: [config],
  port: serverEnv.PORT,
} satisfies Config