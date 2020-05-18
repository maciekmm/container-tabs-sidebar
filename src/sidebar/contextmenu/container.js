import {
    addOption,
} from './base.js'

function addContainerOption(options, handler) {
    addOption({
        contexts: ["page"],
        ...options
    }, async (info) => {
        handler(await getContainerTabsFromInfo(info))
    }, async (info) => {
        let tabs = await getContainerTabsFromInfo(info)
        return {
            visible: !!tabs,
            enabled: !!tabs && tabs.length > 0
        }
    })
}

async function getContainerTabsFromInfo(info) {
    let element = browser.menus.getTargetElement(info.targetElementId)
    if(!element) {
        return null
    }
    let containerElement = element.closest('.container')
    if (!containerElement) {
        return null
    }
    let cookieStoreId = containerElement.getAttribute('data-container-id')
    if(!cookieStoreId) {
        return null
    }
    let window = await browser.windows.getCurrent()
    return await browser.tabs.query({
        cookieStoreId: cookieStoreId,
        windowId: window.id,
        pinned: false
    })
}

function isOnContainer(info) {
    let element = browser.menus.getTargetElement(info.targetElementId)
    let containerElement = element.closest('.container')
    return !!containerElement
}

export async function init() {
    addContainerOption({
        id: 'reload-all',
        title: browser.i18n.getMessage('sidebar_menu_reloadAll')
    }, async (tabs) => {
        tabs.forEach((tab) => browser.tabs.reload(tab.id))
    })

    addContainerOption({
        id: 'close-all',
        title: browser.i18n.getMessage('sidebar_menu_closeAll')
    }, async (tabs) => {
        browser.tabs.remove(tabs.map(tab => tab.id))
    })
}