import { addOption, DEFAULT_MENU_ITEM_OPTIONS } from "./base.js"

function addTabOption(options, clickHandler, openHandler) {
    addOption(
        {
            contexts: ["tab"],
            ...options,
        },
        (info, tab) => clickHandler(tab),
        openHandler
    )
}

function addReopenInContainerOption(container) {
    let itemOptions = {
        parentId: "reopen-in-container",
        id: `reopen-in-container:${container.cookieStoreId}`,
        title: `&${container.name}`,
    }
    if (container.icon) {
        itemOptions.icons = {
            16: `/assets/contextual-identities/${container.icon}.svg#${container.color}`,
        }
    }
    addTabOption(
        itemOptions,
        (tab) => {
            let tabInfo = {
                pinned: tab.pinned,
                openInReaderMode: tab.isInReaderMode,
                cookieStoreId: container.cookieStoreId,
            }
            // firefox treats about:newtab as privileged url, but not setting the url allows us to create that page
            if (tab.url !== "about:newtab") {
                tabInfo.url = tab.url
            }
            browser.tabs.create(tabInfo).then(() => {
                browser.tabs.remove(tab.id)
            })
        },
        (info, tab) => {
            return {
                visible: container.cookieStoreId != tab.cookieStoreId,
            }
        }
    )
}

const contextualIdentities = new Set()
async function updateContextualIdentities() {
    contextualIdentities.forEach((i) =>
        browser.menus.remove(`reopen-in-container:${i.cookieStoreId}`)
    )
    contextualIdentities.clear()

    let containers = await browser.contextualIdentities.query({})

    containers.unshift({
        cookieStoreId: browser.extension.inIncognitoContext
            ? "firefox-private"
            : "firefox-default",
        icon: "briefcase",
        color: "white",
        name: browser.i18n.getMessage(
            "sidebar_menu_reopenInContainer_noContainer"
        ),
    })

    for (let container of containers) {
        addReopenInContainerOption(container)
        contextualIdentities.add(container)
    }
}

async function initReopenInContainer() {
    addTabOption({
        id: "reopen-in-container",
        title: browser.i18n.getMessage("sidebar_menu_reopenInContainer"),
    })

    browser.contextualIdentities.onRemoved.addListener(
        updateContextualIdentities
    )
    browser.contextualIdentities.onCreated.addListener(
        updateContextualIdentities
    )
    browser.contextualIdentities.onUpdated.addListener(
        updateContextualIdentities
    )
    await updateContextualIdentities()
}

export async function init(sidebar) {
    addTabOption(
        {
            id: "new-tab",
            title: browser.i18n.getMessage("sidebar_menu_newTab"),
        },
        (tab) =>
            browser.tabs.create({
                cookieStoreId: tab.cookieStoreId,
            })
    )

    addTabOption({
        id: "new-tab-separator",
        type: "separator",
    })

    addTabOption(
        {
            id: "reload-tab",
            title: browser.i18n.getMessage("sidebar_menu_reloadTab"),
        },
        (tab) => browser.tabs.reload(tab.id)
    )

    addTabOption(
        {
            id: "mute-tab",
            title: browser.i18n.getMessage("sidebar_menu_muteTab"),
        },
        (tab) =>
            browser.tabs.update(tab.id, {
                muted: !(tab.mutedInfo && tab.mutedInfo.muted),
            }),
        (info, tab) => {
            return {
                title:
                    tab.mutedInfo && tab.mutedInfo.muted
                        ? browser.i18n.getMessage("sidebar_menu_unmuteTab")
                        : browser.i18n.getMessage("sidebar_menu_muteTab"),
            }
        }
    )

    addTabOption(
        {
            id: "pin-tab",
            title: browser.i18n.getMessage("sidebar_menu_pinTab"),
        },
        (tab) =>
            browser.tabs.update(tab.id, {
                pinned: !tab.pinned,
            }),
        (info, tab) => {
            return {
                title: !tab.pinned
                    ? browser.i18n.getMessage("sidebar_menu_pinTab")
                    : browser.i18n.getMessage("sidebar_menu_unpinTab"),
            }
        }
    )

    addTabOption(
        {
            id: "duplicate-tab",
            title: browser.i18n.getMessage("sidebar_menu_duplicateTab"),
        },
        (tab) => browser.tabs.duplicate(tab.id)
    )

    addTabOption({
        id: "duplicate-tab-separator",
        type: "separator",
    })

    addTabOption({
        id: "move-to",
        title: browser.i18n.getMessage("sidebar_menu_moveTabTo"),
    })

    addTabOption(
        {
            id: "move-to-start",
            title: browser.i18n.getMessage("sidebar_menu_moveTabToStart"),
            parentId: "move-to",
        },
        (tab) =>
            browser.tabs.move(tab.id, {
                index: 0,
            })
    )

    addTabOption(
        {
            id: "move-to-end",
            title: browser.i18n.getMessage("sidebar_menu_moveTabToEnd"),
            parentId: "move-to",
        },
        (tab) =>
            browser.tabs.move(tab.id, {
                index: -1,
            })
    )

    addTabOption(
        {
            id: "move-to-new-window",
            title: browser.i18n.getMessage("sidebar_menu_moveTabToNewWindow"),
            parentId: "move-to",
        },
        (tab) =>
            browser.windows.create({
                tabId: tab.id,
            })
    )

    await initReopenInContainer()

    addTabOption({
        id: "open-in-new-separator",
        type: "separator",
    })

    addTabOption(
        {
            id: "close-tab",
            title: browser.i18n.getMessage("sidebar_menu_closeTab"),
        },
        (tab) => browser.tabs.remove(tab.id)
    )

    addTabOption({
        id: "close-multiple-tabs",
        title: browser.i18n.getMessage("sidebar_menu_closeMultipleTabs"),
    })

    addTabOption(
        {
            id: "close-tabs-above",
            parentId: "close-multiple-tabs",
            title: browser.i18n.getMessage("sidebar_menu_closeTabsAbove"),
        },
        async (tab) => {
            const container = sidebar.getContainerByCookieStoreId(
                tab.cookieStoreId
            )
            const tabs = container
                .getBrowserTabs()
                .filter((t) => t.index < tab.index)
            await browser.tabs.remove(tabs.map((t) => t.id))
        },
        async (info, tab) => {
            const container = sidebar.getContainerByCookieStoreId(
                tab.cookieStoreId
            )
            const tabs = container
                .getBrowserTabs()
                .filter((t) => t.index < tab.index)

            return {
                enabled: tabs.length > 0,
                visible: !tab.pinned,
            }
        }
    )

    addTabOption(
        {
            id: "close-tabs-below",
            parentId: "close-multiple-tabs",
            title: browser.i18n.getMessage("sidebar_menu_closeTabsBelow"),
        },
        async (tab) => {
            const container = sidebar.getContainerByCookieStoreId(
                tab.cookieStoreId
            )
            const tabs = container
                .getBrowserTabs()
                .filter((t) => t.index > tab.index)
            await browser.tabs.remove(tabs.map((t) => t.id))
        },
        async (info, tab) => {
            const container = sidebar.getContainerByCookieStoreId(
                tab.cookieStoreId
            )
            const tabs = container
                .getBrowserTabs()
                .filter((t) => t.index > tab.index)

            return {
                enabled: tabs.length > 0,
                visible: !tab.pinned,
            }
        }
    )

    addTabOption(
        {
            id: "close-others",
            parentId: "close-multiple-tabs",
            title: browser.i18n.getMessage("sidebar_menu_closeOtherTabs"),
        },
        async (tab) => {
            const container = sidebar.getContainerByCookieStoreId(
                tab.cookieStoreId
            )
            const tabs = container
                .getBrowserTabs()
                .filter((t) => t.id !== tab.id)
            await browser.tabs.remove(tabs.map((t) => t.id))
        },
        async (info, tab) => {
            const container = sidebar.getContainerByCookieStoreId(
                tab.cookieStoreId
            )
            const tabs = container
                .getBrowserTabs()
                .filter((t) => t.id !== tab.id)

            return {
                enabled: tabs.length > 1,
                visible: !tab.pinned,
            }
        }
    )

    addTabOption(
        {
            id: "undo-closed-tab",
            title: browser.i18n.getMessage("sidebar_menu_undoClosedTab"),
        },
        async () => {
            let sessions = await browser.sessions.getRecentlyClosed({
                maxResults: 1,
            })
            if (!sessions.length) return
            let sessionInfo = sessions[0]
            if (sessionInfo.tab) {
                browser.sessions.restore(sessionInfo.tab.sessionId)
            }
        },
        async () => {
            let sessions = await browser.sessions.getRecentlyClosed({
                maxResults: 1,
            })
            return {
                enabled: !!sessions.length && !!sessions[0].tab,
            }
        }
    )
}
