![logo](media/useful-forks-logo.png)

# Useful Forks
Adding a sorted list of starred forks to the GitHub forks page. Results are filtered out if there were never any commits pushed since the fork was created.

The project is released as:
1. A website: great for people that just want to use this tool every now and then.
2. A Chrome Extension: has the advantage of always performing the search whenever you open a project's GitHub Forks page.

---

## Website (WIP)
The project is [available online](https://payne911.github.io/useful-forks/) thanks to GitHub Pages.

However, it is not in a working state right now. Please use the Chrome Extension in the meantime.

## Chrome Extension (WIP)
Not published yet. If you want to install it:
1. Clone this repository
2. Change the [script file](project/useful-forks.js) so that it includes an [Access Token](https://github.com/settings/tokens/new?scopes=repo&description=UsefulFork).
3. Go to the `chrome://extensions` URL
4. Enable `Developer mode` (switch at the top-right)
5. Click `Load unpacked` (button at the top-left)
6. Select the [`project` folder](project)

Once it's activated, the extension will automatically trigger itself whenever you open a Fork page, as shown by the GIF below:

![example](media/demo.gif)

# How it works
![Activity_Diagram](media/query-diagram.png)

This Activity Diagram (UML) should clarify a bit the inner-workings of the algorithm, and why it may some times require so many API calls.

# To-do
* (Website) Remove the 'spinner' once the query is done
* Fix the sorting algo
* Cache responses for a little while 
  * https://docs.github.com/en/free-pro-team@latest/rest/guides/getting-started-with-the-rest-api#conditional-requests
  * https://docs.github.com/en/free-pro-team@latest/rest/overview/resources-in-the-rest-api#conditional-requests
  * https://stackoverflow.com/a/14890859/9768291
* Publish as a Chrome Extension (create 'options' and 'background' pages?)
  * See: https://developer.chrome.com/extensions/samples
    * https://developer.chrome.com/extensions/examples/tutorials/broken_background_color.zip
    * https://developer.chrome.com/extensions/examples/tutorials/getstarted.zip
  * Allow people to input their Access Token to increase API limits (from Extension's settings rather than through script)

# Credits
Thanks to [raeleus](https://github.com/raeleus) for his design of the logo!