/**
 * Due to Firefox Web Extension API not allowing the execution of sidebarAction.close() from a promise returned by sidebarAction.isOpen()
 * We need to periodically check the state of sidebar visibility to be able to toggle the sidebar visibility.
 * This is a very nasty workaround, but I don't think there's any other way to achieve this.
 */
var opened = false

window.setInterval(async () => {
    opened = await browser.sidebarAction.isOpen({})
}, 500)

function toggleSidebar() {
    if (opened) {
        browser.sidebarAction.close()
    } else {
        browser.sidebarAction.open()
    }
}

browser.browserAction.onClicked.addListener(toggleSidebar)