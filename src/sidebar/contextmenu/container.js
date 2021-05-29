import { addOption } from "./base.js"

export async function init(sidebar) {
    function addContainerOption(options, handler) {
        addOption(
            {
                contexts: ["page"],
                ...options,
            },
            async (info) => {
                handler(await getTabIdsFromInfo(info))
            },
            async (info) => {
                const tabs = await getTabIdsFromInfo(info)
                return {
                    visible: !!tabs,
                    enabled: !!tabs && tabs.length > 0,
                }
            }
        )
    }

    async function getTabIdsFromInfo(info) {
        let element = browser.menus.getTargetElement(info.targetElementId)
        if (!element) {
            return null
        }

        let containerElement = element.closest(".container")
        if (!containerElement) {
            return null
        }

        let cookieStoreId = containerElement.getAttribute("data-container-id")
        if (!cookieStoreId) {
            return null
        }

        const container = sidebar.getContainerByCookieStoreId(cookieStoreId)
        if (!container) {
            return null
        }

        return container.getBrowserTabs().map((tab) => tab.id)
    }

    addContainerOption(
        {
            id: "reload-all",
            title: browser.i18n.getMessage("sidebar_menu_reloadAll"),
        },
        async (tabIds) => {
            tabIds.forEach((tabId) => browser.tabs.reload(tabId))
        }
    )

    addContainerOption(
        {
            id: "close-all",
            title: browser.i18n.getMessage("sidebar_menu_closeAll"),
        },
        async (tabIds) => {
            browser.tabs.remove(tabIds)
        }
    )
}
