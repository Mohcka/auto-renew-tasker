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

  private ncManager: NCApiManager
  private plManager: PLApiManager

  constructor() {
    this.autoBrowser = new AuotBrowser()
    this.ncManager = new NCApiManager(
      process.env.NC_APIKEY as string,
      process.env.NC_USER as string,
      process.env.NC_IP as string
    )

    this.plManager = new PLApiManager(
      process.env.PIPELINE_DEALS_API_KEY as string
    )
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
    const fetchNCDomains: INamecheapDomain[] = await this.ncManager.getAllDomains()
    const fetchPLDeals: IAutorenewDealEntry[] = await this.plManager.fetchPotentialAutoRenews()

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
        if (
          domain.AutoRenew.toLowerCase() === "false" ||
          domain.IsExpired.toLowerCase() === "true"
        )
          return domain.Name === deal.domain
        // return false and default value to `undefined`
        return false
      })
      // Push the active deal that isn't set to autorenew to the list
      if (foundMatch) {
        domainsToFlagForAutoRenew.push({
          domain: foundMatch.Name,
          companyName: deal.company.name,
          AutoRenew: foundMatch.AutoRenew,
          IsExpired: foundMatch.IsExpired,
          isValid: deal.status,
        })
      }
    }

    // Domains to run through the automated browser to flag
    // for auto renew individually
    const filteredAutoRenewDomains: string[] = []
    // Domains to activate through the namecheap api
    const domainsToActivate: string[] = []

    // Splitting the array from domains to activate and domains to
    // autorenew
    for (const flaggedDomain of domainsToFlagForAutoRenew) {
      if (flaggedDomain.IsExpired === "true") {
        // Make an array of domain strings because that's what the
        // NCAPI method accepts
        domainsToActivate.push(flaggedDomain.domain as string)
      } else {
        filteredAutoRenewDomains.push(flaggedDomain.domain as string)
      }
    }

    console.log(domainsToFlagForAutoRenew)
    console.log(domainsToActivate)
    // Automate browaer to manually check autorenew on for the domains
    this.autoRenewBrowserRunBrowserTask(filteredAutoRenewDomains)
    // TODO: use api to purchase expired domains
    // this.ncManager.reactivateDomains(domainsToActivate)
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
