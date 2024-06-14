import {
    TEMPORARY_CONTAINER_COOKIE_STORE_ID,
    PINNED_CONTAINER_COOKIE_STORE_ID,
} from "../constants.js"
import { getConfig, getSessionStorage } from "../settings.js"
import { loadAppearance } from "./theme/appearance.js"
import PinnedTabsContainer from "./containers/pinned.js"
import ContextualIdentityContainer from "./containers/contextual.js"
import { init as initContainerContextMenu } from "./contextmenu/container.js"
import { init as initTabContextMenu } from "./contextmenu/tab.js"
import TemporaryContainer from "./containers/temporary.js"
import { isTemporaryContainer } from "./interop/temporary_containers.js"
import {
    IS_CONTAINER_MOVING_ENABLED,
    CONTAINER_MOVED_EVENT,
} from "./interop/container_moving.js"
import { enable as enableTabOrderKeeping } from "./tab_order_keeper.js"

export const ContainerTabsSidebar = {
    containers: new Map(),
    elements: {},

    // There exists a browser.windows.WINDOW_ID_CURRENT, but it yields some negative value
    // It's impossible to compare with ids some events are providing in callbacks, therefore
    // you should get the current window id by browser.windows.getCurrent and provide the value to this function
    init(window, config, sessionStorage) {
        this.config = config
        this.sessionStorage = sessionStorage
        this.window = window
        const containersList = document.getElementById("containers")
        this.elements.containersList = containersList

        loadAppearance(config)
        initContainerContextMenu(this)
        initTabContextMenu(this)

        // Setup Special Containers
        this.pinnedTabs = this.createContainer(
            PinnedTabsContainer,
            PINNED_CONTAINER_COOKIE_STORE_ID,
            document.getElementById("pinned-tabs")
        )

        this.temporaryContainer = this.createContainer(
            TemporaryContainer,
            TEMPORARY_CONTAINER_COOKIE_STORE_ID
        )
        this.elements.containersList.appendChild(
            this.temporaryContainer.element
        )

        this._initContextualIdentities()
        this._initSearch()
    },

    _initContextualIdentities() {
        browser.contextualIdentities.onRemoved.addListener((evt) =>
            this.removeContextualIdentity(evt.contextualIdentity.cookieStoreId)
        )

        browser.contextualIdentities.onCreated.addListener((evt) =>
            this.addContextualIdentity(evt.contextualIdentity)
        )

        browser.contextualIdentities.onUpdated.addListener((evt) =>
            this.updateContextualIdentity(evt.contextualIdentity)
        )

        if (!!this.config["cycle_tabs_in_order"]) {
            enableTabOrderKeeping()
        }

        browser.contextualIdentities.query({}).then((res) => {
            // Incognito does not support containers
            if (browser.extension.inIncognitoContext) {
                res.length = 0
            }
            this.render([
                {
                    cookieStoreId: browser.extension.inIncognitoContext
                        ? "firefox-private"
                        : "firefox-default",
                    name: browser.i18n.getMessage(
                        browser.extension.inIncognitoContext
                            ? "containerIncognito"
                            : "containerDefault"
                    ),
                    iconUrl: "resource://usercontext-content/briefcase.svg",
                    icon: "briefcase",
                    color: "white",
                    colorCode: "#ffffff",
                },
                ...res,
            ])
            this.pinnedTabs.init()
        })

        if (IS_CONTAINER_MOVING_ENABLED) {
            this.elements.containersList.addEventListener(
                CONTAINER_MOVED_EVENT,
                (e) => {
                    const moved = this.containers.get(
                        e.detail.contextualIdentity
                    )
                    const movedAfter = this.containers.get(e.detail.after)
                    moved.element.parentNode.removeChild(moved.element)
                    this.elements.containersList.insertBefore(
                        moved.element,
                        movedAfter.element.nextSibling
                    )
                }
            )
        }
    },

    async _initSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchFilterStyle = document.querySelector('style#search-filter-style')
        let cidQueryPromise = Promise.resolve();
        let tabQueryPromise = Promise.resolve();
        searchInput.addEventListener('input', async () => {
            const searchQuery = searchInput.value.toLowerCase().trim();
            if (searchQuery.length === 0) {
                searchFilterStyle.textContent = ''
                return
            }
            cidQueryPromise = cidQueryPromise.then(() => browser.contextualIdentities.query({}))
            tabQueryPromise = tabQueryPromise.then(() => browser.tabs.query({}))
            const allIdentities = await cidQueryPromise
            const allTabs = await tabQueryPromise
            const matchingIdentities = allIdentities.filter(cid => {
                return cid.name.toLowerCase().indexOf(searchQuery) >= 0
            })
            const matchingTabs = allTabs.filter(tab => {
                return (tab.title.toLowerCase().indexOf(searchQuery) >= 0) ||
                    (tab.url.toLowerCase().indexOf(searchQuery) >= 0)
            })
            const cookieStoreIds = new Set()
            const tabIds = new Set()
            matchingIdentities.forEach(cid => {
                cookieStoreIds.add(cid.cookieStoreId)
            });
            matchingTabs.forEach(tab => {
                cookieStoreIds.add(tab.cookieStoreId)
                tabIds.add(tab.id)
            });
            const containerSelector = [...cookieStoreIds]
                .map(id => `#containers .container[data-container-id="${id}"]`)
                .join(', ')
            const tabSelector = [...tabIds]
                .map(id => `#containers .container-tab[data-tab-id="${id}"]`)
                .join(', ')
            searchFilterStyle.textContent = `
            #containers .container { display: none; }
            #containers .container-tab { display: none; }
            ${containerSelector} { display: block; }
            ${tabSelector} { display: flex; }
            `
        })
        searchInput.focus()
    },

    /**
     * Removes a container from DOM, does not remove it from a browser
     * @param {string} cookieStoreId - contextual identity id
     */
    async removeContextualIdentity(cookieStoreId) {
        this.temporaryContainer.detachContextualIdentity(cookieStoreId)

        if (!this.containers.has(cookieStoreId)) return
        const container = this.containers.get(cookieStoreId)
        this.containers.delete(cookieStoreId)
        container.element.parentNode.removeChild(container.element)
    },

    /**
     * Adds contextual identity to DOM
     * @param {string} contextualIdentity
     */
    async addContextualIdentity(contextualIdentity) {
        if (await isTemporaryContainer(contextualIdentity.cookieStoreId)) {
            this.temporaryContainer.attachContextualIdentity(
                contextualIdentity.cookieStoreId
            )
            return
        }
        const ctsContainer = this.createContainer(
            ContextualIdentityContainer,
            contextualIdentity.cookieStoreId,
            contextualIdentity
        )
        this.elements.containersList.insertBefore(
            ctsContainer.element,
            this.temporaryContainer.element
        )
    },

    async updateContextualIdentity(contextualIdentity) {
        const isInTemporary = this.temporaryContainer.supportsCookieStore(
            contextualIdentity.cookieStoreId
        )
        const isTemporary = await isTemporaryContainer(
            contextualIdentity.cookieStoreId
        )

        if (isInTemporary && !isTemporary) {
            this.temporaryContainer.detachContextualIdentity(
                contextualIdentity.cookieStoreId
            )
            this.addContextualIdentity(contextualIdentity)
        } else if (!isInTemporary && isTemporary) {
            this.removeContextualIdentity(contextualIdentity.cookieStoreId)
            this.temporaryContainer.attachContextualIdentity(
                contextualIdentity.cookieStoreId
            )
        } else if (!isTemporary) {
            this.containers
                .get(contextualIdentity.cookieStoreId)
                .updateContextualIdentity(contextualIdentity)
        }
    },

    render(containers) {
        for (let firefoxContainer of containers) {
            this.addContextualIdentity(firefoxContainer)
        }
    },

    createContainer(containerClass, containerId, ...args) {
        const sessionStorage = this.getSessionStorage(containerId)
        const container = new containerClass(
            containerId,
            this.window,
            this.config,
            sessionStorage,
            ...args
        )
        container.init()
        this.containers.set(containerId, container)
        return container
    },

    getSessionStorage(id) {
        if (!this.sessionStorage[id]) {
            this.sessionStorage[id] = {}
        }
        return this.sessionStorage[id]
    },

    getContainerByCookieStoreId(cookieStoreId) {
        const isTemporaryContainer =
            this.temporaryContainer.supportsCookieStore(cookieStoreId)

        if (isTemporaryContainer) {
            return this.temporaryContainer
        }

        return this.containers.get(cookieStoreId)
    },
}

async function init() {
    let window = await browser.windows.getCurrent()
    let config = await getConfig()
    let sessionStorage = await getSessionStorage(window)
    ContainerTabsSidebar.init(window, config, sessionStorage)
}

browser.storage.onChanged.addListener(() => {
    window.location.reload()
})

init()
