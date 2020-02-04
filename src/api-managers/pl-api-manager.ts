import axios from "axios"
import colors from "colors"
import moment from "moment"
import ora, { Ora } from "ora"

interface IDealCustomFields {
  /**
   * Domain URL
   */
  custom_label_1454434: string
  /**
   * Domain URL Purchase
   */
  custom_label_1457620: number
  /**
   * Domain Purchase Date
   */
  custom_label_2154033: number
}

export interface IDealAttributes {
  /**
   * The unique id of the deal
   */
  id: number
  /**
   * The name of the deal
   */
  name: string
  /**
   * A description of the deal
   */
  summary: string
  /**
   * The owner id of the deal
   */
  user_id: string
  /**
   * A convenience object to get the full name of the deal owner
   */
  user: string
  /**
   * A simple red-yellow-green status for the deal. 1 = red, 2 = yellow, 3 = green.
   */
  status: number
  /**
   * Custom fields for the deal. See custom fields section for more info.
   */
  custom_fields: IDealCustomFields
  /**
   * Timestamp for when deal was created
   */
  created_at: string
  /**
   * Timestamp for when deal was last updated
   */
  updated_at: string
  /**
   * The id of the import, if the deal was imported
   */
  import_id: string
  /**
   * The id of the expected close date calendar entry
   */
  expected_close_date_event_id: string
  /**
   * The expected close date
   */
  expected_close_date: string
  /**
   * The date when the deal was closed (either won or lost)
   */
  closed_time: string
  /**
   * Flag for archived status
   */
  is_archived: string
  /**
   * The deal's value, possibly with decimal value (depends on the currency of the account)
   */
  value: string
  /**
   * The deal's value, in cents. DEPRECATED: Please use value instead.
   */
  value_in_cents: string
  /**
   * The id of the primary contact for the deal
   */
  primary_contact_id: string
  /**
   * A convenience object to display the full name of the primary contact for a deal
   */
  primary_contact: string
  /**
   * A convenient list of people on the deal that includes name and id for each.
   */
  people: string
  /**
   * An array of person ids that are associated with the deal.
   */
  person_ids: string
  /**
   * A convenient list of collaborators that includes basic attributes for each.
   */
  collaborators: string
  /**
   * The array of user ids with whom the deal's been shared.
   */
  shared_user_ids: string
  /**
   * An convenience object to get the name of the company associated with the deal
   */
  company: {
    /**
     * Copmany's id
     */
    id: number
    /**
     * Name of the company
     */
    name: string
  }
  /**
   * The id of the company associated with the deal
   */
  company_id: string
  /**
   * The company name of the deal (if changed, will find or create a company by that name)
   */
  company_name: string
  /**
   * The deal's currency
   */
  currency: string
  /**
   * The probability, from 0-100, that the deal will close.
   */
  probability: string
  /**
   * The id of the deal stage
   */
  deal_stage_id: string
  /**
   * A convenience object to get the stage name for a deal.
   */
  deal_stage: string
  /**
   * The id of the deal loss reason
   */
  deal_loss_reason_id: string
  /**
   * A convenience object to get the loss reason name for a deal.
   */
  deal_loss_reason: string
  /**
   * A description of the deal loss reason.
   */
  deal_loss_reason_notes: string
  /**
   * The source id of the deal. You can get a list of sources from the lead_sources call.
   */
  source_id: string
  /**
   * A convenience object to get the name of the source.
   */
  source: string
  /**
   * The list of user_ids that can be added to notify_user_ids on associated notes.
   */
  possible_notify_user_ids: string
}

export interface IAutorenewDealEntry {
  /**
   * Unique deal id
   */
  id: number
  /**
   * Domain URL
   */
  domain: string
  /**
   * Person involved in deal
   */
  company: {
    /**
     * Copmany's id
     */
    id: number
    /**
     * Name of the company
     */
    name: string
  }
  /**
   * Determines what methoed the domain for the deal was purchased
   */
  domainPurchasedState: number
  /**
   * The date the domain was purchased on
   */
  domainPurchasedDate: number
}

// tslint:disable-next-line: no-empty-interface
interface IDealEntry extends IDealAttributes {}

/**
 * Manages API calling for the Pipelinedeals:tm: service
 */
export default class PLApiManager {
  /**
   * API access key
   */
  private apiKey: string
  /**
   * Terminal status spinner
   */
  private spinner: Ora

  constructor(apiKey: string) {
    this.apiKey = apiKey

    this.spinner = ora("Stand By...")
    this.spinner.color = "magenta"
  }

  /**
   * Debugging tool to run test api calls
   */
  public async runTest(): Promise<void> {
    await this.fetchPotentialAutoRenews()
    console.log(colors.black.bgGreen("Done"))
  }

  /**
   * Gathers select deal info to fetch in order to search for them via the Namecheap service
   * @return {Promise<{id: string, domain: string}>} - thing
   */
  public async fetchPotentialAutoRenews(
    // tslint:disable-next-line: completed-docs
    targetDate: { num: number; unit: string } = { num: 3, unit: "months" }
  ): Promise<
    // tslint:disable-next-line: completed-docs
    IAutorenewDealEntry[]
  > {
    // Todo - get all deals whose status' are not red, domain was purchased through us and store the domain/deal id
    const prev3Months: string | null = moment()
      .date(1)
      .subtract(1, "year")
      .format("YYYY-MM-DD")
    const slug = "deals.json"
    // Pull deals created in the last 3 months
    let listAllDealsApiCall = this.makeAPICallString(slug)
    let totalPages = 0

    // Array of entires that are not red
    // tslint:disable-next-line: prefer-const
    let validEntries: IAutorenewDealEntry[] = []

    // Get total number of pages
    await axios
      .get(listAllDealsApiCall)
      .then(resp => (totalPages = resp.data.pagination.pages))

    this.spinner.text = "Currently working on page 1".blue
    this.spinner.start()

    // console.log(prev3Months)
    for (let pageNumber = 1; pageNumber < totalPages; pageNumber++) {
      this.spinner.text = `currently fetching and filtering entries for page ${pageNumber} out of ${totalPages}`.blue
      listAllDealsApiCall = this.makeAPICallString(slug, `page=${pageNumber}`)

      await axios.get(listAllDealsApiCall).then(resp => {
        // Array of entries fetched from the currently called page
        const fetchedEntries: IDealEntry[] = resp.data.entries

        for (const entry of fetchedEntries) {
          if (
            // deal isnt red
            entry.status !== 1 &&
            // has a known domain
            entry.custom_fields.custom_label_1454434 != null &&
            // Purchased by webhub
            entry.custom_fields.custom_label_1457620 === 1936195 &&
            // Confirmed to have been purchased
            entry.custom_fields.custom_label_2154033 != null
          ) {
            validEntries.push({
              id: entry.id,
              domain: entry.custom_fields.custom_label_1454434,
              company: entry.company,
              domainPurchasedState: entry.custom_fields.custom_label_1457620,
              domainPurchasedDate: entry.custom_fields.custom_label_2154033,
            })
          }
        }
      })
    }

    this.spinner.text = colors.black.bgGreen("Success")
    this.spinner.succeed()

    // tslint:disable-next-line: no-console
    console.log(`Filtered entries: ${validEntries.length}`)
    return validEntries
  }

  /**
   * Fetches all the deals from the pipelinedeals:tm: service
   */
  public async getListOfAllDeals(): Promise<any[]> {
    // variable to store each entry as we loop through each page
    let entries: any[] = []
    const slug = "deals.json"
    let listAllDealsApiCall: string = this.makeAPICallString(slug)

    // Fetch total number of pages so we know how many to loop through to retreive all deals
    let totalPages = 0
    await axios
      .get(listAllDealsApiCall)
      .then(resp => (totalPages = resp.data.pagination.pages))
    this.spinner.text = "Currently working on page 1"
    this.spinner.start()
    for (let pageNumber = 1; pageNumber < 2; pageNumber++) {
      this.spinner.text = `currently fetching entries for page ${pageNumber} out of ${totalPages}`
      listAllDealsApiCall = this.makeAPICallString(slug, `page=${pageNumber}`)

      await axios.get(listAllDealsApiCall).then(resp => {
        // console.log()
        entries.push(...resp.data.entries)
      })
    }
    this.spinner.text = colors.black.bgGreen("Success")
    this.spinner.succeed()

    console.log(entries.length)
    return entries
  }

  /**
   * Fetches a list of deals based on their id
   * @param ids array of ids to pipe to the PL deal list api call
   */
  public async getDealsFromIds(id: number, ...ids: number[]) {
    const idArray = [id, ...ids]
    const listDealsByIdApiCall: string = this.makeAPICallString(
      "/deals.json",
      `conditions[deal_id]=${idArray.join(",")}`
    )
    await axios.get(listDealsByIdApiCall).then(resp => {
      console.log(resp.data)
    })
  }

  /**
   * Generates a url to make a specific call based on the json slug and the queries
   */
  private makeAPICallString(slug: string, ...queries: string[]): string {
    // Base url to make an api call
    let apiCall = `https://api.pipelinedeals.com/api/v3/${slug}?api_key=${this.apiKey}`

    // Check if any queries were sent, empty queires usually mean we're list all deals
    if (queries.length > 0) {
      for (const query of queries) {
        apiCall = apiCall + `&${query}`
      }
    }

    return apiCall
  }
}
