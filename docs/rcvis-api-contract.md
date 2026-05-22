# RCVis REST API Contract

> Source: Contract provided by Armin Samii / Robot Armin, LLC via Google Docs.

The RCVis API is free to use in limited use cases. To access RCVis via the API, you must agree to the following terms.

1. **Access.** Access to the RCVis API is granted on a case-by-case basis, at the sole discretion of Robot Armin, LLC.

2. **Noncommercial Use.** The API is for noncommercial use only. You may not profit off of the use of the API. You may not use the API to sell services to other customers. To use the API for commercial purposes, you must enter into a commercial agreement with Robot Armin, LLC, bound by terms other than those laid out in this contract. Any exemptions to this clause must be granted explicitly in writing (via email) by Armin Samii.

3. **Nonprofit Use.** Nonprofits (incorporated 501(c)(3)s and 501(c)(4)s) may use the API to better educate the public on Ranked-Choice Voting. This includes use in free, publicly-available tooling and in fundraising campaigns.

4. **Election Administration Usage.** Election administrators may use the API to display the results of elections, as well as to test their systems and software in preparation of displaying the results of elections.
   - a. This use case is not available to for-profit vendors of voting systems.
   - b. For-profit RCV Tabulation Software, election hardware vendors, and those that sell services to governments or election administrators must enter into a commercial agreement with Robot Armin, LLC to access the API.

5. **Security.** The API Key must be kept secure. It must not be accessible to the public, and it must be kept protected within your organization to only be accessible to those with a need to access it.

6. **Rate Limiting.** You must take care to not overwhelm the RCVis servers.
   - a. **Peak Usage.** Peak usage is not to exceed 5 GET/DELETE requests per second, or 1 POST/PATCH request per second.
   - b. **Weekly Usage.** Average usage should be well below this, not to exceed 100 POST requests per week, 100 DELETE requests per week, 1,000 PATCH requests per week, and 1,000 GET requests per week.

7. **PATCHes are required.** If you are updating the same data, you must not send a POST request for each update. POST requests create a new visualization with a new URL with each request, which is taxing on our servers if sent repeatedly.
   - a. If you are updating data with new results for the same election, poll, or other data source, you must update the data by using a PATCH request.
   - b. You must opt for a PATCH over a DELETE then POST.
   - c. You must only send a PATCH request when the data has changed. You must not submit repeated PATCH requests which do not update the vote counts.
   - d. Exemptions are granted for all users during the development phases, while setting up integration of the API.
   - e. Exemptions are granted for election administrators if they are publishing preliminary results, and need all preliminary steps to be available on RCVis.com.
      - i. In this case, preliminary results are limited to twice-daily.
   - f. Exemptions may be granted on a case-by-case basis for other users. Any exemptions to this clause must be granted explicitly in writing (via email) by Armin Samii.

8. **Notification of change of behavior.** RCVis extensively monitors its usage to look for hacking and denial-of-service attacks. Any change in API behavior may trigger the RCVis warning systems. If your API usage is expected to change significantly, you agree to inform us about the change by email team@rcvis.com.

9. **No Guarantees.** RCVis makes no guarantees whatsoever, including uptime, data retention, response time, and accuracy of data found on RCVis.

10. **Retraction.** RCVis reserves the right to revoke API access at any time, including in cases of abuse, non-use, and any other reason, at the sole discretion of Robot Armin, LLC.

11. **Support.** Free support is generally available by emailing team@rcvis.com, but we make no guarantees of support. For support that takes extensive amounts of time or engineering effort, we may request that you enter into a separate contract with Robot Armin, LLC.
