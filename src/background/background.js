import { INTERNAL_MESSAGING_PORT_NAME } from '../constants.js'
import {
    getConfig,
    getSidebarAction
} from '../settings.js'

/**
 * In order to detect whether a sidebar is opened without a periodical sidebarAction.isOpen() call we use messaging mechanism.
 * When sidebar closes the connection is closed firing an event at the receiving end. 
 */
var window_states = new Map()

browser.runtime.onConnect.addListener((port) => {
    if (port.name !== INTERNAL_MESSAGING_PORT_NAME) return

    port.onDisconnect.addListener((message) =>
        window_states.delete(port)
    )

    port.onMessage.addListener((message) =>
        window_states.set(port, message)
    )
})

function toggleSidebar(tab) {
    for (let state of window_states.values()) {
        if (state.windowId === tab.windowId) {
            browser.sidebarAction.close()
            return
        }
    }
    browser.sidebarAction.open()
}

browser.browserAction.onClicked.addListener(toggleSidebar)


getConfig().then(async settings => {
    if (!('shortcut' in settings) || typeof browser.commands.update != 'function') return
    let action = await getSidebarAction()
    action.shortcut = settings['shortcut']
    return browser.commands.update(action)
})