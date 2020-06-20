const SIDEBAR_URL_PATTERN = `moz-extension://${location.host}/*`
export const DEFAULT_MENU_ITEM_OPTIONS = {
    viewTypes: ["sidebar"],
    documentUrlPatterns: [SIDEBAR_URL_PATTERN],
}
const optionHandlers = new Map()

export function addOption(options, clickHandler, openHandler) {
    if (!("id" in options)) {
        throw new Error("item options should include id field")
    }
    let item = {
        ...DEFAULT_MENU_ITEM_OPTIONS,
        ...options,
    }
    optionHandlers.set(item.id, {
        contexts: options.contexts,
        click: clickHandler,
        open: openHandler,
    })
    browser.menus.create(item)
}

function includesAny(arr, incl) {
    for (let searched of incl) {
        if (arr.includes(searched)) {
            return true
        }
    }
    return false
}
var lastMenuInstanceId = 0
var nextMenuInstanceId = 1

async function init() {
    await browser.menus.removeAll()

    browser.menus.onClicked.addListener(async (info, tab) => {
        let window = await browser.windows.getCurrent()
        if (!!tab && tab.windowId !== window.id) return
        if (optionHandlers.has(info.menuItemId)) {
            await optionHandlers.get(info.menuItemId).click(info, tab)
        }
    })

    browser.menus.onShown.addListener(async (info, tab) => {
        if (info.viewType != "sidebar") {
            return
        }

        var menuInstanceId = nextMenuInstanceId++
        lastMenuInstanceId = menuInstanceId

        if (menuInstanceId !== lastMenuInstanceId) {
            return
        }

        for (let menuId of optionHandlers.keys()) {
            let menuItem = optionHandlers.get(menuId)
            // more checks
            if (!includesAny(info.contexts, menuItem.contexts)) {
                continue
            }

            if (!menuItem || !(typeof menuItem.open == "function")) {
                continue
            }
            let update = await menuItem.open(info, tab)
            if (update) {
                await browser.menus.update(menuId, update)
            }
        }

        browser.menus.refresh()
    })

    browser.menus.onHidden.addListener(async (info, tab) => {
        lastMenuInstanceId = 0
    })
}

if (typeof browser.menus.overrideContext == "function") {
    init()
}
