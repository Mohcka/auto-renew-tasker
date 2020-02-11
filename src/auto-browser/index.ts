import puppeteer from "puppeteer"

/**
 * Browser automation class to initiate and run certain tasks
 * only the browser can run.
 */
export default class AutoBrowser {
  /**
   * Instance of Puppeteer browser
   */
  private browser: puppeteer.Browser
  /**
   * Variable to store a specific page from the browser object
   */
  private page: puppeteer.Page

  public async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      // headless: false,
      // slowMo: 250,
      args: [],
      defaultViewport: {
        width: 1200,
        height: 1000,
      },
    })
    // Set page to be the initial page that opens up
    this.page = (await this.browser.pages())[0]
  }

  public async runAutoRenews(domains: string[]): Promise<void> {
    await this.init()
    await this.loginToNC()
    await this.page.waitForSelector("li.domains")

    const searchSelectorQuery = `.gb-form-control[placeholder="Search"]`
    // Make sure we're on domain page
    await this.page.goto("https://ap.www.namecheap.com/domains/list/")

    for (const domain of domains) {
      try {
        // Type and enter domain in the search field
        await this.page.waitForSelector(searchSelectorQuery)
        const searchElement = await this.page.$(searchSelectorQuery)
        await searchElement?.type(domain)
        // await this.page.keyboard.press("Enter")
        // Wait until there's only one row in the domains list
        await this.page.waitFor(
          () =>
            document.querySelectorAll("auto-renew .gb-toggle__input").length ===
            1
        )
        // Toggle auto renew
        await (await this.page.$("auto-renew .gb-toggle__input"))?.click()
        // Confirm action
        await this.page.waitForSelector(
          "single-autorenew-confirm-modal .gb-btn"
        )
        await (
          await this.page.$("single-autorenew-confirm-modal .gb-btn")
        )?.click()
        // Wait for some toast
        await this.page.waitForSelector(".gb-alert__content")
      } catch (err) {
        console.log("Oops".red)
        console.log(err)
      }
      await this.page.goto("https://ap.www.namecheap.com/domains/list/")
    }

    await this.browser.close()
  }

  /**
   * Login to the Namecheap service
   */
  private async loginToNC(): Promise<void> {
    this.page.goto("https://www.namecheap.com/myaccount/login-signup", {
      waitUntil: "domcontentloaded",
    })
    // Enter username and password
    await this.page.waitForSelector(".loginForm .nc_username")
    const ncUserFnameield = await this.page.$(".loginForm .nc_username")
    const ncPassfield = await this.page.$(".loginForm .nc_password")
    await ncUserFnameield?.type(process.env.NAMECHEAP_USERNAME as string)
    await ncPassfield?.type(process.env.NAMECHEAP_PASSWORD as string)

    // Submit
    await (await this.page.$(".loginForm .nc_login_submit"))?.click()
  }
}
