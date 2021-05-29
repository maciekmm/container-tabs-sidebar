import ContainerTab from "../tab/tab.js"

export default class AbstractTabContainer {
    constructor(id, window, config, element) {
        this.id = id
        this._config = config
        this.element = element
        this._window = window
        this.tabs = new Map()
    }

    init() {
        browser.tabs.onActivated.addListener((activeInfo) => {
            if (activeInfo.windowId !== this._window.id) return
            this._handleTabActivated(activeInfo)
        })

        browser.tabs.onCreated.addListener((newTab) => {
            if (newTab.windowId !== this._window.id) return

            this._handleTabCreated(newTab)
        })

        browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
            if (removeInfo.isWindowClosing) return
            if (removeInfo.windowId !== this._window.id) return
            if (!this.tabs.has(tabId)) return
            this.removeTab(tabId)
        })

        browser.tabs.onMoved.addListener((tabId) => {
            if (!this.tabs.has(tabId)) return
            this.render(true)
        })

        browser.tabs.onAttached.addListener((tabId, attachInfo) => {
            if (attachInfo.newWindowId !== this._window.id) {
                if (!this.tabs.has(tabId)) return
                this.removeTab(tabId)
            } else {
                this.render(true)
            }
        })

        browser.tabs.onUpdated.addListener((tabId, change, tab) => {
            if ("pinned" in change) {
                this._handleTabPinned(tabId, change, tab)
            }
        })

        // Dragging
        this.element.addEventListener("dragleave", (e) => {
            if (!e.currentTarget || !e.currentTarget.classList) return
            e.currentTarget.classList.remove("container-dragged-over")
        })

        this.element.addEventListener("dragend", (e) => {
            if (!e.currentTarget || !e.currentTarget.classList) return
            e.currentTarget.classList.remove("container-dragged-over")
        })

        this.element.addEventListener("dragover", (e) => {
            e.preventDefault()
            if (!e.dataTransfer.types.includes("tab/move")) {
                return
            }
            e.dataTransfer.dropEffect = "move"
            this.element.classList.add("container-dragged-over")
            return false
        })

        this.element.addEventListener("drop", async (e) => {
            e.preventDefault()
            e.stopImmediatePropagation()
            this.element.classList.remove("container-dragged-over")
            if (!e.dataTransfer.types.includes("tab/move")) {
                return
            }
            let [tabId, contextualIdentity, pinned] = e.dataTransfer
                .getData("tab/move")
                .split("/")
            tabId = parseInt(tabId)
            pinned = pinned !== "false"

            let index = -1

            let dropTabId = this._getDropTab(e.target)
            let tab = await browser.tabs.get(tabId)
            if (dropTabId) {
                let dropTab = await browser.tabs.get(parseInt(dropTabId))
                index = dropTab.index + 1
            } else if (this.tabs.size > 0) {
                index = (
                    await browser.tabs.get(
                        this.tabs.values().next().value.tab.id
                    )
                ).index
            }
            await this._handleDrop(tab, pinned, contextualIdentity, index)
        })

        this.render(true)
    }

    async _handleDrop(tab, pinned, tabCtxId, index) {}

    _getDropTab(target) {
        let tab = target.closest(".container-tab")
        return tab ? tab.getAttribute("data-tab-id") : null
    }

    _handleTabActivated(activeInfo) {
        this.tabs.forEach((tab, tabId) => {
            if (tabId == activeInfo.tabId) {
                tab.activate()
            } else if (tab.tab.active) {
                tab.deactivate()
            }
        })
    }

    _handleTabCreated(newTab) {
        this.render(true)
    }

    _handleTabPinned(tabId, change, tab) {}

    _handleDragOver(event, tabId, contextualId, pinned) {}

    /**
     * Removes all tabs except one
     * @param {integer} tabId to not remove from this container
     */
    closeOthers(tabId) {
        browser.tabs.remove(
            Array.from(this.tabs.keys()).filter((key) => key != tabId)
        )
    }

    /**
     * Removes a tab from DOM, does not remove it from a browser
     * @param {integer} tabId
     */
    removeTab(tabId) {
        if (!this.tabs.has(tabId)) return
        const tab = this.tabs.get(tabId)
        tab.destroy()
        this.tabs.delete(tabId)
        tab.element.parentNode.removeChild(tab.element)
        this.render(false)
    }

    async render(updateTabs) {
        this.element.setAttribute("data-container-id", this.id)
        this.element.setAttribute("data-tabs-count", this.tabs.size)
    }

    renderTabs(tabContainer, tabs) {
        // clear children
        while (tabContainer.lastChild) {
            tabContainer.removeChild(tabContainer.lastChild)
        }
        this.tabs.forEach((tab) => {
            tab.destroy()
        })
        this.tabs.clear()

        for (let firefoxTab of tabs) {
            const tab = new ContainerTab(this._window, this, firefoxTab)
            this.tabs.set(tab.id, tab)
            tab.init()
            tabContainer.appendChild(tab.element)
        }
        // when closing a tab, focus one above
        if (!!this._config["focus_tabs_in_order"] && tabs.length > 1) {
            browser.tabs.moveInSuccession(tabs.map((tab) => tab.id).reverse())
            // if closing the first one, focus the second one
            browser.tabs.update(tabs[0].id, { successorTabId: tabs[1].id })
        }
    }

    supportsCookieStore(cookieStoreId) {}

    getBrowserTabs() {
        return Array.from(this.tabs.values()).map((tab) => tab.tab)
    }
}
