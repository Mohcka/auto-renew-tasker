import NCApiManager, { INamecheapDomain } from "./api-managers/nc-api-manager"
import PLApiManager, {
  IAutorenewDealEntry,
} from "./api-managers/pl-api-manager"

import moment from "moment"

import AuotBrowser from "./auto-browser"
import AutoBrowser from "./auto-browser"

/**
 * Handles data handling for gathering data to check if
 * domains need to be auto renewed
 */
export default class AutoRenewChecker {
  /**
   * Instance of Puppeteer runner for specific web tasks
   */
  private autoBrowser: AutoBrowser

  constructor() {
    this.autoBrowser = new AuotBrowser()
  }

  /**
   * Test runner for debugging
   */
  public async runTest(): Promise<void> {
    const start = moment()
    console.log("running browser".yellow)
    await this.autoBrowser.runAutoRenews([
      "airconditioning-fortworth.net",
      "theresponseteamllc.com",
      "peakperfectioncontracting.com",
    ])
    console.log(
      `Done in ${moment().diff(start, "seconds", true)} seconds`.green
    )
  }

  /**
   * Main runner method
   */
  public async run(): Promise<void> {
    const ncManager: NCApiManager = new NCApiManager(
      process.env.NC_APIKEY as string,
      process.env.NC_USER as string,
      process.env.NC_IP as string
    )

    const plManager: PLApiManager = new PLApiManager(
      process.env.PIPELINE_DEALS_API_KEY as string
    )

    const fetchNCDomains: INamecheapDomain[] = await ncManager.getAllDomains()
    const fetchPLDeals: IAutorenewDealEntry[] = await plManager.fetchPotentialAutoRenews()

    this.performAutoRenewCheck(fetchPLDeals, fetchNCDomains)
  }

  /**
   * Will created a filtered array of pipeline deals that
   * aren't red who needs to have the registered domain's
   * autorenew set to true if it already hasn't been
   * @param plData Fetched pipeline deals
   * @param ncData fetched namecheap domains
   */
  public performAutoRenewCheck(
    fetchedPLDeals: IAutorenewDealEntry[],
    fetchedNCDomains: INamecheapDomain[]
  ): void {
    const domainsToFlagForAutoRenew: any[] = []
    console.log("Performing auto renew check")
    for (const deal of fetchedPLDeals) {
      // The NC Domain that matched the domain in the PL data entry
      const foundMatch = fetchedNCDomains.find(domain => {
        // If the domain is off for renewal, compare the domain name
        // and if there's a match, flag domain to swtich autorenew on
        if (domain.AutoRenew.toLowerCase() === "false")
          return domain.Name === deal.domain
        // return false and default value to `undefined`
        return false
      })
      // Push the active deal that isn't set to autorenew to the list
      if (foundMatch) {
        domainsToFlagForAutoRenew.push({
          domain: foundMatch.Name,
          companyName: deal.company.name,
        })
      }
    }

    const extracedDomains = domainsToFlagForAutoRenew.map(
      (obj: any) => obj.domain
    )

    console.log(domainsToFlagForAutoRenew)

    this.autoRenewBrowserRunBrowserTask(extracedDomains)
  }

  private async autoRenewBrowserRunBrowserTask(domains: string[]) {
    const browserStartTime = moment()
    console.log("running browser".yellow)
    await this.autoBrowser.runAutoRenews(domains)
    const isPlural = domains.length !== 1 ? "s" : ""
    console.log(
      `Done.  Auto renewed ${
        domains.length
      } domain${isPlural} in ${moment().diff(
        browserStartTime,
        "seconds",
        true
      )} seconds`.green
    )
  }
}
