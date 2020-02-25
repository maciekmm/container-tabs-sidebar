import ContainerTab from '../tab/tab.js'

export default class AbstractTabContainer {
    constructor(window, element, config) {
        this._config = config
        this.element = element
        this._window = window
        this.tabs = new Map()
        // this.lastActive = -1
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
            if('pinned' in change) { 
                this._handleTabPinned(tabId, change, tab)
            }
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
        // browser.tabs.moveInSuccession([activeInfo.tabId], this.lastActive)
        // this.lastActive = activeInfo.tabId
        this.tabs.forEach((tab, tabId) => {
            if (tabId == activeInfo.tabId) {
                tab.activate()
            } else if (tab.tab.active) {
                tab.deactivate()
            }
        })
        this.lastActive = activeInfo.tabId
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
        tab.destroy()
        this.tabs.delete(tabId)
        tab.element.parentNode.parentNode.removeChild(tab.element.parentNode)
        this.render(false)
    }

    render(updateTabs) {
        this.element.setAttribute('data-tabs-count', this.tabs.size)
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
            const parent = document.createElement('li')
            const tabElement = document.createElement('a')
            tabElement.classList.add('container-tab')
            tabElement.setAttribute('data-tab-id', firefoxTab.id)
            tabElement.setAttribute('data-ci-id', firefoxTab.cookieStoreId)

            const tab = new ContainerTab(this._window, this, firefoxTab, tabElement)
            this.tabs.set(tab.id, tab)
            tab.init()

            parent.appendChild(tabElement)
            tabContainer.appendChild(parent)
        }
        // when closing a tab, focus one above
        if (!!this._config['focus_tabs_in_order'] && tabs.length > 1) { 
            browser.tabs.moveInSuccession(tabs.map(tab=>tab.id).reverse())
            // if closing the first one, focus the second one
            browser.tabs.update(tabs[0].id, {successorTabId: tabs[1].id})
        }
    }
}