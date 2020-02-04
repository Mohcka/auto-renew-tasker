export interface IProcessEnv {
  /**
   * enviroment variable
   */
  env: {
    /**
     * Namecheap api key
     */
    NC_APIKEY: string
    /**
     * Namecheap user
     */
    NC_USER: string
    /**
     * Namecheap whitelisted IP Address
     */
    NC_IP: string
    /**
     * PipelineDeals API key
     */
    PIPELINE_DEALS_API_KEY: string
    /**
     * Pipeline deals standar API URL
     */
    PIPELINE_DEALS_API_URL: string
  }
}