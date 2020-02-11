import dotenv from "dotenv"
dotenv.config()

import NCApiService from "./src/api-managers/nc-api-manager"
import PLApiService from "./src/api-managers/pl-api-manager"

import AutoRenewChecker from "./src/auto-renew-checker"

/**
 * Main class
 */
class Main {
  /**
   * Main run function
   */
  public static async run(): Promise<void> {
    const checker: AutoRenewChecker = new AutoRenewChecker()

    await checker.run()
    console.log("Done")
    // Todo: get validEntries -> get list of domains -> compare valid domains to NC domains for auto renwal
  }
}

Main.run()
