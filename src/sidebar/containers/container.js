class AbstractTabContainer {
    constructor(element) {
        this.element = element
        this.tabs = new Map()
    }

    init() {
        browser.tabs.onActivated.addListener((activeInfo) => {
            if(activeInfo.windowId !== ContainerTabsSidebar.WINDOW_ID) return
            if(!this.tabs.has(activeInfo.tabId)) return

            this._handleTabActivated(activeInfo)
        })

        browser.tabs.onCreated.addListener((newTab) => {
            if(newTab.windowId !== ContainerTabsSidebar.WINDOW_ID) return

            this._handleTabCreated(newTab)
        })

        browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
            if(removeInfo.isWindowClosing) return
            if(removeInfo.windowId !== ContainerTabsSidebar.WINDOW_ID) return
            if(!this.tabs.has(tabId)) return
            this.removeTab(tabId)
        })

        browser.tabs.onMoved.addListener((tabId) => {
            if(!this.tabs.has(tabId)) return
            this.render(true)
        })

        browser.tabs.onAttached.addListener((tabId, attachInfo) => {
            if(attachInfo.newWindowId !== ContainerTabsSidebar.WINDOW_ID) {
                if(!this.tabs.has(tabId)) return
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
        this.tabs.get(activeInfo.tabId).activate()
    }

    _handleTabCreated(newTab) {
        this.render(true)
    }

    _handleTabPinned(tabId, change, tab) {}

    _handleDragOver(event, tabId, contextualId, pinned) {
    }

    removeTab(tabId) {
        if(!this.tabs.has(tabId)) return
        const tab = this.tabs.get(tabId)
        this.tabs.delete(tabId)
        tab.element.parentNode.removeChild(tab.element)
        this.render(false)
    }

    render(updateTabs) {}
    renderTabs(tabs) {}
}