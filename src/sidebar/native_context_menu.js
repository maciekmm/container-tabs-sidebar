const SIDEBAR_URL_PATTERN = `moz-extension://${location.host}/*`
export const DEFAULT_MENU_ITEM_OPTIONS = {
    viewTypes: ["sidebar"],
    documentUrlPatterns: [SIDEBAR_URL_PATTERN]
}
const optionHandlers = new Map()

export function addOption(options, handler) {
    if (!('id' in options)) {
        throw new Error('item options should include id field')
    }
    let item = {
        ...DEFAULT_MENU_ITEM_OPTIONS,
        ...options
    }
    optionHandlers.set(item.id, handler)
    browser.menus.create(item)
}

browser.menus.onClicked.addListener(async (info, tab) => {
    if (optionHandlers.has(info.menuItemId)) {
        await optionHandlers.get(info.menuItemId)(info, tab)
    }
})