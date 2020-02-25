import axios, { AxiosResponse } from "axios"
import Colors from "colors"
import xmlParser, { parse } from "fast-xml-parser"
import moment from "moment"
import ora, { Ora } from "ora"

export interface INamecheapDomain {
  /**
   * Unique integer value that represents the domain
   */
  ID: number
  /**
   * Registered domain name
   */
  Name: string
  /**
   * User account under which the domain is registered
   */
  User: string
  /**
   * Domain creation date
   */
  Created: string
  /**
   * Domain expiration date
   */
  Expires: string
  /**
   * Possible responses: True, False. Indicates whether the domain is expired
   */
  IsExpired: string
  /**
   * Possible responses: True, False. Indicates whether the domain is locked. When Islocked=true, domain changes are not allowed.
   */
  IsLocked: string
  /**
   * Possible responses: True, False. Indicates whether the domain is set for auto-renew
   */
  AutoRenew: string
  /**
   * Returns the WhoisGuard status
   */
  WhoisGuard: string
  /**
   * Indicates whether the domain name is premium
   */
  IsPremium: string
  /**
   * Returns true if Namecheap BasicDNS, Namecheap BackupDNS, or Namecheap PremiumDNS are used; if something else, returns false
   */
  IsOurDNS: string
}

interface INamecheapAPI {
  /**
   * Response received from the namecheap service
   */
  ApiResponse: {
    /**
     * Respones from the NC service received from the specified command
     */
    CommandResponse: {
      /**
       * The Domain Get List Command
       * Receive a list of domains for the specified user
       */
      DomainGetListResult?: {
        /**
         * Array of domains received
         */
        Domain: INamecheapDomain[] | INamecheapDomain
      }
      /**
       * Object to list paging info
       */
      Paging: {
        /**
         * The current page that was fetched
         */
        CurrentPage: number
        /**
         * Total number of domains
         */
        TotalItems: number
        /**
         * Given size of how many domains are on this page
         */
        PageSize: number
      }
    }
  }
}

/**
 * namecheap api test
 */
export default class NCApiManager {
  /**
   * Api key to authorize calls to the Namecheap service
   */
  private apiKey: string
  /**
   * The namecheap user to authorize api calls
   */
  private ncUser: string
  /**
   * the nc user's whitelisted ip address to authorize api calls
   */
  private ip: string
  /**
   * Current instance of the terminal spinner status
   */
  private spinner: Ora

  constructor(apiKey: string, ncUser: string, ip: string) {
    this.apiKey = apiKey
    this.ncUser = ncUser
    this.ip = ip

    this.spinner = ora("Stand By...")
    this.spinner.color = "magenta"
  }

  /**
   * Runs a test api call
   */
  public async runTest(): Promise<void> {
    this.getAllDomains()
  }

  /**
   * Renews a domain from the namecheap service
   * @param domain the domain name to renew
   */
  public async renewTest(domain: string): Promise<void> {
    await axios.get(this.makeAPICallString(`DomainName=${domain}`)).then()
  }

  /**
   * Fetch a list of all domains owned by the user
   */
  public async getAllDomains(): Promise<INamecheapDomain[]> {
    let totalPages = 0
    const domains: INamecheapDomain[] = []

    // Get total number of pages
    await axios
      .get(
        this.makeAPICallString(
          "Command=namecheap.domains.getList",
          "PageSize=100"
        )
      )
      .then(resp => {
        const parsedData: INamecheapAPI = xmlParser.parse(resp.data, {
          ignoreAttributes: false,
          attributeNamePrefix: "",
        })
        const pageSize = parsedData.ApiResponse.CommandResponse.Paging.PageSize
        // Total number of domain pages to traverse through
        const totalItems =
          parsedData.ApiResponse.CommandResponse.Paging.TotalItems

        totalPages =
          totalItems % pageSize !== 0
            ? totalItems / pageSize + 1
            : totalItems / pageSize
      })

    // Start the spinner
    this.spinner.start()
    // Loop through each page and store the fetched data in the domains[]
    for (let i = 1; i <= totalPages; i++) {
      this.spinner.text = `Fetching domains (Page ${i} of ${Math.floor(
        totalPages
      )})`.blue
      await axios
        .get(
          this.makeAPICallString(
            "Command=namecheap.domains.getList",
            "PageSize=100",
            `Page=${i}`
          )
        )
        .then(resp => {
          // Parse xml
          const parsedData: INamecheapAPI = xmlParser.parse(resp.data, {
            ignoreAttributes: false,
            attributeNamePrefix: "",
          })
          // Store the fetched domains into an array
          const fetchedDomains = parsedData.ApiResponse.CommandResponse
            .DomainGetListResult?.Domain!
          if ((fetchedDomains as INamecheapDomain[]).length) {
            domains.push(...(fetchedDomains as INamecheapDomain[]))
          } else {
            domains.push(fetchedDomains as INamecheapDomain)
          }
        })
        .catch(err => {
          console.log(err)
        })
    }

    this.spinner.text = "Domains fetched".green
    this.spinner.succeed()

    return domains
  }

  /**
   * Use the NC api to activate an array of registered domains that have
   * been expired.
   * @param domainsToActivate List of domains to activate
   */
  public async reactivateDomains(domainsToActivate: string[]) {
    const now = moment()
    let reactivatedCount = 0
    this.spinner.start()
    for (const domain of domainsToActivate) {
      this.spinner.text = `Reactivating domains: ${domain} (${domainsToActivate.indexOf(
        domain
      ) + 1} of ${domainsToActivate.length})`
      const apiReactivateURi = this.makeAPICallString(
        "Command=namecheap.domains.reactivate",
        "DomainName=" + domain,
        "YearsToAdd=1",
        "IsPremiumDomain=false"
      )

      await axios.get(apiReactivateURi).then(resp => {
        const parsedData: any = xmlParser.parse(resp.data, {
          ignoreAttributes: false,
          attributeNamePrefix: "",
        })

        if (parsedData.ApiResponse.Errors.Error !== null) reactivatedCount++
      })
    }
    this.spinner.text = `reactivated ${reactivatedCount} in ${moment().diff(
      now,
      "seconds",
      true
    )} seconds`
  }

  /**
   * Construct an api call string based off of the queries received
   * @param queries Array of queries to dispatch to the api
   */
  private makeAPICallString(...queries: string[]): string {
    // Base url with the needed credentials for authorizing api calls
    let baseURL = `https://api.namecheap.com/xml.response?ApiUser=${this.ncUser}&ApiKey=${this.apiKey}&UserName=${this.ncUser}&ClientIp=${this.ip}`

    for (const query of queries) {
      baseURL = baseURL + `&${query}`
    }
    return baseURL
  }
}
