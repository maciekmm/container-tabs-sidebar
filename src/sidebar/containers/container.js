class AbstractTabContainer {
    constructor(element) {
        this.element = element
        this.tabs = new Map()
    }

    init() {
        browser.tabs.onActivated.addListener((activeInfo) => {
            if (activeInfo.windowId !== ContainerTabsSidebar.WINDOW_ID) return

            this._handleTabActivated(activeInfo)
        })

        browser.tabs.onCreated.addListener((newTab) => {
            if (newTab.windowId !== ContainerTabsSidebar.WINDOW_ID) return

            this._handleTabCreated(newTab)
        })

        browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
            if (removeInfo.isWindowClosing) return
            if (removeInfo.windowId !== ContainerTabsSidebar.WINDOW_ID) return
            if (!this.tabs.has(tabId)) return
            this.removeTab(tabId)
        })

        browser.tabs.onMoved.addListener((tabId) => {
            if (!this.tabs.has(tabId)) return
            this.render(true)
        })

        browser.tabs.onAttached.addListener((tabId, attachInfo) => {
            if (attachInfo.newWindowId !== ContainerTabsSidebar.WINDOW_ID) {
                if (!this.tabs.has(tabId)) return
                this.removeTab(tabId)
            } else {
                this.render(true)
            }
        })

        browser.tabs.onUpdated.addListener((tabId, change, tab) => {
            this._handleTabPinned(tabId, change, tab)
        }, {
            properties: ["pinned"]
        })

        // Dragging
        this.element.addEventListener('dragleave', (e) => {
            if (!e.currentTarget || !e.currentTarget.classList) return
            e.currentTarget.classList.remove('container-dragged-over')
        })

        this.element.addEventListener('dragend', (e) => {
            if (!e.currentTarget || !e.currentTarget.classList) return
            e.currentTarget.classList.remove('container-dragged-over')
        })

        this.render(true)
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
        browser.tabs.remove(Array.from(this.tabs.keys()).filter(key => key != tabId))
    }

    /**
     * Removes a tab from DOM, does not remove it from a browser
     * @param {integer} tabId 
     */
    removeTab(tabId) {
        if (!this.tabs.has(tabId)) return
        const tab = this.tabs.get(tabId)
        this.tabs.delete(tabId)
        tab.element.parentNode.parentNode.removeChild(tab.element.parentNode)
        this.render(false)
    }

    render(updateTabs) {}

    renderTabs(tabContainer, tabs) {
        // clear children
        while (tabContainer.lastChild) {
            tabContainer.removeChild(tabContainer.lastChild)
        }
        this.tabs.clear()

        for (let firefoxTab of tabs) {
            const parent = document.createElement('li')
            const tabElement = document.createElement('a')
            tabElement.classList.add('container-tab')
            tabElement.setAttribute('data-tab-id', firefoxTab.id)
            tabElement.setAttribute('data-ci-id', firefoxTab.cookieStoreId)

            const tab = new ContainerTab(firefoxTab, tabElement)
            this.tabs.set(tab.id, tab)
            tab.init()

            parent.appendChild(tabElement)
            tabContainer.appendChild(parent)
        }
    }
}