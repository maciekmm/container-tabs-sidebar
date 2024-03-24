import { getConfig, getSidebarAction } from "../settings.js"

function toggleSidebar(tab) {
    browser.sidebarAction.toggle()
}

browser.browserAction.onClicked.addListener(toggleSidebar)

getConfig().then(async (settings) => {
    if (
        !("shortcut" in settings) ||
        typeof browser.commands.update != "function"
    )
        return
    let action = await getSidebarAction()
    action.shortcut = settings["shortcut"]
    return browser.commands.update(action)
})
