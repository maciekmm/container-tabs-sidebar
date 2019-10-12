import {
    addOption,
    DEFAULT_MENU_ITEM_OPTIONS
} from '../native_context_menu.js'

function addContainerOption(options, handler) {
    addOption({
        contexts: ["all"],
        ...options
    }, async (info) => {
        let element = browser.menus.getTargetElement(info.targetElementId)
        let containerElement = element.closest('.container')
        if (!containerElement) {
            return
        }
        let cookieStoreId = containerElement.getAttribute('data-container-id')
        handler(cookieStoreId)
    })
}

async function init() {
    addContainerOption({
        id: 'reload-all',
        title: browser.i18n.getMessage('sidebar_menu_reloadAll')
    }, async (cookieStoreId) => {
        let tabs = await browser.tabs.query({
            cookieStoreId: cookieStoreId,
            windowId: ContainerTabsSidebar.WINDOW_ID,
            pinned: false
        })
        tabs.forEach((tab) => browser.tabs.reload(tab.id))
    })

    addContainerOption({
        id: 'close-all',
        title: browser.i18n.getMessage('sidebar_menu_closeAll')
    }, async (cookieStoreId) => {
        let tabs = await browser.tabs.query({
            cookieStoreId: cookieStoreId,
            windowId: ContainerTabsSidebar.WINDOW_ID,
            pinned: false
        })
        browser.tabs.remove(tabs.map(tab => tab.id))
    })
}

init()